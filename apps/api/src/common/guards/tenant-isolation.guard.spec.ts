import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantIsolationGuard } from './tenant-isolation.guard';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

describe('TenantIsolationGuard', () => {
  let guard: TenantIsolationGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      membership: {
        findUnique: vi.fn(),
      },
    } as any;
    guard = new TenantIsolationGuard(reflector, prisma);
  });

  const createMockContext = (request: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any);

  it('allows public routes', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext({});
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('allows SuperAdmin universal cross-tenant access', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({
      user: { id: 'u1', isSuperAdmin: true },
      tenantId: 'any-org-id',
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('allows user accessing their own active tenant', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({
      user: { id: 'u1', isSuperAdmin: false, activeOrganizationId: 'org-klh' },
      tenantId: 'org-klh',
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('throws ForbiddenException when user attempts to access another tenant without membership', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (prisma.membership.findUnique as any).mockResolvedValue(null);

    const context = createMockContext({
      user: { id: 'u1', isSuperAdmin: false, activeOrganizationId: 'org-klh' },
      tenantId: 'org-abc',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
