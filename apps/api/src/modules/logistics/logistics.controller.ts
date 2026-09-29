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
import { LogisticsService } from './logistics.service';
import { CreateLogisticsItemDto, UpdateLogisticsStatusDto } from './dto/logistics.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Logistics Management (Meals, Kits, Transport)')
@ApiBearerAuth()
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @ApiOperation({ summary: 'Create logistics checklist item for training programme' })
  @ApiResponse({ status: 201, description: 'Logistics item created' })
  @RequirePermissions('logistics:create')
  @Post()
  async create(@Body() dto: CreateLogisticsItemDto, @Req() req: AppRequest) {
    return this.logisticsService.create(dto, req);
  }

  @ApiOperation({ summary: 'List logistics items for institution or programme' })
  @RequirePermissions('logistics:read')
  @Get()
  async findAll(
    @Query('programmeId') programmeId: string,
    @Query('category') category: string,
    @Req() req: AppRequest,
  ) {
    return this.logisticsService.findAll({ programmeId, category }, req);
  }

  @ApiOperation({ summary: 'Update logistics fulfillment status' })
  @RequirePermissions('logistics:edit')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsStatusDto,
    @Req() req: AppRequest,
  ) {
    return this.logisticsService.updateStatus(id, dto, req);
  }
}
