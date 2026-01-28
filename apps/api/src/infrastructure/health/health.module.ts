import { Global, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { SyncFailureIndicator } from './sync-failure.indicator';

@Global()
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [SyncFailureIndicator],
  exports: [SyncFailureIndicator],
})
export class HealthModule {}
