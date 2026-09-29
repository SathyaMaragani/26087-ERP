import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkillCategoryDto {
  @ApiProperty({ example: 'Digital Literacy' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Core digital skills for cooperative society governance' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateSkillDto {
  @ApiProperty({ example: 'Digital Payments & UPI Integration' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SKILL-UPI-01' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'SkillCategory ID' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ example: 'Ability to configure QR codes, process UPI payments, and verify reconciliation' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AssignSkillDto {
  @ApiProperty({ description: 'Trainee Profile ID' })
  @IsString()
  @IsNotEmpty()
  traineeId: string;

  @ApiProperty({ description: 'Skill ID' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ example: 2, description: '1: Beginner, 2: Intermediate, 3: Advanced' })
  @IsInt()
  @Min(1)
  @Max(3)
  level: number;
}
