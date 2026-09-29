import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'sathya.narayanan@klh.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Sathya' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Narayanan' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '2024CSE001' })
  @IsString()
  @IsNotEmpty()
  enrollmentNumber!: string;

  @ApiProperty({ example: 'CS01' })
  @IsString()
  @IsNotEmpty()
  rollNumber!: string;

  @ApiProperty({ example: 'prog-uuid-cse' })
  @IsString()
  @IsNotEmpty()
  programmeId!: string;

  @ApiProperty({ example: 'batch-uuid-2024' })
  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @ApiPropertyOptional({ example: 'section-uuid-a' })
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
