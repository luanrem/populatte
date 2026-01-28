import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

import { clerkConfig } from '../config/clerk.config';

export interface ClerkTokenPayload {
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);

  public constructor(
    @Inject(clerkConfig.KEY)
    private readonly config: ConfigType<typeof clerkConfig>,
  ) {}

  public async verifySessionToken(
    token: string,
  ): Promise<ClerkTokenPayload | null> {
    try {
      if (!this.config.secretKey) {
        throw new Error('Clerk secret key is not configured');
      }

      const result = await verifyToken(token, {
        secretKey: this.config.secretKey,
      });

      return {
        sub: result.sub,
        email: result.email as string,
        firstName: result.firstName as string | undefined,
        lastName: result.lastName as string | undefined,
        imageUrl: result.imageUrl as string | undefined,
      };
    } catch (error) {
      this.logger.warn('Token verification failed', error);
      return null;
    }
  }

  public getWebhookSigningSecret(): string {
    if (!this.config.webhookSigningSecret) {
      throw new Error('Clerk webhook signing secret is not configured');
    }
    return this.config.webhookSigningSecret;
  }
}
