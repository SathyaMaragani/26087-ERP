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
import { EmploymentService } from './employment.service';
import {
  CreateEmployerDto,
  CreateJobPostingDto,
  ApplyJobDto,
  RecordOutcomeDto,
} from './dto/employment.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Employment Exchange & Skill Matching')
@ApiBearerAuth()
@Controller('employment')
export class EmploymentController {
  constructor(private readonly employmentService: EmploymentService) {}

  @ApiOperation({ summary: 'Register an employer or recruiter profile' })
  @ApiResponse({ status: 201, description: 'Employer profile created' })
  @RequirePermissions('job:create')
  @Post('employers')
  async createEmployer(@Body() dto: CreateEmployerDto, @Req() req: AppRequest) {
    return this.employmentService.createEmployer(dto, req);
  }

  @ApiOperation({ summary: 'List all verified employers' })
  @RequirePermissions('job:read')
  @Get('employers')
  async getEmployers(@Req() req: AppRequest) {
    return this.employmentService.getEmployers(req);
  }

  @ApiOperation({ summary: 'Post a new job opening with required skill specifications' })
  @ApiResponse({ status: 201, description: 'Job created' })
  @RequirePermissions('job:create')
  @Post('jobs')
  async createJob(@Body() dto: CreateJobPostingDto, @Req() req: AppRequest) {
    return this.employmentService.createJob(dto, req);
  }

  @ApiOperation({ summary: 'List open jobs across regions' })
  @RequirePermissions('job:read')
  @Get('jobs')
  async getJobs(
    @Query('location') location: string,
    @Query('search') search: string,
    @Req() req: AppRequest,
  ) {
    return this.employmentService.getJobs({ location, search }, req);
  }

  @ApiOperation({
    summary: 'Skill-Matching Engine: Calculate match score % and rank candidates for a job',
  })
  @RequirePermissions('job:read')
  @Get('jobs/:id/candidates')
  async matchCandidates(@Param('id') id: string, @Req() req: AppRequest) {
    return this.employmentService.matchCandidatesForJob(id, req);
  }

  @ApiOperation({ summary: 'Submit job application for a trainee' })
  @ApiResponse({ status: 201, description: 'Application submitted with calculated match score' })
  @RequirePermissions('job:apply')
  @Post('jobs/:id/apply')
  async applyJob(
    @Param('id') id: string,
    @Body() dto: ApplyJobDto,
    @Req() req: AppRequest,
  ) {
    return this.employmentService.applyJob({ ...dto, jobPostingId: id }, req);
  }

  @ApiOperation({ summary: 'List job applications' })
  @RequirePermissions('job:read')
  @Get('applications')
  async getApplications(
    @Query('jobId') jobId: string,
    @Req() req: AppRequest,
  ) {
    return this.employmentService.getApplications(jobId, req);
  }

  @ApiOperation({ summary: 'Record verified employment outcome (placement)' })
  @ApiResponse({ status: 201, description: 'Employment outcome recorded' })
  @RequirePermissions('job:create')
  @Post('outcomes')
  async recordOutcome(@Body() dto: RecordOutcomeDto, @Req() req: AppRequest) {
    return this.employmentService.recordOutcome(dto, req);
  }
}
