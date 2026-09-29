import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty({ example: 'batch-uuid-2024' })
  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @ApiPropertyOptional({ example: 'sem-uuid-3' })
  @IsOptional()
  @IsString()
  semesterId?: string;

  @ApiProperty({ example: 'Section A' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
