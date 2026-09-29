import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgrammeMode, ProgrammeStatus } from '@erplms/types';

export class CreateProgrammeDto {
  @ApiProperty({ example: 'PRG-DL-2026-01' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Digital Literacy for PACS Members' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Comprehensive training on digital financial tools, PACS software, and mobile governance.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Digital Literacy' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'PACS Members, Rural Youth, SHG Leaders' })
  @IsString()
  @IsOptional()
  targetAudience?: string;

  @ApiPropertyOptional({ enum: ProgrammeMode, default: ProgrammeMode.OFFLINE })
  @IsEnum(ProgrammeMode)
  @IsOptional()
  mode?: ProgrammeMode;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ApiProperty({ example: '2026-10-05T09:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-10-10T17:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ example: 'RICM Hyderabad Campus' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'Basic numeracy and member of affiliated cooperative' })
  @IsString()
  @IsOptional()
  eligibilityCriteria?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  hostelRequired?: boolean;

  @ApiPropertyOptional({ enum: ProgrammeStatus, default: ProgrammeStatus.UPCOMING })
  @IsEnum(ProgrammeStatus)
  @IsOptional()
  status?: ProgrammeStatus;
}

export class CreateBatchDto {
  @ApiProperty({ example: 'BATCH-A' })
  @IsString()
  @IsNotEmpty()
  batchCode: string;

  @ApiProperty({ example: 'Morning Batch A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Assigned Trainer Profile ID' })
  @IsString()
  @IsOptional()
  trainerId?: string;

  @ApiProperty({ example: '2026-10-05T09:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-10-10T17:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
