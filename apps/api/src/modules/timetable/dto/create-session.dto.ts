import {
  IsNotEmpty,
  IsString,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTrainingSessionDto {
  @ApiProperty({ description: 'Programme Batch ID' })
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @ApiProperty({ description: 'Trainer Profile ID' })
  @IsString()
  @IsNotEmpty()
  trainerId: string;

  @ApiProperty({ example: 'Room 204 (Smart Classroom)' })
  @IsString()
  @IsNotEmpty()
  room: string;

  @ApiProperty({ example: '2026-10-06T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  sessionDate: string;

  @ApiProperty({ example: '09:00', description: 'HH:mm format' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm 24-hour format',
  })
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '11:00', description: 'HH:mm format' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm 24-hour format',
  })
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ example: 'PACS Digital Accounting & Ledger Integration' })
  @IsString()
  @IsNotEmpty()
  topic: string;
}
