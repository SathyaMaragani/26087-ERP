import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AcademicsService } from './academics.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { AllocateCourseDto } from './dto/allocate-course.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@ApiTags('Academic Core (SIS & Academics)')
@ApiBearerAuth()
@Controller('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  // Departments
  @ApiOperation({ summary: 'Create department' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL)
  @Post('departments')
  async createDepartment(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.academicsService.createDepartment(orgId, dto, user, req);
  }

  @ApiOperation({ summary: 'List departments for institution' })
  @Get('departments')
  async listDepartments(@CurrentTenant() orgId: string) {
    return this.academicsService.listDepartments(orgId);
  }

  // Academic Years
  @ApiOperation({ summary: 'Create academic year' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL)
  @Post('academic-years')
  async createAcademicYear(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateAcademicYearDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.academicsService.createAcademicYear(orgId, dto, user, req);
  }

  @ApiOperation({ summary: 'List academic years' })
  @Get('academic-years')
  async listAcademicYears(@CurrentTenant() orgId: string) {
    return this.academicsService.listAcademicYears(orgId);
  }

  // Programmes
  @ApiOperation({ summary: 'Create academic programme (degree)' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD)
  @Post('programmes')
  async createProgramme(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateProgrammeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.academicsService.createProgramme(orgId, dto, user, req);
  }

  @ApiOperation({ summary: 'List programmes' })
  @Get('programmes')
  async listProgrammes(@CurrentTenant() orgId: string) {
    return this.academicsService.listProgrammes(orgId);
  }

  // Batches
  @ApiOperation({ summary: 'Create student batch / cohort' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD)
  @Post('batches')
  async createBatch(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.academicsService.createBatch(orgId, dto);
  }

  @ApiOperation({ summary: 'List batches' })
  @Get('batches')
  async listBatches(@CurrentTenant() orgId: string) {
    return this.academicsService.listBatches(orgId);
  }

  // Sections
  @ApiOperation({ summary: 'Create section in a batch' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD)
  @Post('sections')
  async createSection(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.academicsService.createSection(orgId, dto);
  }

  @ApiOperation({ summary: 'List sections' })
  @ApiQuery({ name: 'batchId', required: false, type: String })
  @Get('sections')
  async listSections(
    @CurrentTenant() orgId: string,
    @Query('batchId') batchId?: string,
  ) {
    return this.academicsService.listSections(orgId, batchId);
  }

  // Courses
  @ApiOperation({ summary: 'Create curriculum course' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD)
  @Post('courses')
  async createCourse(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.academicsService.createCourse(orgId, dto);
  }

  @ApiOperation({ summary: 'List courses' })
  @Get('courses')
  async listCourses(@CurrentTenant() orgId: string) {
    return this.academicsService.listCourses(orgId);
  }

  // Course Allocations
  @ApiOperation({ summary: 'Allocate course and section to faculty' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD)
  @Post('allocations')
  async allocateCourse(
    @CurrentTenant() orgId: string,
    @Body() dto: AllocateCourseDto,
  ) {
    return this.academicsService.allocateCourse(orgId, dto);
  }

  @ApiOperation({ summary: 'List faculty course allocations' })
  @ApiQuery({ name: 'facultyId', required: false, type: String })
  @Get('allocations')
  async listAllocations(
    @CurrentTenant() orgId: string,
    @Query('facultyId') facultyId?: string,
  ) {
    return this.academicsService.listAllocations(orgId, facultyId);
  }
}
