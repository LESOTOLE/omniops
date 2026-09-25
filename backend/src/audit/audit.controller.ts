import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Audit Trail')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Get system audit trail logs (MongoDB / Audit engine)' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filter by entity type (Product, Warehouse, Inventory, Order)' })
  @ApiQuery({ name: 'performedBy', required: false, description: 'Filter by user email' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAuditLogs(
    @Query('entity') entity?: string,
    @Query('performedBy') performedBy?: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.auditService.findAll({ entity, performedBy, limit });
    return {
      message: 'Audit logs retrieved successfully',
      data: logs,
    };
  }
}
