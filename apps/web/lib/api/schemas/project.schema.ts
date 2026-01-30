import { z } from 'zod';

export const projectResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetEntity: z.string().nullable(),
  targetUrl: z.string().nullable(),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const projectListResponseSchema = z.array(projectResponseSchema);

export const createProjectRequestSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  targetEntity: z.string().max(100).optional(),
  targetUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

export const updateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  targetEntity: z.string().max(100).nullable().optional(),
  targetUrl: z
    .string()
    .url('URL inválida')
    .nullable()
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'archived']).optional(),
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
