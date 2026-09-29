import {
  Controller,
  Get,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { EmploymentService } from './employment.service';
import { CreateEmployerDto } from './dto/employment.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Employers & Industry Partners (Employment Exchange)')
@ApiBearerAuth()
@Controller('employers')
export class EmployersController {
  constructor(private readonly employmentService: EmploymentService) {}

  @ApiOperation({ summary: 'Register an employer or recruiter profile' })
  @ApiResponse({ status: 201, description: 'Employer profile created' })
  @RequirePermissions('job:create')
  @Post()
  async createEmployer(@Body() dto: CreateEmployerDto, @Req() req: AppRequest) {
    return this.employmentService.createEmployer(dto, req);
  }

  @ApiOperation({ summary: 'List all verified employers' })
  @RequirePermissions('job:read')
  @Get()
  async getEmployers(@Req() req: AppRequest) {
    return this.employmentService.getEmployers(req);
  }
}
