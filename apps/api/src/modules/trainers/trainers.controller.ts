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
import { TrainersService } from './trainers.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Trainers & Faculty Directory')
@ApiBearerAuth()
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @ApiOperation({ summary: 'Onboard a trainer / subject-matter expert profile' })
  @ApiResponse({ status: 201, description: 'Trainer profile created' })
  @RequirePermissions('trainer:create')
  @Post()
  async create(@Body() dto: CreateTrainerDto, @Req() req: AppRequest) {
    return this.trainersService.create(dto, req);
  }

  @ApiOperation({ summary: 'List trainers by specialization or status' })
  @RequirePermissions('trainer:read')
  @Get()
  async findAll(
    @Query('specialization') specialization: string,
    @Query('status') status: string,
    @Req() req: AppRequest,
  ) {
    return this.trainersService.findAll({ specialization, status }, req);
  }

  @ApiOperation({ summary: 'Get trainer details and assigned sessions' })
  @RequirePermissions('trainer:read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AppRequest) {
    return this.trainersService.findOne(id, req);
  }
}
