import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { databaseConfig } from '../../config/database.config';
import * as schema from './schema';
import type { DrizzleClient } from './drizzle.types';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private pool: Pool;
  private client: DrizzleClient;

  public constructor(
    @Inject(databaseConfig.KEY)
    private readonly config: ConfigType<typeof databaseConfig>,
  ) {
    if (!this.config.url) {
      throw new Error('DATABASE_URL is not configured');
    }

    this.pool = new Pool({
      connectionString: this.config.url,
      max: this.config.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.client = drizzle(this.pool, { schema });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  public getClient(): DrizzleClient {
    return this.client;
  }
}
