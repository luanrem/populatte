import { registerAs } from '@nestjs/config';

export const clerkConfig = registerAs('clerk', () => ({
  secretKey: process.env['CLERK_SECRET_KEY'],
  publishableKey: process.env['CLERK_PUBLISHABLE_KEY'],
  webhookSigningSecret: process.env['CLERK_WEBHOOK_SIGNING_SECRET'],
}));

export type ClerkConfig = ReturnType<typeof clerkConfig>;
