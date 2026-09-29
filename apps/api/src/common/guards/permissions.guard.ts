import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AppRequest } from '../types/request-context';
import { DEFAULT_ROLE_PERMISSIONS, hasPermission } from '../utils/rbac-matrix';
import { Role } from '@erplms/types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AppRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (user.isSuperAdmin) {
      return true;
    }

    const role = user.role as Role;
    const basePermissions = role ? DEFAULT_ROLE_PERMISSIONS[role] || [] : [];
    const customPermissions = user.permissions || [];
    const effectivePermissions = Array.from(
      new Set([...basePermissions, ...customPermissions]),
    );

    for (const required of requiredPermissions) {
      if (!hasPermission(effectivePermissions, required)) {
        throw new ForbiddenException(
          `Access denied: Missing required permission '${required}'`,
        );
      }
    }

    return true;
  }
}
