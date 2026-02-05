'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../../api/client';
import { createStepEndpoints } from '../../api/endpoints/steps';
import type {
  CreateStepRequest,
  Step,
  UpdateStepRequest,
} from '../../api/schemas/step.schema';

export function useCreateStep(projectId: string, mappingId: string) {
  const client = useApiClient();
  const endpoints = createStepEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<Step, Error, CreateStepRequest>({
    mutationFn: (data) => endpoints.create(mappingId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'mappings', mappingId],
      });
    },
  });
}

export function useUpdateStep(projectId: string, mappingId: string) {
  const client = useApiClient();
  const endpoints = createStepEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<Step, Error, { stepId: string; data: UpdateStepRequest }>({
    mutationFn: ({ stepId, data }) => endpoints.update(mappingId, stepId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'mappings', mappingId],
      });
    },
  });
}

export function useDeleteStep(projectId: string, mappingId: string) {
  const client = useApiClient();
  const endpoints = createStepEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<void, Error, { stepId: string }>({
    mutationFn: ({ stepId }) => endpoints.remove(mappingId, stepId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'mappings', mappingId],
      });
    },
  });
}

export function useReorderSteps(projectId: string, mappingId: string) {
  const client = useApiClient();
  const endpoints = createStepEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<Step[], Error, string[]>({
    mutationFn: (orderedStepIds) =>
      endpoints.reorder(mappingId, { orderedStepIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'mappings', mappingId],
      });
    },
  });
}
