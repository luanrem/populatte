import { z } from 'zod';

import { SelectorType, StepAction } from '../../core/entities/step.entity';

// Reusable selector entry schema
const selectorEntrySchema = z.object({
  type: z.nativeEnum(SelectorType),
  value: z.string().min(1),
});

// Create step schema
export const createStepSchema = z
  .object({
    action: z.nativeEnum(StepAction),
    selector: selectorEntrySchema,
    selectorFallbacks: z.array(selectorEntrySchema).optional(),
    sourceFieldKey: z.string().min(1).optional(),
    fixedValue: z.string().optional(),
    optional: z.boolean().optional(),
    clearBefore: z.boolean().optional(),
    pressEnter: z.boolean().optional(),
    waitMs: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      // Reject if BOTH sourceFieldKey AND fixedValue are provided (non-empty)
      const hasSourceFieldKey =
        data.sourceFieldKey !== undefined && data.sourceFieldKey !== '';
      const hasFixedValue =
        data.fixedValue !== undefined && data.fixedValue !== '';
      return !(hasSourceFieldKey && hasFixedValue);
    },
    {
      message: 'Cannot provide both sourceFieldKey and fixedValue',
    },
  );

// Update step schema (all fields optional)
export const updateStepSchema = z
  .object({
    action: z.nativeEnum(StepAction).optional(),
    selector: selectorEntrySchema.optional(),
    selectorFallbacks: z.array(selectorEntrySchema).optional(),
    sourceFieldKey: z.string().min(1).nullable().optional(),
    fixedValue: z.string().nullable().optional(),
    optional: z.boolean().optional(),
    clearBefore: z.boolean().optional(),
    pressEnter: z.boolean().optional(),
    waitMs: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (data) => {
      // Reject if BOTH sourceFieldKey AND fixedValue are provided (non-null)
      const hasSourceFieldKey =
        data.sourceFieldKey !== undefined &&
        data.sourceFieldKey !== null &&
        data.sourceFieldKey !== '';
      const hasFixedValue =
        data.fixedValue !== undefined &&
        data.fixedValue !== null &&
        data.fixedValue !== '';
      return !(hasSourceFieldKey && hasFixedValue);
    },
    {
      message: 'Cannot provide both sourceFieldKey and fixedValue',
    },
  );

// Reorder steps schema
export const reorderStepsSchema = z
  .object({
    orderedStepIds: z.array(z.string().uuid()).min(1),
  })
  .refine(
    (data) => {
      // Reject duplicate IDs
      const uniqueIds = new Set(data.orderedStepIds);
      return uniqueIds.size === data.orderedStepIds.length;
    },
    {
      message: 'Duplicate step IDs in orderedStepIds',
    },
  );

export type CreateStepDto = z.infer<typeof createStepSchema>;
export type UpdateStepDto = z.infer<typeof updateStepSchema>;
export type ReorderStepsDto = z.infer<typeof reorderStepsSchema>;
