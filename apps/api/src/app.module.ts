import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SyncUserUseCase, DeleteUserUseCase } from './core/use-cases/user';
import { clerkConfig, databaseConfig } from './infrastructure/config';
import { AuthModule } from './infrastructure/auth/auth.module';
import { DrizzleModule } from './infrastructure/database/drizzle/drizzle.module';
import { WebhookController, UserController } from './presentation/controllers';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [clerkConfig, databaseConfig],
    }),
    DrizzleModule,
    AuthModule,
  ],
  controllers: [AppController, WebhookController, UserController],
  providers: [AppService, SyncUserUseCase, DeleteUserUseCase],
})
export class AppModule {}
