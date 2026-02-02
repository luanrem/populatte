'use client';

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../../api/client';
import { createBatchEndpoints } from '../../api/endpoints/batches';
import type {
  BatchListResponse,
  BatchResponse,
  PaginatedRowsResponse,
  UploadBatchResponse,
} from '../../api/schemas/batch.schema';
import type { FieldStatsResponse } from '../../api/schemas/field-stats.schema';
import type { FieldValuesResponse } from '../../api/schemas/field-values.schema';

export function useBatches(projectId: string, limit = 50, offset = 0) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<BatchListResponse>({
    queryKey: ['projects', projectId, 'batches'],
    queryFn: () => endpoints.list(projectId, limit, offset),
    enabled: !!projectId,
  });
}

export function useBatch(projectId: string, batchId: string) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<BatchResponse>({
    queryKey: ['projects', projectId, 'batches', batchId],
    queryFn: () => endpoints.getById(projectId, batchId),
    enabled: !!projectId && !!batchId,
  });
}

export function useBatchRows(
  projectId: string,
  batchId: string,
  limit = 50,
  offset = 0,
) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<PaginatedRowsResponse>({
    queryKey: ['projects', projectId, 'batches', batchId, 'rows', { limit, offset }],
    queryFn: () => endpoints.listRows(projectId, batchId, limit, offset),
    enabled: !!projectId && !!batchId,
    placeholderData: keepPreviousData,
  });
}

export function useUploadBatch(projectId: string) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<UploadBatchResponse, Error, FormData>({
    mutationFn: (formData) => endpoints.upload(projectId, formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'batches'],
      });
    },
  });
}

export function useFieldStats(projectId: string, batchId: string) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<FieldStatsResponse>({
    queryKey: ['projects', projectId, 'batches', batchId, 'field-stats'],
    queryFn: () => endpoints.getFieldStats(projectId, batchId),
    enabled: !!projectId && !!batchId,
  });
}

export function useFieldValuesInfinite(
  projectId: string,
  batchId: string,
  fieldKey: string,
  search?: string,
) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useInfiniteQuery<FieldValuesResponse>({
    queryKey: ['projects', projectId, 'batches', batchId, 'field-values', fieldKey, { search }],
    queryFn: ({ pageParam }) =>
      endpoints.getFieldValues(projectId, batchId, fieldKey, {
        limit: 50,
        offset: pageParam as number,
        search: search || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.values.length, 0);
      return loadedCount < lastPage.matchingCount ? loadedCount : undefined;
    },
    enabled: !!projectId && !!batchId && !!fieldKey,
  });
}
