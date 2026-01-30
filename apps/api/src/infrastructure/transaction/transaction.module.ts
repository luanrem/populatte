import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';

import {
  DrizzleModule,
  DRIZZLE_CLIENT,
} from '../database/drizzle/drizzle.module';

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
})
export class TransactionModule {}
