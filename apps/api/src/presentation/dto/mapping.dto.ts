import { z } from 'zod';

import { SuccessTrigger } from '../../core/entities/mapping.entity';

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

// Create mapping schema
export const createMappingSchema = z.object({
  name: z.string().min(3).max(100),
  targetUrl: z.string().url(),
  successTrigger: successTriggerSchema,
  successConfig: successConfigSchema,
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
