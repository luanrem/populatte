'use client';

import {
  mappingListResponseSchema,
  type MappingListResponse,
} from '../schemas/mapping.schema';

export function createMappingEndpoints(
  fetchFn: (endpoint: string, options?: RequestInit) => Promise<Response>,
) {
  return {
    async list(
      projectId: string,
      limit = 20,
      offset = 0,
    ): Promise<MappingListResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/mappings?limit=${limit}&offset=${offset}`,
      );
      const data: unknown = await response.json();

      const result = mappingListResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Mapping list response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid mapping list data received from server');
      }

      return result.data;
    },

    async remove(projectId: string, mappingId: string): Promise<void> {
      await fetchFn(`/projects/${projectId}/mappings/${mappingId}`, {
        method: 'DELETE',
      });
    },
  };
}
