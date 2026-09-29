import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@ApiTags('Analytics & Dashboards')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Student personalized dashboard KPIs, schedule, and attendance rate' })
  @Roles(Role.STUDENT, Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @Get('student')
  async getStudentDashboard(
    @CurrentTenant() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analyticsService.getStudentDashboard(orgId, user.id);
  }

  @ApiOperation({ summary: 'Faculty dashboard KPIs, courses, and class completion rate' })
  @Roles(Role.FACULTY, Role.HOD, Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @Get('faculty')
  async getFacultyDashboard(
    @CurrentTenant() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analyticsService.getFacultyDashboard(orgId, user.id);
  }

  @ApiOperation({ summary: 'Institution / Principal executive overview dashboard' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD)
  @Get('overview')
  async getAdminDashboard(@CurrentTenant() orgId: string) {
    return this.analyticsService.getAdminDashboard(orgId);
  }

  @ApiOperation({
    summary: 'NCCT National Command Center Dashboard (Total Trainees, Completion Rate, State-wise Breakdown)',
  })
  @Get('ncct-command-center')
  async getNcctCommandCenter() {
    return this.analyticsService.getNcctCommandCenter();
  }

  @ApiOperation({
    summary: 'Institution real-time operational dashboard (programmes, trainees, sessions today, occupancy)',
  })
  @Get('institution')
  async getInstitutionOperationalDashboard(@CurrentTenant() orgId: string) {
    return this.analyticsService.getInstitutionOperationalDashboard(orgId);
  }

  @ApiOperation({
    summary: 'Trainee personal learning & career dashboard (progress, certificates, matching opportunities)',
  })
  @Get('trainee')
  async getTraineeDashboard(
    @CurrentTenant() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analyticsService.getTraineeDashboard(orgId, user.id);
  }

  @ApiOperation({
    summary: 'Employer portal dashboard (active jobs, applicants, interview stats)',
  })
  @Get('employer')
  async getEmployerDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getEmployerDashboard(user.id);
  }
}
