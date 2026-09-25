import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class StockTransferItemDto {
  @ApiProperty({ description: 'Product ID to transfer' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 5, description: 'Quantity to transfer' })
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'Quantity must be greater than zero' })
  quantity: number;
}

export class CreateStockTransferDto {
  @ApiProperty({ description: 'Source warehouse ID' })
  @IsString()
  @IsNotEmpty()
  fromWarehouseId: string;

  @ApiProperty({ description: 'Destination warehouse ID' })
  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @ApiProperty({ example: 'Replenishment for weekend sales spike', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [StockTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Must include at least 1 transfer item' })
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items: StockTransferItemDto[];
}
