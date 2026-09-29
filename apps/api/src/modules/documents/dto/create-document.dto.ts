import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ example: 'NCCT-Curriculum-Framework-2026.pdf' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 2450820, description: 'File size in bytes (max 25MB)' })
  @IsInt()
  @Min(1)
  sizeBytes: number;

  @ApiProperty({ example: 'documents/2026/09/curriculum-8f3a.pdf' })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiPropertyOptional({ example: 'SYLLABUS', default: 'GENERAL' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' })
  @IsString()
  @IsOptional()
  checksum?: string;
}
