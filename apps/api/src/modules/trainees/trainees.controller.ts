import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TraineesService } from './trainees.service';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';
import { TraineeType } from '@erplms/types';

@ApiTags('Trainees & Rural Youth (Centralized Database)')
@ApiBearerAuth()
@Controller('trainees')
export class TraineesController {
  constructor(private readonly traineesService: TraineesService) {}

  @ApiOperation({ summary: 'Register/onboard a trainee profile (rural youth, PACS member, SHG member)' })
  @ApiResponse({ status: 201, description: 'Trainee profile created' })
  @RequirePermissions('trainee:create')
  @Post()
  async create(@Body() dto: CreateTraineeDto, @Req() req: AppRequest) {
    return this.traineesService.create(dto, req);
  }

  @ApiOperation({ summary: 'List and filter trainees by type, state, district, or search keyword' })
  @RequirePermissions('trainee:read')
  @Get()
  async findAll(
    @Query('traineeType') traineeType: TraineeType,
    @Query('state') state: string,
    @Query('district') district: string,
    @Query('search') search: string,
    @Req() req: AppRequest,
  ) {
    return this.traineesService.findAll({ traineeType, state, district, search }, req);
  }

  @ApiOperation({ summary: 'Get full longitudinal profile for a trainee (registrations, skills, certs, jobs)' })
  @RequirePermissions('trainee:read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AppRequest) {
    return this.traineesService.findOne(id, req);
  }

  @ApiOperation({ summary: 'Get all acquired skills for a trainee' })
  @RequirePermissions('trainee:read')
  @Get(':id/skills')
  async getSkills(@Param('id') id: string, @Req() req: AppRequest) {
    return this.traineesService.getSkills(id, req);
  }

  @ApiOperation({ summary: 'Get all certificates earned by a trainee' })
  @RequirePermissions('trainee:read')
  @Get(':id/certificates')
  async getCertificates(@Param('id') id: string, @Req() req: AppRequest) {
    return this.traineesService.getCertificates(id, req);
  }

  @ApiOperation({ summary: 'Get all training programmes enrolled/registered for a trainee' })
  @RequirePermissions('programme:read')
  @Get(':id/programmes')
  async getProgrammes(@Param('id') id: string, @Req() req: AppRequest) {
    return this.traineesService.getProgrammes(id, req);
  }

  @ApiOperation({ summary: 'Update trainee demographic/profile details' })
  @RequirePermissions('trainee:update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTraineeDto>,
    @Req() req: AppRequest,
  ) {
    return this.traineesService.update(id, dto, req);
  }
}
