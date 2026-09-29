import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NominationType, RegistrationStatus } from '@erplms/types';

export class RegisterProgrammeDto {
  @ApiProperty({ description: 'Training Programme ID' })
  @IsString()
  @IsNotEmpty()
  programmeId: string;

  @ApiPropertyOptional({ enum: NominationType, default: NominationType.SELF })
  @IsEnum(NominationType)
  @IsOptional()
  nominationType?: NominationType;

  @ApiPropertyOptional({ example: 'Primary Agricultural Credit Society (PACS), Nalgonda' })
  @IsString()
  @IsOptional()
  nominatingOrgName?: string;

  @ApiPropertyOptional({ example: 'Shri R. V. Patel, Secretary' })
  @IsString()
  @IsOptional()
  nominatingOfficer?: string;

  @ApiPropertyOptional({ example: 'Applicant meets all eligibility criteria and recommended for batch A' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateNominationStatusDto {
  @ApiProperty({ enum: RegistrationStatus, example: RegistrationStatus.APPROVED })
  @IsEnum(RegistrationStatus)
  @IsNotEmpty()
  status: RegistrationStatus;

  @ApiPropertyOptional({ description: 'Optional assigned batch ID upon approval/enrollment' })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiPropertyOptional({ example: 'Application approved after verifying cooperative membership certificate.' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
