import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser, AppRequest } from '../types/request-context';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
