import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@klh.edu' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
