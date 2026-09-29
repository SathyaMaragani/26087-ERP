import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { HostelService } from './hostel.service';
import { CreateHostelDto, CreateHostelRoomDto, AllocateBedDto } from './dto/hostel.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Hostel Management')
@ApiBearerAuth()
@Controller('hostels')
export class HostelController {
  constructor(private readonly hostelService: HostelService) {}

  @ApiOperation({ summary: 'Register a new hostel facility' })
  @ApiResponse({ status: 201, description: 'Hostel created' })
  @RequirePermissions('hostel:create')
  @Post()
  async createHostel(@Body() dto: CreateHostelDto, @Req() req: AppRequest) {
    return this.hostelService.createHostel(dto, req);
  }

  @ApiOperation({ summary: 'List all hostels and their rooms' })
  @RequirePermissions('hostel:read')
  @Get()
  async getHostels(@Req() req: AppRequest) {
    return this.hostelService.getHostels(req);
  }

  @ApiOperation({ summary: 'Get overall hostel occupancy KPI dashboard' })
  @RequirePermissions('hostel:read')
  @Get('occupancy')
  async getOccupancy(@Req() req: AppRequest) {
    return this.hostelService.getOccupancy(req);
  }

  @ApiOperation({ summary: 'Add a room to a hostel' })
  @ApiResponse({ status: 201, description: 'Room created' })
  @RequirePermissions('hostel:create')
  @Post(':id/rooms')
  async createRoom(
    @Param('id') id: string,
    @Body() dto: CreateHostelRoomDto,
    @Req() req: AppRequest,
  ) {
    return this.hostelService.createRoom(id, dto, req);
  }

  @ApiOperation({ summary: 'Allocate a bed to a trainee with capacity enforcement' })
  @ApiResponse({ status: 201, description: 'Bed allocated' })
  @RequirePermissions('hostel:allocate')
  @Post('allocations')
  async allocateBed(@Body() dto: AllocateBedDto, @Req() req: AppRequest) {
    return this.hostelService.allocateBed(dto, req);
  }

  @ApiOperation({ summary: 'Mark trainee check-in' })
  @RequirePermissions('hostel:allocate')
  @Patch('allocations/:id/check-in')
  async checkIn(@Param('id') id: string, @Req() req: AppRequest) {
    return this.hostelService.checkIn(id, req);
  }

  @ApiOperation({ summary: 'Mark trainee check-out and free bed capacity' })
  @RequirePermissions('hostel:allocate')
  @Patch('allocations/:id/check-out')
  async checkOut(@Param('id') id: string, @Req() req: AppRequest) {
    return this.hostelService.checkOut(id, req);
  }
}
