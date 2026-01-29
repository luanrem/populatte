import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SyncUserUseCase, DeleteUserUseCase } from './core/use-cases/user';
import {
  clerkConfig,
  databaseConfig,
  envValidationSchema,
} from './infrastructure/config';
import { AuthModule } from './infrastructure/auth/auth.module';
import { DrizzleModule } from './infrastructure/database/drizzle/drizzle.module';
import { IngestionModule } from './infrastructure/excel/ingestion.module';
import { TransactionModule } from './infrastructure/transaction/transaction.module';
import { HealthModule } from './infrastructure/health/health.module';
import { ProjectModule } from './infrastructure/project/project.module';
import { WebhookController, UserController } from './presentation/controllers';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [clerkConfig, databaseConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors
        allowUnknown: true, // Allow other env vars
      },
    }),
    DrizzleModule,
    TransactionModule,
    IngestionModule,
    AuthModule,
    HealthModule,
    ProjectModule,
  ],
  controllers: [AppController, WebhookController, UserController],
  providers: [AppService, SyncUserUseCase, DeleteUserUseCase],
})
export class AppModule {}
