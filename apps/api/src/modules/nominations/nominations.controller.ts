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
import { NominationsService } from './nominations.service';
import { RegisterProgrammeDto, UpdateNominationStatusDto } from './dto/nomination.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';
import { RegistrationStatus } from '@erplms/types';

@ApiTags('Online Registrations & Nominations')
@ApiBearerAuth()
@Controller('nominations')
export class NominationsController {
  constructor(private readonly nominationsService: NominationsService) {}

  @ApiOperation({ summary: 'Self-register for a training programme (rural youth / direct applicants)' })
  @ApiResponse({ status: 201, description: 'Registration submitted' })
  @RequirePermissions('programme:register')
  @Post('register')
  async registerSelf(@Body() dto: RegisterProgrammeDto, @Req() req: AppRequest) {
    return this.nominationsService.registerSelf(dto, req);
  }

  @ApiOperation({ summary: 'Nominate a candidate by cooperative/institution' })
  @ApiResponse({ status: 201, description: 'Institutional nomination submitted' })
  @RequirePermissions('nomination:create')
  @Post(':traineeId/nominate')
  async nominate(
    @Param('traineeId') traineeId: string,
    @Body() dto: RegisterProgrammeDto,
    @Req() req: AppRequest,
  ) {
    return this.nominationsService.nominate(traineeId, dto, req);
  }

  @ApiOperation({ summary: 'List all nominations for an institution' })
  @RequirePermissions('nomination:read')
  @Get()
  async findAll(
    @Query('programmeId') programmeId: string,
    @Query('status') status: RegistrationStatus,
    @Req() req: AppRequest,
  ) {
    return this.nominationsService.findAll({ programmeId, status }, req);
  }

  @ApiOperation({ summary: 'List current user own programme registrations' })
  @RequirePermissions('programme:register')
  @Get('my')
  async findMy(@Req() req: AppRequest) {
    return this.nominationsService.findMy(req);
  }

  @ApiOperation({ summary: 'Approve, reject, waitlist, or enroll nomination into batch' })
  @RequirePermissions('nomination:approve')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateNominationStatusDto,
    @Req() req: AppRequest,
  ) {
    return this.nominationsService.updateStatus(id, dto, req);
  }
}
