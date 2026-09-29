import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RolesGuard } from './roles.guard';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@erplms/types';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any);

  it('allows access if no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ user: { id: 'u1', role: Role.STUDENT } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access if user has the required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.FACULTY, Role.HOD]);
    const context = createMockContext({ user: { id: 'u1', role: Role.FACULTY } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows SuperAdmin to bypass role requirement', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.INSTITUTION_ADMIN]);
    const context = createMockContext({ user: { id: 'u1', isSuperAdmin: true } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException if user lacks required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.FACULTY]);
    const context = createMockContext({ user: { id: 'u1', role: Role.STUDENT } });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
