import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IssueCertificateDto {
  @ApiProperty({ description: 'Trainee Profile ID' })
  @IsString()
  @IsNotEmpty()
  traineeId: string;

  @ApiPropertyOptional({ description: 'Optional Training Programme ID' })
  @IsString()
  @IsOptional()
  programmeId?: string;

  @ApiProperty({ example: 'NCCT National Certificate in Digital Cooperative Management' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: ['Digital Payments', 'PACS Accounting', 'Member Governance'] })
  @IsArray()
  @IsOptional()
  skillsAcquired?: string[];

  @ApiPropertyOptional({ example: 'Distinction (A+)' })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiPropertyOptional({ example: 'https://storage.erplms.platform/certs/NCCT-2026-8F32A.pdf' })
  @IsString()
  @IsOptional()
  pdfUrl?: string;

  @ApiPropertyOptional({ example: { issuedByOfficer: 'Regional Director, RICM' } })
  @IsOptional()
  metadata?: any;
}
