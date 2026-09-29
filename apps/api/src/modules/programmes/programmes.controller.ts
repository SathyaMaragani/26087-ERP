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
import { ProgrammesService } from './programmes.service';
import { CreateProgrammeDto, CreateBatchDto } from './dto/create-programme.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Training Programmes & Batches')
@ApiBearerAuth()
@Controller('programmes')
export class ProgrammesController {
  constructor(private readonly programmesService: ProgrammesService) {}

  @ApiOperation({ summary: 'Create a new NCCT training programme' })
  @ApiResponse({ status: 201, description: 'Training programme created' })
  @RequirePermissions('programme:create')
  @Post()
  async create(@Body() dto: CreateProgrammeDto, @Req() req: AppRequest) {
    return this.programmesService.create(dto, req);
  }

  @ApiOperation({ summary: 'List all training programmes for institution' })
  @RequirePermissions('programme:read')
  @Get()
  async findAll(
    @Query('category') category: string,
    @Query('status') status: any,
    @Query('mode') mode: any,
    @Req() req: AppRequest,
  ) {
    return this.programmesService.findAll({ category, status, mode }, req);
  }

  @ApiOperation({ summary: 'Get programme details by ID' })
  @RequirePermissions('programme:read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AppRequest) {
    return this.programmesService.findOne(id, req);
  }

  @ApiOperation({ summary: 'Update training programme details/status' })
  @RequirePermissions('programme:edit')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProgrammeDto>,
    @Req() req: AppRequest,
  ) {
    return this.programmesService.update(id, dto, req);
  }

  @ApiOperation({ summary: 'Create a batch for a programme' })
  @ApiResponse({ status: 201, description: 'Batch created' })
  @RequirePermissions('batch:create')
  @Post(':id/batches')
  async createBatch(
    @Param('id') id: string,
    @Body() dto: CreateBatchDto,
    @Req() req: AppRequest,
  ) {
    return this.programmesService.createBatch(id, dto, req);
  }

  @ApiOperation({ summary: 'List batches for a programme' })
  @RequirePermissions('programme:read')
  @Get(':id/batches')
  async getBatches(@Param('id') id: string, @Req() req: AppRequest) {
    return this.programmesService.getBatches(id, req);
  }

  @ApiOperation({ summary: 'List all candidate registrations for a programme' })
  @RequirePermissions('programme:read')
  @Get(':id/registrations')
  async getRegistrations(@Param('id') id: string, @Req() req: AppRequest) {
    return this.programmesService.getRegistrations(id, req);
  }

  @ApiOperation({ summary: 'List institutional nominations for a programme' })
  @RequirePermissions('programme:read')
  @Get(':id/nominations')
  async getNominations(@Param('id') id: string, @Req() req: AppRequest) {
    return this.programmesService.getNominations(id, req);
  }
}
