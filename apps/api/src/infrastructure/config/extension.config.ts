import { registerAs } from '@nestjs/config';

export const extensionConfig = registerAs('extension', () => ({
  jwtSecret: process.env['EXTENSION_JWT_SECRET'],
  jwtExpiry: process.env['EXTENSION_JWT_EXPIRY'] ?? '30d',
}));

export type ExtensionConfig = ReturnType<typeof extensionConfig>;
