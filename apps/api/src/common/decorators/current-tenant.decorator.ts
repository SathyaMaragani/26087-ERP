import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppRequest } from '../types/request-context';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    return request.tenantId || request.user?.activeOrganizationId;
  },
);
