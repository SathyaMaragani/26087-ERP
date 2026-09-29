import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTrainerDto {
  @ApiProperty({ description: 'User ID associated with trainer' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'TR-RICM-001' })
  @IsString()
  @IsNotEmpty()
  trainerCode: string;

  @ApiProperty({ example: 'Senior Training Officer' })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiProperty({ example: 'Cooperative Banking & Digital Financial Systems' })
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @ApiPropertyOptional({ example: 'M.Com, HDCM (VAMNICOM)' })
  @IsString()
  @IsOptional()
  qualifications?: string;

  @ApiPropertyOptional({ example: 12, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'Expert in PACS computerization and credit society management.' })
  @IsString()
  @IsOptional()
  bio?: string;
}
