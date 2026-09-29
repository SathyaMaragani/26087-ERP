import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonTranslationDto {
  @ApiProperty({ example: 'hi', description: 'ISO 639-1 language code: en, hi, te, ta, kn, mr' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ example: 'डिजिटल भुगतान और बैंक समाधान' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Localized structured JSON content blocks' })
  @IsArray()
  @IsOptional()
  contentBlocks?: any[];

  @ApiPropertyOptional({ example: 'https://audio.erplms.platform/lessons/101-hi.mp3' })
  @IsString()
  @IsOptional()
  audioUrl?: string;

  @ApiPropertyOptional({ example: 'https://video.erplms.platform/lessons/101-hi.mp4' })
  @IsString()
  @IsOptional()
  videoUrl?: string;
}

export class OfflineSyncItemDto {
  @ApiProperty({ description: 'Lesson ID completed offline' })
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @ApiPropertyOptional({ example: 450, description: 'Seconds spent on lesson offline' })
  @IsOptional()
  timeSpentSeconds?: number;

  @ApiPropertyOptional({ example: '2026-10-06T11:30:00.000Z' })
  @IsOptional()
  completedAt?: string;
}

export class OfflineSyncDto {
  @ApiProperty({ type: [OfflineSyncItemDto] })
  @IsArray()
  items: OfflineSyncItemDto[];
}
