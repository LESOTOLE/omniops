import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.warehouse.findMany({
      include: {
        _count: {
          select: {
            inventories: true,
            users: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        inventories: {
          include: {
            product: true,
          },
        },
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${id}" not found`);
    }

    return warehouse;
  }

  async create(dto: CreateWarehouseDto, performedBy: string) {
    const existing = await this.prisma.warehouse.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Warehouse with code "${dto.code}" already exists`);
    }

    const warehouse = await this.prisma.warehouse.create({
      data: dto,
    });

    await this.auditService.log({
      action: 'CREATE_WAREHOUSE',
      entity: 'Warehouse',
      entityId: warehouse.id,
      performedBy,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto, performedBy: string) {
    const existing = await this.findOne(id);

    if (dto.code && dto.code !== existing.code) {
      const codeTaken = await this.prisma.warehouse.findUnique({
        where: { code: dto.code },
      });
      if (codeTaken) {
        throw new ConflictException(`Warehouse with code "${dto.code}" already exists`);
      }
    }

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      action: 'UPDATE_WAREHOUSE',
      entity: 'Warehouse',
      entityId: id,
      performedBy,
      oldValue: { name: existing.name, code: existing.code },
      newValue: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async remove(id: string, performedBy: string) {
    const existing = await this.findOne(id);

    await this.prisma.warehouse.delete({
      where: { id },
    });

    await this.auditService.log({
      action: 'DELETE_WAREHOUSE',
      entity: 'Warehouse',
      entityId: id,
      performedBy,
      oldValue: { name: existing.name, code: existing.code },
    });

    return { id, message: 'Warehouse successfully deleted' };
  }
}
