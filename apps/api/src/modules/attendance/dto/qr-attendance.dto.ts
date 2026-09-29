import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class QrScanDto {
  @ApiProperty({ description: 'Rotating cryptographic token from dynamic QR code' })
  @IsString()
  @IsNotEmpty()
  qrToken: string;

  @ApiPropertyOptional({ description: 'Student profile ID if attending college session' })
  @IsString()
  @IsOptional()
  studentProfileId?: string;

  @ApiPropertyOptional({ description: 'Trainee profile ID if attending NCCT training programme' })
  @IsString()
  @IsOptional()
  traineeProfileId?: string;
}

export class FaceVerifyDto {
  @ApiPropertyOptional({ description: 'Student profile ID' })
  @IsString()
  @IsOptional()
  studentProfileId?: string;

  @ApiPropertyOptional({ description: 'Trainee profile ID' })
  @IsString()
  @IsOptional()
  traineeProfileId?: string;

  @ApiProperty({
    description: 'Explicit biometric processing consent flag (mandatory for GDPR / DPDP Act compliance)',
  })
  @IsBoolean()
  consentGranted: boolean;

  @ApiPropertyOptional({ description: 'Facial descriptor / embedding vector string for matching' })
  @IsString()
  @IsOptional()
  faceEmbedding?: string;

  @ApiPropertyOptional({ description: 'Confidence score (0 - 100) from client-side liveness detection', default: 98.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  livenessConfidence?: number;
}
