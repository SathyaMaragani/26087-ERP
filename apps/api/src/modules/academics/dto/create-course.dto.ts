import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseType } from '@erplms/types';

export class CreateCourseDto {
  @ApiProperty({ example: 'dept-uuid-cse' })
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: 'CS201' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Data Structures & Algorithms' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number;

  @ApiPropertyOptional({ enum: CourseType, example: CourseType.CORE })
  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @ApiPropertyOptional({ example: 'Fundamental algorithmic techniques and data abstractions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/syllabus/cs201.pdf' })
  @IsOptional()
  @IsString()
  syllabusUrl?: string;
}
