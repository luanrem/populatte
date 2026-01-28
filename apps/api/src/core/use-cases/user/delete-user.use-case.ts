import { Injectable } from '@nestjs/common';

import { UserRepository } from '../../repositories/user.repository';

@Injectable()
export class DeleteUserUseCase {
  public constructor(private readonly userRepository: UserRepository) {}

  public async execute(clerkId: string): Promise<void> {
    await this.userRepository.delete(clerkId);
  }
}
