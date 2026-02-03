import { z } from 'zod';

import { FillStatus } from '../../core/entities/row.entity';

export const updateRowStatusSchema = z
  .object({
    fillStatus: z.nativeEnum(FillStatus),
    fillErrorMessage: z.string().max(1000).nullish(),
    fillErrorStep: z.string().max(100).nullish(),
  })
  .refine(
    (data) => {
      // If not ERROR, error fields should be cleared
      if (data.fillStatus !== FillStatus.Error) {
        return true; // Allow clearing error fields
      }
      return true; // Allow ERROR without message (edge case)
    },
    {
      message: 'Error status should include error details',
    },
  );

export type UpdateRowStatusDto = z.infer<typeof updateRowStatusSchema>;
