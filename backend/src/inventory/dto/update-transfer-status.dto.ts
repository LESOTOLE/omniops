import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TransferStatus } from '@prisma/client';

export class UpdateTransferStatusDto {
  @ApiProperty({ enum: TransferStatus, example: TransferStatus.COMPLETED })
  @IsEnum(TransferStatus)
  @IsNotEmpty()
  status: TransferStatus;
}
