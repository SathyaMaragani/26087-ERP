import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateFeatureDto } from './dto/update-features.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@ApiTags('Organizations / Institutions')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @ApiOperation({ summary: 'Create a new institution (SuperAdmin or Tenant Admin)' })
  @Post()
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.orgService.create(dto, user, req);
  }

  @ApiOperation({ summary: 'List institutions (all for SuperAdmin, enrolled for users)' })
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.orgService.findAll(user);
  }

  @ApiOperation({ summary: 'Get institution details and features by ID or slug' })
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orgService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Update institution configuration and branding' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.orgService.update(id, dto, user, req);
  }

  @ApiOperation({ summary: 'Get feature flags for institution' })
  @Get(':id/features')
  async getFeatures(@Param('id') id: string) {
    return this.orgService.getFeatures(id);
  }

  @ApiOperation({ summary: 'Update or toggle a feature flag for institution' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN)
  @Put(':id/features')
  async updateFeature(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.orgService.updateFeature(id, dto, user, req);
  }

  @ApiOperation({ summary: 'Assign a user to institution with a specific role' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL)
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.orgService.addMember(id, dto, user, req);
  }
}
