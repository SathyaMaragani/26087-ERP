import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFacultyDto {
  @ApiProperty({ example: 'prof.smith@klh.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'EMP1042' })
  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @ApiProperty({ example: 'dept-uuid-cse' })
  @IsString()
  @IsNotEmpty()
  departmentId!: string;

  @ApiProperty({ example: 'Associate Professor' })
  @IsString()
  @IsNotEmpty()
  designation!: string;

  @ApiPropertyOptional({ example: 'Ph.D in Computer Science (Distributed Systems)' })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({ example: 'Distributed Systems, Cloud Architecture' })
  @IsOptional()
  @IsString()
  specialization?: string;
}
