import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/auth.types';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return data ? request.user?.[data] : request.user;
  },
);
