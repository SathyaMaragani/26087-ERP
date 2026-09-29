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
import * as crypto from 'crypto';
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

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      throw new UnauthorizedException(
        `Account is temporarily locked due to consecutive failed attempts. Try again in ${waitMinutes} minutes or reset password.`,
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account has been suspended or deactivated');
    }

    // Reset failed attempts upon successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
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

    // Generate Refresh Token with Rotation Support
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'] as string,
      },
    });

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
      refreshToken: rawRefreshToken,
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

  async refreshToken(dto: { refreshToken: string }, req?: AppRequest) {
    if (!dto.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token Reuse Detection: if revoked token is submitted, revoke ALL tokens for that user
    if (tokenRecord.revoked) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { revoked: true },
      });
      throw new UnauthorizedException(
        'Security breach detected: Reused refresh token. All active sessions invalidated.',
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const user = tokenRecord.user;
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is inactive or suspended');
    }

    const activeMembership = user.memberships.find((m) => m.status === 'ACTIVE') || user.memberships[0];

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeOrganizationId: activeMembership?.organizationId,
      role: (activeMembership?.role as Role) || (user.isSuperAdmin ? Role.SUPER_ADMIN : undefined),
      permissions: activeMembership?.customPermissions || [],
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req?.ip,
        userAgent: req?.headers['user-agent'] as string,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(dto: { refreshToken: string }, req?: AppRequest) {
    if (dto.refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }

    await this.auditService.log({
      userId: req?.user?.id,
      organizationId: req?.tenantId,
      action: 'LOGOUT',
      resource: 'Auth',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return { success: true, message: 'Logged out successfully' };
  }

  async forgotPassword(dto: { email: string }, req?: AppRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return {
        message: 'If the provided email exists in our system, password reset instructions have been sent.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'Auth',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return {
      message: 'If the provided email exists in our system, password reset instructions have been sent.',
      resetToken, // Returned in dev/testing mode
    };
  }

  async resetPassword(dto: { token: string; newPassword: string }, req?: AppRequest) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Revoke all existing sessions upon password reset
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { revoked: true },
      });
    });

    await this.auditService.log({
      userId: resetRecord.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'Auth',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return { success: true, message: 'Password has been reset successfully' };
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
