import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';

import { User } from '../../core/entities/user.entity';
import { UserRepository } from '../../core/repositories/user.repository';
import { ClerkAuthGuard } from '../../infrastructure/auth/guards/clerk-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

interface CurrentUserPayload {
  clerkId: string;
}

@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UserController {
  public constructor(private readonly userRepository: UserRepository) {}

  @Get('me')
  public async getMe(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<User> {
    const user = await this.userRepository.findByClerkId(currentUser.clerkId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
