import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { UpdateTransferStatusDto } from './dto/update-transfer-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Inventory & Transfers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory stock levels per warehouse' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  async findAll(
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ) {
    const data = await this.inventoryService.findAll(warehouseId, productId);
    return {
      message: 'Inventory records retrieved successfully',
      data,
    };
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock alerts (<= minStock)' })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getLowStock(@Query('warehouseId') warehouseId?: string) {
    const data = await this.inventoryService.getLowStockAlerts(warehouseId);
    return {
      message: 'Low stock alerts retrieved',
      data,
    };
  }

  @Post('adjust')
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Manual stock adjustment (stock opname/correction)' })
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.inventoryService.adjustStock(dto, user.email);
    return {
      message: 'Stock adjusted successfully',
      data,
    };
  }

  @Post('transfers')
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Initiate inter-warehouse stock transfer' })
  async createTransfer(
    @Body() dto: CreateStockTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.inventoryService.createTransfer(dto, user.id, user.email);
    return {
      message: 'Stock transfer initiated successfully',
      data,
    };
  }

  @Get('transfers')
  @ApiOperation({ summary: 'List all stock transfer requests' })
  async listTransfers() {
    const data = await this.inventoryService.listTransfers();
    return {
      message: 'Stock transfers retrieved successfully',
      data,
    };
  }

  @Patch('transfers/:id/status')
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Approve, reject, or complete stock transfer' })
  async updateTransferStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTransferStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.inventoryService.updateTransferStatus(
      id,
      dto.status,
      user.id,
      user.email,
    );
    return {
      message: `Stock transfer status updated to ${dto.status}`,
      data,
    };
  }
}
