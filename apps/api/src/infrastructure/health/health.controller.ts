import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { SyncFailureIndicator } from './sync-failure.indicator';

@Controller('health')
export class HealthController {
  public constructor(
    private readonly health: HealthCheckService,
    private readonly syncFailure: SyncFailureIndicator,
  ) {}

  @Get()
  @HealthCheck()
  public async check() {
    return this.health.check([() => this.syncFailure.isHealthy('user-sync')]);
  }
}
