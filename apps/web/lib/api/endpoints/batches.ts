'use client';

import {
  batchListResponseSchema,
  batchResponseSchema,
  paginatedRowsResponseSchema,
  uploadBatchResponseSchema,
  type BatchListResponse,
  type BatchResponse,
  type PaginatedRowsResponse,
  type UploadBatchResponse,
} from '../schemas/batch.schema';
import {
  fieldStatsResponseSchema,
  type FieldStatsResponse,
} from '../schemas/field-stats.schema';
import {
  fieldValuesResponseSchema,
  type FieldValuesResponse,
} from '../schemas/field-values.schema';

export function createBatchEndpoints(
  fetchFn: (endpoint: string, options?: RequestInit) => Promise<Response>,
) {
  return {
    async list(
      projectId: string,
      limit = 50,
      offset = 0,
    ): Promise<BatchListResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/batches?limit=${limit}&offset=${offset}`,
      );
      const data: unknown = await response.json();

      const result = batchListResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Batch list response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid batch list data received from server');
      }

      return result.data;
    },

    async getById(
      projectId: string,
      batchId: string,
    ): Promise<BatchResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/batches/${batchId}`,
      );
      const data: unknown = await response.json();

      const result = batchResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Batch response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid batch data received from server');
      }

      return result.data;
    },

    async listRows(
      projectId: string,
      batchId: string,
      limit = 50,
      offset = 0,
    ): Promise<PaginatedRowsResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/batches/${batchId}/rows?limit=${limit}&offset=${offset}`,
      );
      const data: unknown = await response.json();

      const result = paginatedRowsResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Paginated rows response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid rows data received from server');
      }

      return result.data;
    },

    async upload(
      projectId: string,
      formData: FormData,
    ): Promise<UploadBatchResponse> {
      const response = await fetchFn(`/projects/${projectId}/batches`, {
        method: 'POST',
        body: formData,
      });
      const data: unknown = await response.json();

      const result = uploadBatchResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Upload batch response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid batch data received from server');
      }

      return result.data;
    },

    async getFieldStats(
      projectId: string,
      batchId: string,
    ): Promise<FieldStatsResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/batches/${batchId}/field-stats`,
      );
      const data: unknown = await response.json();

      const result = fieldStatsResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Field stats response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid field stats data received from server');
      }

      return result.data;
    },

    async getFieldValues(
      projectId: string,
      batchId: string,
      fieldKey: string,
      params: { limit: number; offset: number; search?: string },
    ): Promise<FieldValuesResponse> {
      let url = `/projects/${projectId}/batches/${batchId}/fields/${encodeURIComponent(fieldKey)}/values?limit=${params.limit}&offset=${params.offset}`;

      if (params.search) {
        url += `&search=${encodeURIComponent(params.search)}`;
      }

      const response = await fetchFn(url);
      const data: unknown = await response.json();

      const result = fieldValuesResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] Field values response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid field values data received from server');
      }

      return result.data;
    },
  };
}
