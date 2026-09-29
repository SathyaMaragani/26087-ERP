import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Digital Literacy Certificate Issued' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Congratulations! Your NCCT certificate for Digital Cooperative Management is now available.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'SUCCESS', default: 'INFO' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: '/certifications' })
  @IsString()
  @IsOptional()
  link?: string;
}
