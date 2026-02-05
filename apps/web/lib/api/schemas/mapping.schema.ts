import { z } from 'zod';

import { stepSchema } from './step.schema';

// Individual mapping in list
export const mappingListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetUrl: z.string(),
  isActive: z.boolean(),
  stepCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// List response with pagination
export const mappingListResponseSchema = z.object({
  items: z.array(mappingListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// Success trigger and config for mapping detail
export const successTriggerSchema = z.enum([
  'url_change',
  'text_appears',
  'element_disappears',
]);

export const successConfigSchema = z.object({
  selector: z.string().optional(),
});

// Single mapping with steps (detail view)
export const mappingDetailSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  targetUrl: z.string(),
  isActive: z.boolean(),
  successTrigger: successTriggerSchema.nullable(),
  successConfig: successConfigSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  steps: z.array(stepSchema),
});

// Update mapping request
export const updateMappingRequestSchema = z.object({
  name: z.string().optional(),
  targetUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  successTrigger: successTriggerSchema.nullable().optional(),
  successConfig: successConfigSchema.nullable().optional(),
});

export type MappingListItem = z.infer<typeof mappingListItemSchema>;
export type MappingListResponse = z.infer<typeof mappingListResponseSchema>;
export type SuccessTrigger = z.infer<typeof successTriggerSchema>;
export type SuccessConfig = z.infer<typeof successConfigSchema>;
export type MappingDetail = z.infer<typeof mappingDetailSchema>;
export type UpdateMappingRequest = z.infer<typeof updateMappingRequestSchema>;
