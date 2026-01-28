/**
 * User API Endpoints
 *
 * Functions for interacting with user-related API endpoints.
 * All responses are validated with Zod schemas at runtime.
 */

'use client';

import { userResponseSchema, type UserResponse } from '../schemas/user.schema';

/**
 * Create user endpoint functions with a provided fetch function.
 *
 * This factory pattern allows endpoints to work with both the hook-based
 * client (useApiClient) and the factory-based client (createApiClient).
 *
 * @param fetchFn - The fetch function from an API client
 * @returns Object containing user endpoint functions
 */
export function createUserEndpoints(
  fetchFn: (endpoint: string, options?: RequestInit) => Promise<Response>,
) {
  return {
    /**
     * Get the currently authenticated user's profile.
     *
     * @returns User profile data
     * @throws ApiError on request failure
     * @throws Error on schema validation failure
     */
    async getMe(): Promise<UserResponse> {
      const response = await fetchFn('/users/me');
      const data: unknown = await response.json();

      const result = userResponseSchema.safeParse(data);

      if (!result.success) {
        console.error(
          '[API] User response validation failed:',
          result.error.issues,
        );
        throw new Error('Invalid user data received from server');
      }

      return result.data;
    },
  };
}
