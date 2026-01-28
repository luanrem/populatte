import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env['SUPABASE_URL'],
  poolSize: parseInt(process.env['DATABASE_POOL_SIZE'] ?? '10', 10),
}));
