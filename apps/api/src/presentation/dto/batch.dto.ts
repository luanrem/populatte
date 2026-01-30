import { z } from 'zod';

import { BatchMode } from '../../core/entities/batch.entity';

export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode),
});

export type CreateBatchDto = z.infer<typeof createBatchSchema>;
