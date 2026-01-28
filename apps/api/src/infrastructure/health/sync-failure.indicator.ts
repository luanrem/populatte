import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class SyncFailureIndicator extends HealthIndicator {
  private syncFailures = 0;
  private syncAttempts = 0;
  private readonly failureThreshold = 0.05;

  public recordSyncAttempt(success: boolean): void {
    this.syncAttempts++;

    if (!success) {
      this.syncFailures++;
    }

    // Reset counters when reaching 1000 attempts (halve both to keep ratio)
    if (this.syncAttempts >= 1000) {
      this.syncAttempts = Math.floor(this.syncAttempts / 2);
      this.syncFailures = Math.floor(this.syncFailures / 2);
    }
  }

  public async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (this.syncAttempts === 0) {
      return this.getStatus(key, true, {
        syncAttempts: 0,
        syncFailures: 0,
        failureRate: '0.000',
      });
    }

    const failureRate = this.syncFailures / this.syncAttempts;
    const isHealthy = failureRate < this.failureThreshold;

    const result = this.getStatus(key, isHealthy, {
      syncAttempts: this.syncAttempts,
      syncFailures: this.syncFailures,
      failureRate: failureRate.toFixed(3),
    });

    if (!isHealthy) {
      throw new HealthCheckError('User sync check failed', result);
    }

    return result;
  }
}
