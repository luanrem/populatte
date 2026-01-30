'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../../api/client';
import { createBatchEndpoints } from '../../api/endpoints/batches';
import type {
  BatchListResponse,
  BatchResponse,
  PaginatedRowsResponse,
} from '../../api/schemas/batch.schema';

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

  return useMutation<BatchResponse, Error, FormData>({
    mutationFn: (formData) => endpoints.upload(projectId, formData),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'batches'],
      });
    },
  });
}
