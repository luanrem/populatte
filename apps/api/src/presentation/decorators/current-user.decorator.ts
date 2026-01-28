import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { User } from '../../core/entities/user.entity';
import { AuthenticatedRequest } from '../../infrastructure/auth/guards/clerk-auth.guard';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
