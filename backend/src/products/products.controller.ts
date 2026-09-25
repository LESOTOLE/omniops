import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products with search, category filter, and pagination' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by SKU, name, or barcode' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.productsService.findAll({ search, category, page, limit });
    return {
      message: 'Products retrieved successfully',
      data,
    };
  }

  @Get('lookup/:identifier')
  @ApiOperation({ summary: 'Instant product lookup by barcode or SKU for POS terminal' })
  async findByBarcode(@Param('identifier') identifier: string) {
    const data = await this.productsService.findByBarcodeOrSku(identifier);
    return {
      message: 'Product found',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single product details with inventory breakdown' })
  async findOne(@Param('id') id: string) {
    const data = await this.productsService.findOne(id);
    return {
      message: 'Product retrieved successfully',
      data,
    };
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Create new product' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.productsService.create(dto, user.email);
    return {
      message: 'Product created successfully',
      data,
    };
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update product details' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.productsService.update(id, dto, user.email);
    return {
      message: 'Product updated successfully',
      data,
    };
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete product (Super Admin only)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.productsService.remove(id, user.email);
    return {
      message: 'Product deleted successfully',
      data,
    };
  }
}
