import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Computer Science and Engineering' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CSE' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'Department of Computer Science and Engineering' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'user-uuid-hod' })
  @IsOptional()
  @IsString()
  headUserId?: string;
}
