import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AllocateCourseDto {
  @ApiProperty({ example: 'course-uuid-1' })
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ example: 'faculty-profile-uuid-1' })
  @IsString()
  @IsNotEmpty()
  facultyId!: string;

  @ApiProperty({ example: 'section-uuid-1' })
  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @ApiProperty({ example: 'semester-uuid-1' })
  @IsString()
  @IsNotEmpty()
  semesterId!: string;

  @ApiProperty({ example: 'academic-year-uuid-1' })
  @IsString()
  @IsNotEmpty()
  academicYearId!: string;
}
