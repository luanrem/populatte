import { z } from 'zod';

import { BatchMode } from '../../core/entities/batch.entity';

export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode, {
    message: 'Mode must be either LIST_MODE or PROFILE_MODE',
  }),
});

export type CreateBatchDto = z.infer<typeof createBatchSchema>;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;

export const fieldValuesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
});

export type FieldValuesQueryDto = z.infer<typeof fieldValuesQuerySchema>;
