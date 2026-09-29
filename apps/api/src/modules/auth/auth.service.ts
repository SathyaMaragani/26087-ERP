import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import * as bcrypt from 'bcrypt';
import { Role, JwtPayload } from '@erplms/types';
import { AppRequest } from '../../common/types/request-context';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, req?: AppRequest) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });

      let organization = null;
      let membership = null;

      // 2. If organizationName provided, create new institution and make user INSTITUTION_ADMIN
      if (dto.organizationName) {
        const slug =
          dto.organizationSlug ||
          dto.organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const existingOrg = await tx.organization.findUnique({
          where: { slug },
        });

        if (existingOrg) {
          throw new ConflictException(
            `An organization with slug '${slug}' already exists. Please choose another slug.`,
          );
        }

        organization = await tx.organization.create({
          data: {
            name: dto.organizationName,
            slug,
          },
        });

        membership = await tx.membership.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: Role.INSTITUTION_ADMIN,
          },
        });

        // Initialize default feature flags for new organization
        const defaultFlags = [
          'attendance',
          'lms',
          'academics',
          'assessments',
          'analytics',
          'documents',
        ];
        for (const flag of defaultFlags) {
          await tx.featureFlag.create({
            data: {
              organizationId: organization.id,
              key: flag,
              enabled: true,
            },
          });
        }
      }

      return { user, organization, membership };
    });

    await this.auditService.log({
      userId: result.user.id,
      organizationId: result.organization?.id,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: result.user.id,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return this.login(
      { email: dto.email, password: dto.password },
      req,
    );
  }

  async login(dto: LoginDto, req?: AppRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account has been suspended or deactivated');
    }

    // Determine default active organization
    // 1. Check req.tenantId if passed
    let activeMembership = user.memberships.find(
      (m) => req?.tenantId && m.organizationId === req.tenantId,
    );

    // 2. Or take the first active membership
    if (!activeMembership && user.memberships.length > 0) {
      activeMembership = user.memberships.find((m) => m.status === 'ACTIVE') || user.memberships[0];
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeOrganizationId: activeMembership?.organizationId,
      role: (activeMembership?.role as Role) || (user.isSuperAdmin ? Role.SUPER_ADMIN : undefined),
      permissions: activeMembership?.customPermissions || [],
    };

    const accessToken = this.jwtService.sign(payload);

    await this.auditService.log({
      userId: user.id,
      organizationId: activeMembership?.organizationId,
      action: 'LOGIN',
      resource: 'Auth',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
      activeOrganization: activeMembership?.organization
        ? {
            id: activeMembership.organization.id,
            name: activeMembership.organization.name,
            slug: activeMembership.organization.slug,
            logoUrl: activeMembership.organization.logoUrl,
            primaryColor: activeMembership.organization.primaryColor,
            role: activeMembership.role,
          }
        : null,
      availableOrganizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  async switchTenant(dto: SwitchTenantDto, userId: string, req?: AppRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { organizationId: dto.organizationId },
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const membership = user.memberships[0];

    if (!user.isSuperAdmin && (!membership || membership.status !== 'ACTIVE')) {
      throw new UnauthorizedException('You do not have active access to this institution');
    }

    const targetOrg =
      membership?.organization ||
      (await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      }));

    if (!targetOrg) {
      throw new NotFoundException('Institution not found');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeOrganizationId: targetOrg.id,
      role: (membership?.role as Role) || (user.isSuperAdmin ? Role.SUPER_ADMIN : undefined),
      permissions: membership?.customPermissions || [],
    };

    const accessToken = this.jwtService.sign(payload);

    await this.auditService.log({
      userId: user.id,
      organizationId: targetOrg.id,
      action: 'TENANT_SWITCHED',
      resource: 'Organization',
      resourceId: targetOrg.id,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return {
      accessToken,
      activeOrganization: {
        id: targetOrg.id,
        name: targetOrg.name,
        slug: targetOrg.slug,
        logoUrl: targetOrg.logoUrl,
        primaryColor: targetOrg.primaryColor,
        role: payload.role,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isSuperAdmin: true,
        status: true,
        memberships: {
          include: {
            organization: true,
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
