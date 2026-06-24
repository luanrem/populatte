import { z } from 'zod';

import { ProjectStatus } from '../../core/entities/project.entity';

export const projectUrlSchema = z.object({
  url: z.string().url(),
  isPrimary: z.boolean().optional(),
  label: z.string().max(100).optional(),
});

const projectUrlsSchema = z
  .array(projectUrlSchema)
  .refine(
    (urls) => urls.filter((entry) => entry.isPrimary === true).length <= 1,
    { message: 'At most one URL can be marked as primary' },
  );

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  targetEntity: z.string().max(100).optional(),
  urls: projectUrlsSchema.optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  targetEntity: z.string().max(100).nullable().optional(),
  urls: projectUrlsSchema.optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
