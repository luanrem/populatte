import { Global, Module } from '@nestjs/common';

import { UserRepository } from '../../../core/repositories/user.repository';

import { DrizzleService } from './drizzle.service';
import { DrizzleUserRepository } from './repositories/drizzle-user.repository';

@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: UserRepository,
      useClass: DrizzleUserRepository,
    },
  ],
  exports: [DrizzleService, UserRepository],
})
export class DrizzleModule {}
