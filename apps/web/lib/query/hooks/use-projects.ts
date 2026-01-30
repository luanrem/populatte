'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../../api/client';
import { createProjectEndpoints } from '../../api/endpoints/projects';
import type {
  ProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '../../api/schemas/project.schema';

export function useProjects() {
  const client = useApiClient();
  const endpoints = createProjectEndpoints(client.fetch);

  return useQuery<ProjectResponse[]>({
    queryKey: ['projects'],
    queryFn: () => endpoints.list(),
  });
}

export function useProject(id: string) {
  const client = useApiClient();
  const endpoints = createProjectEndpoints(client.fetch);

  return useQuery<ProjectResponse>({
    queryKey: ['projects', id],
    queryFn: () => endpoints.getById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const client = useApiClient();
  const endpoints = createProjectEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<ProjectResponse, Error, CreateProjectRequest>({
    mutationFn: (data) => endpoints.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const client = useApiClient();
  const endpoints = createProjectEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<
    ProjectResponse,
    Error,
    { id: string; data: UpdateProjectRequest }
  >({
    mutationFn: ({ id, data }) => endpoints.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const client = useApiClient();
  const endpoints = createProjectEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => endpoints.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
