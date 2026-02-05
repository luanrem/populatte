'use client';

import {
  stepSchema,
  stepListSchema,
  type Step,
  type CreateStepRequest,
  type UpdateStepRequest,
  type ReorderStepsRequest,
} from '../schemas/step.schema';

export function createStepEndpoints(
  fetchFn: (endpoint: string, options?: RequestInit) => Promise<Response>,
) {
  return {
    async create(mappingId: string, data: CreateStepRequest): Promise<Step> {
      const response = await fetchFn(`/mappings/${mappingId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json: unknown = await response.json();
      const result = stepSchema.safeParse(json);
      if (!result.success) {
        console.error(
          '[API] Step create response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid step data received from server');
      }
      return result.data;
    },

    async update(
      mappingId: string,
      stepId: string,
      data: UpdateStepRequest,
    ): Promise<Step> {
      const response = await fetchFn(`/mappings/${mappingId}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json: unknown = await response.json();
      const result = stepSchema.safeParse(json);
      if (!result.success) {
        console.error(
          '[API] Step update response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid step data received from server');
      }
      return result.data;
    },

    async remove(mappingId: string, stepId: string): Promise<void> {
      await fetchFn(`/mappings/${mappingId}/steps/${stepId}`, {
        method: 'DELETE',
      });
    },

    async reorder(
      mappingId: string,
      data: ReorderStepsRequest,
    ): Promise<Step[]> {
      const response = await fetchFn(`/mappings/${mappingId}/steps/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json: unknown = await response.json();
      const result = stepListSchema.safeParse(json);
      if (!result.success) {
        console.error(
          '[API] Step reorder response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid step list data received from server');
      }
      return result.data;
    },
  };
}
