import { Controller, Get, UseGuards } from '@nestjs/common';

import type { User } from '../../core/entities/user.entity';
import { ClerkAuthGuard } from '../../infrastructure/auth/guards/clerk-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UserController {
  @Get('me')
  public getMe(@CurrentUser() user: User): User {
    return user;
  }
}
