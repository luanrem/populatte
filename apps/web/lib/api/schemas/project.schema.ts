import { z } from 'zod';

export const projectUrlSchema = z.object({
  url: z.string().url('URL inválida'),
  isPrimary: z.boolean(),
  label: z.string().optional(),
});

export const projectResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetEntity: z.string().nullable(),
  urls: z.array(projectUrlSchema),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const projectListResponseSchema = z.array(projectResponseSchema);

export const projectSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetEntity: z.string().nullable(),
  urls: z.array(projectUrlSchema),
  status: z.enum(['active', 'archived']),
});

export const projectSummaryListResponseSchema = z.array(
  projectSummaryResponseSchema,
);

export const createProjectRequestSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  targetEntity: z.string().max(100).optional(),
  urls: z.array(projectUrlSchema).optional(),
});

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  targetEntity: z.string().max(100).nullable().optional(),
  urls: z.array(projectUrlSchema).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export type ProjectUrl = z.infer<typeof projectUrlSchema>;
export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectSummaryResponse = z.infer<
  typeof projectSummaryResponseSchema
>;
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
