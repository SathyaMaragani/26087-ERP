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
import { CreateJobPostingDto, ApplyJobDto } from './dto/employment.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Jobs & Candidate Matching (Employment Exchange)')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly employmentService: EmploymentService) {}

  @ApiOperation({ summary: 'Post a new job opening' })
  @ApiResponse({ status: 201, description: 'Job created' })
  @RequirePermissions('job:create')
  @Post()
  async createJob(@Body() dto: CreateJobPostingDto, @Req() req: AppRequest) {
    return this.employmentService.createJob(dto, req);
  }

  @ApiOperation({ summary: 'List open jobs across regions' })
  @RequirePermissions('job:read')
  @Get()
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
  @Get(':id/candidates')
  async matchCandidates(@Param('id') id: string, @Req() req: AppRequest) {
    return this.employmentService.matchCandidatesForJob(id, req);
  }

  @ApiOperation({ summary: 'Submit job application for a trainee' })
  @ApiResponse({ status: 201, description: 'Application submitted with calculated match score' })
  @RequirePermissions('job:apply')
  @Post(':id/apply')
  async applyJob(
    @Param('id') id: string,
    @Body() dto: ApplyJobDto,
    @Req() req: AppRequest,
  ) {
    return this.employmentService.applyJob({ ...dto, jobPostingId: id }, req);
  }

  @ApiOperation({ summary: 'List job applications for a job posting' })
  @RequirePermissions('job:read')
  @Get(':id/applications')
  async getApplications(
    @Param('id') id: string,
    @Req() req: AppRequest,
  ) {
    return this.employmentService.getApplications(id, req);
  }
}
