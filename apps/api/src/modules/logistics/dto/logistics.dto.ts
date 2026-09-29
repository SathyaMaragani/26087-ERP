import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LogisticsStatus } from '@erplms/types';

export class CreateLogisticsItemDto {
  @ApiPropertyOptional({ description: 'Optional associated Training Programme ID' })
  @IsString()
  @IsOptional()
  programmeId?: string;

  @ApiProperty({ example: 'TRAINING_KITS', description: 'MEALS, TRAINING_KITS, TRANSPORT, EQUIPMENT, STATIONERY, ACCOMMODATION' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Digital Banking Handbook & Stationary Kit' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 100, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 'National Cooperative Print Press' })
  @IsString()
  @IsOptional()
  vendorName?: string;

  @ApiPropertyOptional({ example: 45000 })
  @IsNumber()
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional({ enum: LogisticsStatus, default: LogisticsStatus.PENDING })
  @IsEnum(LogisticsStatus)
  @IsOptional()
  status?: LogisticsStatus;

  @ApiPropertyOptional({ example: 'Requires dispatch 2 days prior to programme commencement' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateLogisticsStatusDto {
  @ApiProperty({ enum: LogisticsStatus, example: LogisticsStatus.DELIVERED })
  @IsEnum(LogisticsStatus)
  @IsNotEmpty()
  status: LogisticsStatus;

  @ApiPropertyOptional({ example: 'Received at RICM stores by logistics officer' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
