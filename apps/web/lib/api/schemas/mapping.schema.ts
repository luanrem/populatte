import { z } from 'zod';

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

export type MappingListItem = z.infer<typeof mappingListItemSchema>;
export type MappingListResponse = z.infer<typeof mappingListResponseSchema>;
