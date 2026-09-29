import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRequest } from '../types/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AppRequest>();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle unauthenticated
    }

    // Platform Super Admin has universal cross-tenant access
    if (user.isSuperAdmin) {
      return true;
    }

    // Target tenant ID from request (header or param)
    const targetTenantId = (
      request.tenantId ||
      request.params?.organizationId ||
      request.params?.orgId ||
      (typeof request.query?.organizationId === 'string'
        ? request.query.organizationId
        : undefined)
    ) as string | undefined;

    if (!targetTenantId) {
      // If no explicit tenant target in request, user's active tenant is enforced
      return true;
    }

    // Ensure the tenant target matches user's active membership or an assigned membership
    if (user.activeOrganizationId && user.activeOrganizationId === targetTenantId) {
      return true;
    }

    // Double check database membership for strong isolation
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetTenantId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException(
        `Cross-tenant access forbidden: User does not have active membership in institution '${targetTenantId}'`,
      );
    }

    // Sync active role to request user if switched
    user.activeOrganizationId = membership.organizationId;
    user.role = membership.role as any;

    return true;
  }
}
