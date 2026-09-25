import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Warehouses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  async findAll() {
    const data = await this.warehousesService.findAll();
    return {
      message: 'Warehouses retrieved successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get warehouse details by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.warehousesService.findOne(id);
    return {
      message: 'Warehouse retrieved successfully',
      data,
    };
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new warehouse (Super Admin only)' })
  async create(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.warehousesService.create(dto, user.email);
    return {
      message: 'Warehouse created successfully',
      data,
    };
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update warehouse info' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.warehousesService.update(id, dto, user.email);
    return {
      message: 'Warehouse updated successfully',
      data,
    };
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete warehouse (Super Admin only)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.warehousesService.remove(id, user.email);
    return {
      message: 'Warehouse deleted successfully',
      data,
    };
  }
}
