import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FacultyService } from './faculty.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@ApiTags('Faculty Directory & Allocations')
@ApiBearerAuth()
@Controller('faculty')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @ApiOperation({ summary: 'Create faculty profile' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD)
  @Post()
  async create(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateFacultyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.facultyService.create(orgId, dto, user, req);
  }

  @ApiOperation({ summary: 'List faculty members' })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @Get()
  async findAll(
    @CurrentTenant() orgId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.facultyService.findAll(orgId, departmentId);
  }

  @ApiOperation({ summary: 'Get faculty member details and course allocations' })
  @Get(':id')
  async findOne(@CurrentTenant() orgId: string, @Param('id') id: string) {
    return this.facultyService.findOne(orgId, id);
  }
}
