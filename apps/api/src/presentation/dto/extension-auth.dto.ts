import { z } from 'zod';

export const generateCodeResponseSchema = z.object({
  code: z.string(),
  expiresIn: z.number(),
});

export const exchangeCodeSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
});

export const exchangeCodeResponseSchema = z.object({
  token: z.string(),
});

export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

export type GenerateCodeResponse = z.infer<typeof generateCodeResponseSchema>;
export type ExchangeCodeRequest = z.infer<typeof exchangeCodeSchema>;
export type ExchangeCodeResponse = z.infer<typeof exchangeCodeResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
