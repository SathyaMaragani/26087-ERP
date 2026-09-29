import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchTenantDto {
  @ApiProperty({ example: 'org-uuid-123' })
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}
