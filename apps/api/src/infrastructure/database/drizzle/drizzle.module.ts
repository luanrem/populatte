import { Global, Module } from '@nestjs/common';

import { BatchRepository } from '../../../core/repositories/batch.repository';
import { ProjectRepository } from '../../../core/repositories/project.repository';
import { RowRepository } from '../../../core/repositories/row.repository';
import { UserRepository } from '../../../core/repositories/user.repository';

import { DrizzleService } from './drizzle.service';
import { DrizzleBatchRepository } from './repositories/drizzle-batch.repository';
import { DrizzleProjectRepository } from './repositories/drizzle-project.repository';
import { DrizzleRowRepository } from './repositories/drizzle-row.repository';
import { DrizzleUserRepository } from './repositories/drizzle-user.repository';

@Global()
@Module({
  providers: [
    DrizzleService,
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
    UserRepository,
    ProjectRepository,
    BatchRepository,
    RowRepository,
  ],
})
export class DrizzleModule {}
