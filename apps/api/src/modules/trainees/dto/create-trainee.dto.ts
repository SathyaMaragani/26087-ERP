import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TraineeType } from '@erplms/types';

export class CreateTraineeDto {
  @ApiProperty({ description: 'User ID associated with this profile' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'TRN-2026-001' })
  @IsString()
  @IsNotEmpty()
  traineeCode: string;

  @ApiPropertyOptional({ enum: TraineeType, default: TraineeType.RURAL_YOUTH })
  @IsEnum(TraineeType)
  @IsOptional()
  traineeType?: TraineeType;

  @ApiPropertyOptional({ example: 'Telangana State Apex Cooperative Bank' })
  @IsString()
  @IsOptional()
  cooperativeName?: string;

  @ApiPropertyOptional({ example: 'Gollapally PACS' })
  @IsString()
  @IsOptional()
  pacsName?: string;

  @ApiPropertyOptional({ example: 'Telangana' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'Warangal' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Gollapally' })
  @IsString()
  @IsOptional()
  village?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: '2001-05-15T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Undergraduate (B.Com)' })
  @IsString()
  @IsOptional()
  educationLevel?: string;

  @ApiPropertyOptional({ example: 'PACS Assistant / Farmer' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ example: 180000 })
  @IsNumber()
  @IsOptional()
  annualIncome?: number;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'XXXX-XXXX-8921' })
  @IsString()
  @IsOptional()
  aadhaarMasked?: string;
}
