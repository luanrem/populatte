import { z } from 'zod';

export const fieldValuesResponseSchema = z.object({
  values: z.array(z.string()),
  matchingCount: z.number(),
  totalDistinctCount: z.number(),
});

export type FieldValuesResponse = z.infer<typeof fieldValuesResponseSchema>;
