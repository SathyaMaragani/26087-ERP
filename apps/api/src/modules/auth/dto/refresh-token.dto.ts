import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'rt_5f3b7c89a012...' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
