'use client';

import {
  projectResponseSchema,
  projectSummaryListResponseSchema,
  type ProjectResponse,
  type ProjectSummaryResponse,
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from '../schemas/project.schema';

export function createProjectEndpoints(
  fetchFn: (endpoint: string, options?: RequestInit) => Promise<Response>,
) {
  return {
    async list(): Promise<ProjectSummaryResponse[]> {
      const response = await fetchFn('/projects');
      const data: unknown = await response.json();

      const result = projectSummaryListResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Project list response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid project list data received from server');
      }

      return result.data;
    },

    async getById(id: string): Promise<ProjectResponse> {
      const response = await fetchFn(`/projects/${id}`);
      const data: unknown = await response.json();

      const result = projectResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Project response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid project data received from server');
      }

      return result.data;
    },

    async create(body: CreateProjectRequest): Promise<ProjectResponse> {
      const response = await fetchFn('/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data: unknown = await response.json();

      const result = projectResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Create project response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid project data received from server');
      }

      return result.data;
    },

    async update(
      id: string,
      body: UpdateProjectRequest,
    ): Promise<ProjectResponse> {
      const response = await fetchFn(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const data: unknown = await response.json();

      const result = projectResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Update project response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid project data received from server');
      }

      return result.data;
    },

    async remove(id: string): Promise<void> {
      await fetchFn(`/projects/${id}`, {
        method: 'DELETE',
      });
    },
  };
}
