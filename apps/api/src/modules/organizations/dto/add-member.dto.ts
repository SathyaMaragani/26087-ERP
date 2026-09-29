import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@erplms/types';

export class AddMemberDto {
  @ApiProperty({ example: 'faculty.john@klh.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: Role, example: Role.FACULTY })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: 'dept-uuid-123' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: ['course.create', 'grade.create'] })
  @IsOptional()
  customPermissions?: string[];
}
