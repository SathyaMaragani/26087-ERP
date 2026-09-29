import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus, AttendanceMethod } from '@erplms/types';

export class StudentAttendanceItemDto {
  @ApiProperty({ example: 'student-profile-uuid-1' })
  @IsString()
  @IsNotEmpty()
  studentProfileId!: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiPropertyOptional({ enum: AttendanceMethod, example: AttendanceMethod.MANUAL })
  @IsOptional()
  @IsEnum(AttendanceMethod)
  verifiedByMethod?: AttendanceMethod;

  @ApiPropertyOptional({ example: 'Arrived 10 minutes late' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ type: [StudentAttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceItemDto)
  records!: StudentAttendanceItemDto[];
}
