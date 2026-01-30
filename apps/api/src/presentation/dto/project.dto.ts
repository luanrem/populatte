import { z } from 'zod';

import { ProjectStatus } from '../../core/entities/project.entity';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  targetEntity: z.string().max(100).optional(),
  targetUrl: z.string().url().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  targetEntity: z.string().max(100).nullable().optional(),
  targetUrl: z.string().url().nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
