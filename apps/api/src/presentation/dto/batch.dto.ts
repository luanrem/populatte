import { z } from 'zod';

import { BatchMode } from '../../core/entities/batch.entity';

export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode, {
    message: 'Mode must be either LIST_MODE or PROFILE_MODE',
  }),
});

export type CreateBatchDto = z.infer<typeof createBatchSchema>;
