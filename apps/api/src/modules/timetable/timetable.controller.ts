import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTrainingSessionDto } from './dto/create-session.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Timetable & Training Sessions')
@ApiBearerAuth()
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @ApiOperation({
    summary: 'Schedule a training session with automated conflict detection (room, trainer, batch)',
  })
  @ApiResponse({ status: 201, description: 'Session scheduled successfully' })
  @ApiResponse({ status: 409, description: 'Conflict detected (trainer, room, or batch overlap)' })
  @RequirePermissions('timetable:create')
  @Post('sessions')
  async createSession(
    @Body() dto: CreateTrainingSessionDto,
    @Req() req: AppRequest,
  ) {
    return this.timetableService.createSession(dto, req);
  }

  @ApiOperation({ summary: 'List scheduled sessions filterable by date, batch, or trainer' })
  @RequirePermissions('timetable:read')
  @Get('sessions')
  async getSessions(
    @Query('batchId') batchId: string,
    @Query('trainerId') trainerId: string,
    @Query('date') date: string,
    @Req() req: AppRequest,
  ) {
    return this.timetableService.getSessions({ batchId, trainerId, date }, req);
  }

  @ApiOperation({ summary: 'Get timetable schedule for a specific batch' })
  @RequirePermissions('timetable:read')
  @Get('batches/:batchId/schedule')
  async getBatchSchedule(
    @Param('batchId') batchId: string,
    @Req() req: AppRequest,
  ) {
    return this.timetableService.getBatchSchedule(batchId, req);
  }
}
