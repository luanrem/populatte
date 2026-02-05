import { z } from 'zod';

export const selectorTypeSchema = z.enum(['css', 'xpath']);
export const stepActionSchema = z.enum(['fill', 'click', 'wait', 'verify']);

export const selectorEntrySchema = z.object({
  type: selectorTypeSchema,
  value: z.string(),
});

export const stepSchema = z.object({
  id: z.string(),
  mappingId: z.string(),
  action: stepActionSchema,
  selector: selectorEntrySchema,
  selectorFallbacks: z.array(selectorEntrySchema),
  sourceFieldKey: z.string().nullable(),
  fixedValue: z.string().nullable(),
  stepOrder: z.number(),
  optional: z.boolean(),
  clearBefore: z.boolean(),
  pressEnter: z.boolean(),
  waitMs: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const stepListSchema = z.array(stepSchema);

export const createStepRequestSchema = z.object({
  action: stepActionSchema,
  selector: selectorEntrySchema,
  selectorFallbacks: z.array(selectorEntrySchema).optional(),
  sourceFieldKey: z.string().nullable().optional(),
  fixedValue: z.string().nullable().optional(),
  optional: z.boolean().optional(),
  clearBefore: z.boolean().optional(),
  pressEnter: z.boolean().optional(),
  waitMs: z.number().nullable().optional(),
});

export const updateStepRequestSchema = createStepRequestSchema.partial();

export const reorderStepsRequestSchema = z.object({
  orderedStepIds: z.array(z.string()),
});

export type SelectorType = z.infer<typeof selectorTypeSchema>;
export type StepAction = z.infer<typeof stepActionSchema>;
export type SelectorEntry = z.infer<typeof selectorEntrySchema>;
export type Step = z.infer<typeof stepSchema>;
export type CreateStepRequest = z.infer<typeof createStepRequestSchema>;
export type UpdateStepRequest = z.infer<typeof updateStepRequestSchema>;
export type ReorderStepsRequest = z.infer<typeof reorderStepsRequestSchema>;
