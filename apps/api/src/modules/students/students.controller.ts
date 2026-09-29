import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@ApiTags('Student Information System (SIS)')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({ summary: 'Enroll a new student' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.STAFF)
  @Post()
  async create(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateStudentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.studentsService.create(orgId, dto, user, req);
  }

  @ApiOperation({ summary: 'List and filter students' })
  @ApiQuery({ name: 'batchId', required: false, type: String })
  @ApiQuery({ name: 'sectionId', required: false, type: String })
  @ApiQuery({ name: 'programmeId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @Get()
  async findAll(
    @CurrentTenant() orgId: string,
    @Query('batchId') batchId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('programmeId') programmeId?: string,
    @Query('search') search?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  ) {
    return this.studentsService.findAll(orgId, {
      batchId,
      sectionId,
      programmeId,
      search,
      limit,
      page,
    });
  }

  @ApiOperation({ summary: 'Get student profile details' })
  @Get(':id')
  async findOne(@CurrentTenant() orgId: string, @Param('id') id: string) {
    return this.studentsService.findOne(orgId, id);
  }

  @ApiOperation({ summary: 'Get unified student activity timeline' })
  @Get(':id/timeline')
  async getTimeline(@CurrentTenant() orgId: string, @Param('id') id: string) {
    return this.studentsService.getTimeline(orgId, id);
  }

  @ApiOperation({ summary: 'Update student profile' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.STAFF)
  @Patch(':id')
  async update(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.studentsService.update(orgId, id, dto, user, req);
  }
}
