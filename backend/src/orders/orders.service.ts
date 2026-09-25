import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateOrderDto, cashierId: string, cashierEmail: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${dto.warehouseId}" not found`);
    }

    // 1. Calculate subtotal and verify stock availability
    let calculatedSubtotal = 0;
    const itemDetails: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      productName: string;
    }> = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID "${item.productId}" not found`);
      }

      const inv = await this.prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: dto.warehouseId,
            productId: item.productId,
          },
        },
      });

      if (!inv || inv.quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}" in ${warehouse.name}. Available: ${inv?.quantity ?? 0}, Requested: ${item.quantity}`,
        );
      }

      const itemSubtotal = item.quantity * Number(item.unitPrice);
      calculatedSubtotal += itemSubtotal;
      itemDetails.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: itemSubtotal,
        productName: product.name,
      });
    }

    const discountAmount = Number(dto.discountAmount || 0);
    const taxAmount = Number(dto.taxAmount || 0);
    const totalAmount = Math.max(0, calculatedSubtotal - discountAmount + taxAmount);
    const amountPaid = Number(dto.amountPaid);

    if (amountPaid < totalAmount) {
      throw new BadRequestException(
        `Insufficient payment amount. Total is Rp ${totalAmount.toLocaleString()}, but received Rp ${amountPaid.toLocaleString()}`,
      );
    }

    const changeAmount = amountPaid - totalAmount;

    // 2. Generate unique POS receipt order number
    const count = await this.prisma.order.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORD-${dateStr}-${(count + 1).toString().padStart(5, '0')}`;

    // 3. Atomically execute order creation & stock reduction in a Prisma transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Deduct stock for each item
      for (const item of itemDetails) {
        await tx.inventory.update({
          where: {
            warehouseId_productId: {
              warehouseId: dto.warehouseId,
              productId: item.productId,
            },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Create Order header and items
      return tx.order.create({
        data: {
          orderNumber,
          cashierId,
          warehouseId: dto.warehouseId,
          subtotal: new Prisma.Decimal(calculatedSubtotal),
          discountAmount: new Prisma.Decimal(discountAmount),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          paymentMethod: dto.paymentMethod,
          amountPaid: new Prisma.Decimal(amountPaid),
          changeAmount: new Prisma.Decimal(changeAmount),
          customerName: dto.customerName || 'Walk-in Customer',
          items: {
            create: itemDetails.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: new Prisma.Decimal(i.unitPrice),
              subtotal: new Prisma.Decimal(i.subtotal),
            })),
          },
        },
        include: {
          cashier: {
            select: { id: true, fullName: true, email: true },
          },
          warehouse: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    // 4. Asynchronous Audit Logging
    await this.auditService.log({
      action: 'POS_CHECKOUT',
      entity: 'Order',
      entityId: order.id,
      performedBy: cashierEmail,
      newValue: {
        orderNumber: order.orderNumber,
        warehouse: warehouse.name,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        itemCount: itemDetails.length,
      },
    });

    return order;
  }

  async findAll(params?: {
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page ? Number(params.page) : 1;
    const limit = params?.limit ? Number(params.limit) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (params?.warehouseId) {
      where.warehouseId = params.warehouseId;
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          cashier: {
            select: { id: true, fullName: true, email: true },
          },
          warehouse: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }
}
