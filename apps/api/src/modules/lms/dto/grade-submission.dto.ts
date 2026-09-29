import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({ example: 95 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  marksObtained!: number;

  @ApiPropertyOptional({ example: 'Excellent handling of edge cases in double rotations.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
