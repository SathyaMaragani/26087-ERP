import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Sathya' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Narayanan' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'section-uuid-b' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ example: '2005-04-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '123 Campus Road, Hyderabad' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'R. Narayanan' })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional({ example: 'guardian@example.com' })
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;
}
