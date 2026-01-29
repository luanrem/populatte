import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';

import { DrizzleModule } from '../database/drizzle/drizzle.module';
import { DrizzleService } from '../database/drizzle/drizzle.service';
import type { DrizzleClient } from '../database/drizzle/drizzle.types';

/**
 * Symbol token for Drizzle client used by transaction adapter
 * Prevents DI naming collisions with class-based DrizzleService
 */
export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

@Module({
  imports: [
    DrizzleModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [DrizzleModule],
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: DRIZZLE_CLIENT,
          }),
        }),
      ],
    }),
  ],
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      useFactory: (drizzleService: DrizzleService): DrizzleClient => {
        return drizzleService.getClient();
      },
      inject: [DrizzleService],
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class TransactionModule {}
