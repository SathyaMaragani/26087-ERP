import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBatchDto {
  @ApiProperty({ example: 'prog-uuid-cse' })
  @IsString()
  @IsNotEmpty()
  programmeId!: string;

  @ApiProperty({ example: 'ay-uuid-2026' })
  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @ApiProperty({ example: '2024-2028 Cohort' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 2024 })
  @IsInt()
  @Min(2000)
  cohortYear!: number;
}
