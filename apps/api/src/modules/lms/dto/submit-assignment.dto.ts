import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAssignmentDto {
  @ApiPropertyOptional({ example: 'https://github.com/student/avl-tree-solution' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty({ example: 'Here is my implementation of the AVL Tree with full test suites.' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
