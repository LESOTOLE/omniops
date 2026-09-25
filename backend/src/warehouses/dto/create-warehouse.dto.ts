import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-SUB-01', description: 'Unique warehouse code' })
  @IsString()
  @IsNotEmpty({ message: 'Warehouse code is required' })
  code: string;

  @ApiProperty({ example: 'Surabaya Regional Distribution Center' })
  @IsString()
  @IsNotEmpty({ message: 'Warehouse name is required' })
  name: string;

  @ApiProperty({ example: 'Jl. Rungkut Industri No. 10', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Surabaya', required: false })
  @IsString()
  @IsOptional()
  city?: string;
}
