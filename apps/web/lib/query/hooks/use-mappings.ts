'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../../api/client';
import { createMappingEndpoints } from '../../api/endpoints/mappings';
import type { MappingListResponse } from '../../api/schemas/mapping.schema';

export function useMappings(projectId: string, limit = 20, offset = 0) {
  const client = useApiClient();
  const endpoints = createMappingEndpoints(client.fetch);

  return useQuery<MappingListResponse>({
    queryKey: ['projects', projectId, 'mappings', { limit, offset }],
    queryFn: () => endpoints.list(projectId, limit, offset),
    enabled: !!projectId,
  });
}

export function useDeleteMapping(projectId: string) {
  const client = useApiClient();
  const endpoints = createMappingEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<void, Error, { mappingId: string }>({
    mutationFn: ({ mappingId }) => endpoints.remove(projectId, mappingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'mappings'],
      });
    },
  });
}
