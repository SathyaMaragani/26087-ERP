import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureDto {
  @ApiProperty({ example: 'attendance' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ example: { geofencing: true, qr: true } })
  @IsOptional()
  config?: any;
}
