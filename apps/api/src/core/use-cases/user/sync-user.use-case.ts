import { Injectable } from '@nestjs/common';

import { User } from '../../entities/user.entity';
import { UserRepository } from '../../repositories/user.repository';

export interface SyncUserInput {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

@Injectable()
export class SyncUserUseCase {
  public constructor(private readonly userRepository: UserRepository) {}

  public async execute(input: SyncUserInput): Promise<User> {
    return this.userRepository.upsert({
      clerkId: input.clerkId,
      email: input.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      imageUrl: input.imageUrl ?? null,
    });
  }
}
