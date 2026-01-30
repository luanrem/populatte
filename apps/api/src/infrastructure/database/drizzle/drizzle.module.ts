import { Global, Module } from '@nestjs/common';

import { BatchRepository } from '../../../core/repositories/batch.repository';
import { ProjectRepository } from '../../../core/repositories/project.repository';
import { RowRepository } from '../../../core/repositories/row.repository';
import { UserRepository } from '../../../core/repositories/user.repository';

import { DrizzleService } from './drizzle.service';
import type { DrizzleClient } from './drizzle.types';
import { DrizzleBatchRepository } from './repositories/drizzle-batch.repository';
import { DrizzleProjectRepository } from './repositories/drizzle-project.repository';
import { DrizzleRowRepository } from './repositories/drizzle-row.repository';
import { DrizzleUserRepository } from './repositories/drizzle-user.repository';

/**
 * Symbol token for the raw Drizzle client instance.
 * Used by @nestjs-cls/transactional adapter to manage transactions.
 */
export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: DRIZZLE_CLIENT,
      useFactory: (drizzleService: DrizzleService): DrizzleClient => {
        return drizzleService.getClient();
      },
      inject: [DrizzleService],
    },
    {
      provide: UserRepository,
      useClass: DrizzleUserRepository,
    },
    {
      provide: ProjectRepository,
      useClass: DrizzleProjectRepository,
    },
    {
      provide: BatchRepository,
      useClass: DrizzleBatchRepository,
    },
    {
      provide: RowRepository,
      useClass: DrizzleRowRepository,
    },
  ],
  exports: [
    DrizzleService,
    DRIZZLE_CLIENT,
    UserRepository,
    ProjectRepository,
    BatchRepository,
    RowRepository,
  ],
})
export class DrizzleModule {}
