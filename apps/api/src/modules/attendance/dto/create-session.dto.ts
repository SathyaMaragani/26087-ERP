import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceSessionDto {
  @ApiProperty({ example: 'allocation-uuid-1' })
  @IsString()
  @IsNotEmpty()
  courseAllocationId!: string;

  @ApiProperty({ example: '2026-09-29' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '09:00 - 10:00' })
  @IsString()
  @IsNotEmpty()
  slot!: string;

  @ApiPropertyOptional({ example: 'LECTURE' })
  @IsOptional()
  @IsString()
  type?: string;
}
