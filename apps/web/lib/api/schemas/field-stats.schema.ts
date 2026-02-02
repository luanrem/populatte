import { z } from 'zod';

export const inferredTypeSchema = z.enum([
  'STRING',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'UNKNOWN',
]);

export const fieldStatsItemSchema = z.object({
  fieldName: z.string(),
  presenceCount: z.number(),
  uniqueCount: z.number(),
  inferredType: inferredTypeSchema,
  confidence: z.number(),
  sampleValues: z.array(z.unknown()),
});

export const fieldStatsResponseSchema = z.object({
  totalRows: z.number(),
  fields: z.array(fieldStatsItemSchema),
});

export type InferredType = z.infer<typeof inferredTypeSchema>;
export type FieldStatsItem = z.infer<typeof fieldStatsItemSchema>;
export type FieldStatsResponse = z.infer<typeof fieldStatsResponseSchema>;
