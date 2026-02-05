import { z } from 'zod';

import { SuccessTrigger } from '../../core/entities/mapping.entity';
import { SelectorType, StepAction } from '../../core/entities/step.entity';

// Helper: coerce empty string to null before enum validation
const successTriggerSchema = z.preprocess(
  (val) => (val === '' ? null : val),
  z.nativeEnum(SuccessTrigger).nullable().optional(),
);

const successConfigSchema = z
  .object({
    selector: z.string().optional(),
  })
  .nullable()
  .optional();

// Inline step schema for mapping creation (same as createStepSchema but embedded)
const inlineStepSchema = z
  .object({
    action: z.nativeEnum(StepAction),
    selector: z.object({
      type: z.nativeEnum(SelectorType),
      value: z.string().min(1),
    }),
    selectorFallbacks: z
      .array(
        z.object({
          type: z.nativeEnum(SelectorType),
          value: z.string().min(1),
        }),
      )
      .optional(),
    sourceFieldKey: z.string().min(1).nullable().optional(),
    fixedValue: z.string().nullable().optional(),
    optional: z.boolean().optional(),
    clearBefore: z.boolean().optional(),
    pressEnter: z.boolean().optional(),
    waitMs: z.number().int().min(0).nullable().optional(),
    stepOrder: z.number().int().min(1).optional(),
  })
  .refine(
    (data) => {
      // Reject if BOTH sourceFieldKey AND fixedValue are provided (non-null, non-empty)
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

// Create mapping schema - now supports inline steps
export const createMappingSchema = z.object({
  name: z.string().min(3).max(100),
  targetUrl: z.string().url(),
  successTrigger: successTriggerSchema,
  successConfig: successConfigSchema,
  isActive: z.boolean().optional(),
  steps: z.array(inlineStepSchema).optional(),
});

// Update mapping schema (all fields optional)
export const updateMappingSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  targetUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  successTrigger: successTriggerSchema,
  successConfig: successConfigSchema,
});

// List query schema with pagination and optional URL filter
export const listMappingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  targetUrl: z.string().url().optional(), // optional filter for extension lookup
  isActive: z.coerce.boolean().optional(), // optional filter (default: show all non-deleted)
});

export type CreateMappingDto = z.infer<typeof createMappingSchema>;
export type UpdateMappingDto = z.infer<typeof updateMappingSchema>;
export type ListMappingsQueryDto = z.infer<typeof listMappingsQuerySchema>;
