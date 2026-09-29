import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CareerChatDto {
  @ApiProperty({
    example: 'What jobs can I apply for with my current digital literacy certification?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Optional Trainee Profile ID' })
  @IsString()
  @IsOptional()
  traineeId?: string;
}
