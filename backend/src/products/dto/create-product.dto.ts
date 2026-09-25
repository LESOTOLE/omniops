import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-LOGI-MX3S', description: 'Unique Stock Keeping Unit' })
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  sku: string;

  @ApiProperty({ example: '899123400001', required: false, description: 'Barcode for POS scanner' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 'Logitech MX Master 3S Wireless Mouse' })
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name: string;

  @ApiProperty({ example: 'High precision wireless mouse', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @ApiProperty({ example: 'pcs', default: 'pcs' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 1250000, description: 'Cost/purchase price' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Buy price cannot be negative' })
  buyPrice: number;

  @ApiProperty({ example: 1699000, description: 'Selling price' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'Sell price must be greater than zero' })
  sellPrice: number;
}
