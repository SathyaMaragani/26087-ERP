import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LmsService } from './lms.service';
import { CreateLmsCourseDto } from './dto/create-lms-course.dto';
import { CreateLmsModuleDto } from './dto/create-lms-module.dto';
import { CreateLmsLessonDto } from './dto/create-lms-lesson.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@ApiTags('LMS (Learning Management System)')
@ApiBearerAuth()
@Controller('lms')
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  @ApiOperation({ summary: 'Create LMS course portal for an academic course' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD, Role.FACULTY)
  @Post('courses')
  async createCourse(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateLmsCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lmsService.createCourse(orgId, dto, user);
  }

  @ApiOperation({ summary: 'List all published and active LMS courses' })
  @Get('courses')
  async listCourses(@CurrentTenant() orgId: string) {
    return this.lmsService.listCourses(orgId);
  }

  @ApiOperation({ summary: 'Get LMS course hierarchy (course -> modules -> lessons)' })
  @Get('courses/:id')
  async getCourseDetails(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
  ) {
    return this.lmsService.getCourseDetails(orgId, id);
  }

  @ApiOperation({ summary: 'Add a module to an LMS course' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.FACULTY)
  @Post('courses/:id/modules')
  async addModule(
    @CurrentTenant() orgId: string,
    @Param('id') courseId: string,
    @Body() dto: CreateLmsModuleDto,
  ) {
    return this.lmsService.addModule(orgId, courseId, dto);
  }

  @ApiOperation({ summary: 'Add a lesson with structured JSON content blocks' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.FACULTY)
  @Post('modules/:id/lessons')
  async addLesson(
    @CurrentTenant() orgId: string,
    @Param('id') moduleId: string,
    @Body() dto: CreateLmsLessonDto,
  ) {
    return this.lmsService.addLesson(orgId, moduleId, dto);
  }

  @ApiOperation({ summary: 'Get lesson content and blocks' })
  @Get('lessons/:id')
  async getLesson(
    @CurrentTenant() orgId: string,
    @Param('id') lessonId: string,
  ) {
    return this.lmsService.getLesson(orgId, lessonId);
  }

  @ApiOperation({ summary: 'Create assignment in course' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.FACULTY)
  @Post('courses/:id/assignments')
  async createAssignment(
    @CurrentTenant() orgId: string,
    @Param('id') courseId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lmsService.createAssignment(orgId, courseId, dto, user);
  }

  @ApiOperation({ summary: 'Submit assignment work' })
  @Roles(Role.STUDENT)
  @Post('assignments/:id/submissions')
  async submitAssignment(
    @CurrentTenant() orgId: string,
    @Param('id') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Need student profile id
    return this.lmsService.submitAssignment(orgId, assignmentId, user.id, dto);
  }

  @ApiOperation({ summary: 'Grade assignment submission with feedback and score' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.FACULTY)
  @Post('submissions/:id/grade')
  async gradeSubmission(
    @CurrentTenant() orgId: string,
    @Param('id') submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.lmsService.gradeSubmission(orgId, submissionId, dto, user, req);
  }
}
