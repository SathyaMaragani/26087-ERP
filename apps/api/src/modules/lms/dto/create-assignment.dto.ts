import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiPropertyOptional({ example: 'lesson-uuid-1' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiProperty({ example: 'Assignment 1: Implement an AVL Self-Balancing Tree' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Write a self-balancing AVL tree in TypeScript with insert, delete, and balance operations.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ example: '2026-10-15T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMarks?: number;

  @ApiPropertyOptional({ example: [{ criteria: 'Rotations', marks: 40 }, { criteria: 'Testing', marks: 60 }] })
  @IsOptional()
  rubric?: any;
}
