import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(params?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page ? Number(params.page) : 1;
    const limit = params?.limit ? Number(params.limit) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (params?.search) {
      const search = params.search.trim();
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    if (params?.category) {
      where.category = params.category;
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          inventories: {
            include: {
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedProducts = products.map((p) => {
      const totalStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      return {
        ...p,
        totalStock,
      };
    });

    return {
      items: formattedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const totalStock = product.inventories.reduce((acc, inv) => acc + inv.quantity, 0);

    return {
      ...product,
      totalStock,
    };
  }

  async findByBarcodeOrSku(identifier: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ barcode: identifier }, { sku: identifier }],
      },
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found with barcode/SKU: ${identifier}`);
    }

    const totalStock = product.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      ...product,
      totalStock,
    };
  }

  async create(dto: CreateProductDto, performedBy: string) {
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });
    if (existingSku) {
      throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.product.findUnique({
        where: { barcode: dto.barcode },
      });
      if (existingBarcode) {
        throw new ConflictException(`Product with barcode "${dto.barcode}" already exists`);
      }
    }

    const product = await this.prisma.product.create({
      data: dto,
    });

    await this.auditService.log({
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: product.id,
      performedBy,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return product;
  }

  async update(id: string, dto: UpdateProductDto, performedBy: string) {
    const existing = await this.findOne(id);

    if (dto.sku && dto.sku !== existing.sku) {
      const skuTaken = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (skuTaken) {
        throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
      }
    }

    if (dto.barcode && dto.barcode !== existing.barcode) {
      const barcodeTaken = await this.prisma.product.findUnique({
        where: { barcode: dto.barcode },
      });
      if (barcodeTaken) {
        throw new ConflictException(`Product with barcode "${dto.barcode}" already exists`);
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: id,
      performedBy,
      oldValue: {
        name: existing.name,
        buyPrice: Number(existing.buyPrice),
        sellPrice: Number(existing.sellPrice),
      },
      newValue: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async remove(id: string, performedBy: string) {
    const existing = await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    await this.auditService.log({
      action: 'DELETE_PRODUCT',
      entity: 'Product',
      entityId: id,
      performedBy,
      oldValue: { name: existing.name, sku: existing.sku },
    });

    return { id, message: 'Product successfully deleted' };
  }
}
