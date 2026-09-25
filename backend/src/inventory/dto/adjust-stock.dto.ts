import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ description: 'Target warehouse ID' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ description: 'Target product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10, description: 'New stock quantity after manual correction' })
  @IsInt()
  newQuantity: number;

  @ApiProperty({ example: 'Physical stock opname discrepancy found', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
