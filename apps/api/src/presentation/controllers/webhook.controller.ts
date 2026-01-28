import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Webhook } from 'svix';

import { DeleteUserUseCase, SyncUserUseCase } from '../../core/use-cases/user';
import { ClerkService } from '../../infrastructure/auth/clerk.service';
import { ClerkWebhookEvent } from '../dto/clerk-webhook.dto';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  public constructor(
    private readonly clerkService: ClerkService,
    private readonly syncUserUseCase: SyncUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Post('clerk')
  @HttpCode(200)
  public async handleClerkWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ): Promise<{ success: boolean }> {
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing svix headers');
    }

    const webhookSecret = this.clerkService.getWebhookSigningSecret();
    const webhook = new Webhook(webhookSecret);

    let event: ClerkWebhookEvent;

    try {
      event = webhook.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (error) {
      this.logger.error('Failed to verify webhook signature', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Clerk webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'user.created':
        case 'user.updated':
          await this.syncUserUseCase.execute({
            clerkId: event.data.id,
            email: event.data.email_addresses[0]?.email_address ?? '',
            firstName: event.data.first_name,
            lastName: event.data.last_name,
            imageUrl: event.data.image_url,
          });
          this.logger.log(`User synced: ${event.data.id}`);
          break;

        case 'user.deleted':
          await this.deleteUserUseCase.execute(event.data.id);
          this.logger.log(`User deleted: ${event.data.id}`);
          break;

        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${event.type}`, error);
      throw error;
    }

    return { success: true };
  }
}
