import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(warehouseId?: string, productId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    return this.prisma.inventory.findMany({
      where,
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getLowStockAlerts(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const inventories = await this.prisma.inventory.findMany({
      where,
      include: {
        warehouse: true,
        product: true,
      },
    });

    return inventories.filter((inv) => inv.quantity <= inv.minStock);
  }

  async adjustStock(dto: AdjustStockDto, performedBy: string) {
    const { warehouseId, productId, newQuantity, reason } = dto;

    if (newQuantity < 0) {
      throw new BadRequestException('Stock quantity cannot be negative');
    }

    const currentInventory = await this.prisma.inventory.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    const previousQty = currentInventory ? currentInventory.quantity : 0;

    const updated = await this.prisma.inventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
      update: {
        quantity: newQuantity,
      },
      create: {
        warehouseId,
        productId,
        quantity: newQuantity,
      },
      include: {
        warehouse: true,
        product: true,
      },
    });

    await this.auditService.log({
      action: 'STOCK_ADJUSTMENT',
      entity: 'Inventory',
      entityId: updated.id,
      performedBy,
      oldValue: {
        warehouse: updated.warehouse.name,
        product: updated.product.name,
        quantity: previousQty,
      },
      newValue: {
        warehouse: updated.warehouse.name,
        product: updated.product.name,
        quantity: newQuantity,
        difference: newQuantity - previousQty,
        reason: reason || 'Manual adjustment',
      },
    });

    return updated;
  }

  async createTransfer(dto: CreateStockTransferDto, createdById: string, userEmail: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouse cannot be the same');
    }

    // Verify stock availability in source warehouse
    for (const item of dto.items) {
      const inv = await this.prisma.inventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: dto.fromWarehouseId,
            productId: item.productId,
          },
        },
      });

      if (!inv || inv.quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock in source warehouse for product ID: ${item.productId}. Available: ${inv?.quantity ?? 0}, Requested: ${item.quantity}`,
        );
      }
    }

    const count = await this.prisma.stockTransfer.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transferNumber = `TRF-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        notes: dto.notes,
        createdById,
        status: TransferStatus.PENDING,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'CREATE_STOCK_TRANSFER',
      entity: 'StockTransfer',
      entityId: transfer.id,
      performedBy: userEmail,
      newValue: {
        transferNumber: transfer.transferNumber,
        fromWarehouse: transfer.fromWarehouse.name,
        toWarehouse: transfer.toWarehouse.name,
        itemCount: dto.items.length,
      },
    });

    return transfer;
  }

  async listTransfers() {
    return this.prisma.stockTransfer.findMany({
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTransferStatus(
    id: string,
    status: TransferStatus,
    approvedById: string,
    userEmail: string,
  ) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: true,
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock transfer "${id}" not found`);
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new BadRequestException('Transfer has already been completed and stocks moved');
    }

    if (transfer.status === TransferStatus.REJECTED) {
      throw new BadRequestException('Transfer has already been rejected');
    }

    // If completing the transfer, execute ACID $transaction to move inventory
    if (status === TransferStatus.COMPLETED) {
      const result = await this.prisma.$transaction(async (tx) => {
        for (const item of transfer.items) {
          const sourceInv = await tx.inventory.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: transfer.fromWarehouseId,
                productId: item.productId,
              },
            },
          });

          if (!sourceInv || sourceInv.quantity < item.quantity) {
            throw new BadRequestException(
              `Cannot complete transfer: Insufficient stock for product ${item.productId} in ${transfer.fromWarehouse.name}`,
            );
          }

          // Deduct from source warehouse
          await tx.inventory.update({
            where: {
              warehouseId_productId: {
                warehouseId: transfer.fromWarehouseId,
                productId: item.productId,
              },
            },
            data: {
              quantity: sourceInv.quantity - item.quantity,
            },
          });

          // Add to destination warehouse
          await tx.inventory.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: transfer.toWarehouseId,
                productId: item.productId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              warehouseId: transfer.toWarehouseId,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        }

        // Update transfer status
        return tx.stockTransfer.update({
          where: { id },
          data: {
            status: TransferStatus.COMPLETED,
            approvedById,
          },
          include: {
            fromWarehouse: true,
            toWarehouse: true,
            items: {
              include: { product: true },
            },
          },
        });
      });

      await this.auditService.log({
        action: 'COMPLETE_STOCK_TRANSFER',
        entity: 'StockTransfer',
        entityId: id,
        performedBy: userEmail,
        oldValue: { status: transfer.status },
        newValue: { status: TransferStatus.COMPLETED },
      });

      return result;
    }

    // Other status updates (APPROVED or REJECTED)
    const updated = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status,
        approvedById,
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: { product: true },
        },
      },
    });

    await this.auditService.log({
      action: `TRANSFER_${status}`,
      entity: 'StockTransfer',
      entityId: id,
      performedBy: userEmail,
      oldValue: { status: transfer.status },
      newValue: { status },
    });

    return updated;
  }
}
