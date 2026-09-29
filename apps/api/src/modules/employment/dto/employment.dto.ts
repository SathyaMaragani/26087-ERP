import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployerDto {
  @ApiProperty({ example: 'Telangana Cooperative Marketing Federation Ltd.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'Agri-Business & Cooperative Trading' })
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiProperty({ example: 'Sri K. Venkat Rao' })
  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @ApiProperty({ example: 'careers@markfed.telangana.gov.in' })
  @IsString()
  @IsNotEmpty()
  contactEmail: string;

  @ApiPropertyOptional({ example: '+914023456789' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://markfed.telangana.gov.in' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'Jambagh, Hyderabad' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Telangana' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'Hyderabad' })
  @IsString()
  @IsOptional()
  district?: string;
}

export class CreateJobPostingDto {
  @ApiProperty({ description: 'Employer Profile ID' })
  @IsString()
  @IsNotEmpty()
  employerId: string;

  @ApiProperty({ example: 'Field Digital Assistant / PACS Coordinator' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Responsible for training PACS personnel on digital banking reconciliation, POS machine usage, and DBT.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: ['Digital Payments & UPI Integration', 'PACS Accounting', 'Member Governance'],
    description: 'List of required skill names',
  })
  @IsArray()
  @IsNotEmpty()
  requiredSkills: string[];

  @ApiProperty({ example: 'Warangal & Nizamabad' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: 8, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  vacancies?: number;

  @ApiPropertyOptional({ example: '₹2,40,000 - ₹3,00,000 p.a.' })
  @IsString()
  @IsOptional()
  salaryRange?: string;

  @ApiPropertyOptional({ example: '2026-11-30T17:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  deadline?: string;
}

export class ApplyJobDto {
  @ApiProperty({ description: 'Job Posting ID' })
  @IsString()
  @IsNotEmpty()
  jobPostingId: string;

  @ApiProperty({ description: 'Trainee Profile ID' })
  @IsString()
  @IsNotEmpty()
  traineeId: string;
}

export class RecordOutcomeDto {
  @ApiProperty({ description: 'Trainee Profile ID' })
  @IsString()
  @IsNotEmpty()
  traineeId: string;

  @ApiProperty({ example: 'Telangana Cooperative Marketing Federation' })
  @IsString()
  @IsNotEmpty()
  employerName: string;

  @ApiProperty({ example: 'Field Digital Assistant' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({ example: '2026-10-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  placementDate: string;

  @ApiPropertyOptional({ example: 280000 })
  @IsNumber()
  @IsOptional()
  annualPackage?: number;
}
