import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHostelDto {
  @ApiProperty({ example: 'Sardar Patel Trainee Hostel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Hostel Block B' })
  @IsString()
  @IsNotEmpty()
  building: string;

  @ApiPropertyOptional({ example: 'ALL', default: 'ALL' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 40, default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalRooms?: number;
}

export class CreateHostelRoomDto {
  @ApiProperty({ example: '101' })
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  floor: number;

  @ApiProperty({ example: 2, default: 2 })
  @IsInt()
  @Min(1)
  bedCapacity: number;
}

export class AllocateBedDto {
  @ApiProperty({ description: 'Hostel Room ID' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ description: 'Trainee Profile ID' })
  @IsString()
  @IsNotEmpty()
  traineeId: string;

  @ApiProperty({ example: '2026-10-05T14:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({ example: '2026-10-10T12:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;
}
