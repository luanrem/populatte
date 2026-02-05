'use client';

import {
  mappingDetailSchema,
  mappingListResponseSchema,
  type MappingDetail,
  type MappingListResponse,
  type UpdateMappingRequest,
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

    async getById(
      projectId: string,
      mappingId: string,
    ): Promise<MappingDetail> {
      const response = await fetchFn(
        `/projects/${projectId}/mappings/${mappingId}`,
      );
      const data: unknown = await response.json();

      const result = mappingDetailSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Mapping detail response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid mapping data received from server');
      }

      return result.data;
    },

    async update(
      projectId: string,
      mappingId: string,
      data: UpdateMappingRequest,
    ): Promise<MappingDetail> {
      const response = await fetchFn(
        `/projects/${projectId}/mappings/${mappingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      const json: unknown = await response.json();

      const result = mappingDetailSchema.safeParse(json);

      if (!result.success) {
        console.error(
          '[API] Mapping update response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid mapping data received from server');
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
