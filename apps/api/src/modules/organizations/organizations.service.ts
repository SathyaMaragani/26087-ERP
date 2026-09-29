import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateFeatureDto } from './dto/update-features.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateOrganizationDto, user: AuthenticatedUser, req?: AppRequest) {
    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Organization slug '${dto.slug}' is already taken.`);
    }

    if (dto.domain) {
      const existingDomain = await this.prisma.organization.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new ConflictException(`Domain '${dto.domain}' is already linked to another institution.`);
      }
    }

    const org = await this.prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          domain: dto.domain,
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor || '#1E40AF',
          timezone: dto.timezone || 'Asia/Kolkata',
          academicYear: dto.academicYear,
        },
      });

      // Default feature flags
      const defaultKeys = [
        'attendance',
        'lms',
        'academics',
        'assessments',
        'analytics',
        'documents',
      ];
      for (const key of defaultKeys) {
        await tx.featureFlag.create({
          data: {
            organizationId: createdOrg.id,
            key,
            enabled: true,
          },
        });
      }

      // If created by a non-superadmin user, make them INSTITUTION_ADMIN
      if (!user.isSuperAdmin) {
        await tx.membership.create({
          data: {
            organizationId: createdOrg.id,
            userId: user.id,
            role: Role.INSTITUTION_ADMIN,
          },
        });
      }

      return createdOrg;
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: org.id,
      action: 'ORGANIZATION_CREATED',
      resource: 'Organization',
      resourceId: org.id,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return org;
  }

  async findAll(user: AuthenticatedUser) {
    if (user.isSuperAdmin) {
      return this.prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              memberships: true,
              departments: true,
              courses: true,
            },
          },
        },
      });
    }

    // Return institutions user belongs to
    return this.prisma.organization.findMany({
      where: {
        memberships: {
          some: {
            userId: user.id,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        _count: {
          select: {
            memberships: true,
            departments: true,
            courses: true,
          },
        },
      },
    });
  }

  async findOne(idOrSlug: string, user: AuthenticatedUser) {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { domain: idOrSlug }],
      },
      include: {
        featureFlags: true,
        _count: {
          select: {
            memberships: true,
            departments: true,
            courses: true,
            studentProfiles: true,
            facultyProfiles: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Institution '${idOrSlug}' not found`);
    }

    if (!user.isSuperAdmin) {
      const isMember = await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: user.id,
          },
        },
      });

      if (!isMember || isMember.status !== 'ACTIVE') {
        throw new ForbiddenException('Access denied to this institution');
      }
    }

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, user: AuthenticatedUser, req?: AppRequest) {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    if (dto.domain && dto.domain !== existing.domain) {
      const domainTaken = await this.prisma.organization.findUnique({
        where: { domain: dto.domain },
      });
      if (domainTaken) {
        throw new ConflictException(`Domain '${dto.domain}' is already linked to another institution`);
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        domain: dto.domain,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor,
        timezone: dto.timezone,
        academicYear: dto.academicYear,
        settings: dto.settings ?? undefined,
      },
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: id,
      action: 'ORGANIZATION_UPDATED',
      resource: 'Organization',
      resourceId: id,
      oldValues: existing,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return updated;
  }

  async getFeatures(id: string) {
    return this.prisma.featureFlag.findMany({
      where: { organizationId: id },
    });
  }

  async updateFeature(
    organizationId: string,
    dto: UpdateFeatureDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const feature = await this.prisma.featureFlag.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key: dto.key,
        },
      },
      update: {
        enabled: dto.enabled,
        config: dto.config ?? undefined,
      },
      create: {
        organizationId,
        key: dto.key,
        enabled: dto.enabled,
        config: dto.config ?? undefined,
      },
    });

    await this.auditService.log({
      userId: user.id,
      organizationId,
      action: 'FEATURE_FLAG_UPDATED',
      resource: 'FeatureFlag',
      resourceId: feature.id,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return feature;
  }

  async addMember(
    organizationId: string,
    dto: AddMemberDto,
    currentUser: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!targetUser) {
      throw new NotFoundException(`No user found with email ${dto.email}`);
    }

    const membership = await this.prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUser.id,
        },
      },
      update: {
        role: dto.role,
        departmentId: dto.departmentId,
        customPermissions: dto.customPermissions || [],
        status: 'ACTIVE',
      },
      create: {
        organizationId,
        userId: targetUser.id,
        role: dto.role,
        departmentId: dto.departmentId,
        customPermissions: dto.customPermissions || [],
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      organizationId,
      action: 'ROLE_CHANGED',
      resource: 'Membership',
      resourceId: membership.id,
      newValues: { role: dto.role, departmentId: dto.departmentId },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return membership;
  }
}
