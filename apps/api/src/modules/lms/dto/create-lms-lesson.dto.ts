import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLmsLessonDto {
  @ApiProperty({ example: 'Lesson 1.1: Binary Search Tree Insertion and Traversal' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ example: 'BLOCKS' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({
    example: [
      {
        id: 'block-1',
        type: 'TEXT',
        content: 'A Binary Search Tree is a node-based binary tree data structure...',
      },
      {
        id: 'block-2',
        type: 'CODE',
        language: 'typescript',
        content: 'class BSTNode { val: number; left: BSTNode | null; right: BSTNode | null; }',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  contentBlocks?: any[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
