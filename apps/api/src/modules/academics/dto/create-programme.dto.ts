import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgrammeDto {
  @ApiProperty({ example: 'dept-uuid-cse' })
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: 'B.Tech in Computer Science & Engineering' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CSE-BTECH' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'B.Tech' })
  @IsOptional()
  @IsString()
  degree?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationYears?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalSemesters?: number;
}
