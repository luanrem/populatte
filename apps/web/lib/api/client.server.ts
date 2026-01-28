/**
 * Server-side API Client
 *
 * Fetch wrapper for server-side API calls (Server Components, Server Actions, Route Handlers)
 * with automatic Clerk token injection.
 *
 * No 401 retry logic - server tokens are always fresh from Clerk per-request.
 *
 * Usage in Server Components:
 * ```tsx
 * const apiClient = await createServerApiClient();
 * const response = await apiClient.fetch('/users/me');
 * ```
 *
 * Usage in Server Actions:
 * ```tsx
 * 'use server';
 * async function myAction() {
 *   const apiClient = await createServerApiClient();
 *   const response = await apiClient.fetch('/projects');
 * }
 * ```
 */

import { auth } from '@clerk/nextjs/server';

import { ApiError, type ApiRequestOptions } from './types';

/**
 * API Client interface for making authenticated requests.
 */
interface ServerApiClient {
  /**
   * Make an authenticated fetch request to the API.
   *
   * Automatically injects Authorization header with Clerk Bearer token.
   * No retry logic - server tokens are fresh per-request.
   *
   * @param endpoint - API endpoint path (e.g., '/users/me')
   * @param options - Request options (extends fetch RequestInit)
   * @returns Response object
   * @throws ApiError on non-ok responses
   */
  fetch(endpoint: string, options?: ApiRequestOptions): Promise<Response>;
}

/**
 * Create a server-side API client with Clerk token injection.
 *
 * Must be called in a server context (Server Component, Server Action, Route Handler).
 * Token is fetched fresh from Clerk for each request.
 *
 * @returns API client instance
 * @throws Error if not in server context
 *
 * @example
 * ```tsx
 * // Server Component
 * export default async function UserProfile() {
 *   const apiClient = await createServerApiClient();
 *   const response = await apiClient.fetch('/users/me');
 *   const user = await response.json();
 *
 *   return <div>{user.name}</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Server Action
 * 'use server';
 * export async function updateProject(projectId: string, data: unknown) {
 *   const apiClient = await createServerApiClient();
 *   const response = await apiClient.fetch(`/projects/${projectId}`, {
 *     method: 'PUT',
 *     body: JSON.stringify(data),
 *   });
 *   return response.json();
 * }
 * ```
 */
export async function createServerApiClient(): Promise<ServerApiClient> {
  const { getToken } = await auth();

  return {
    async fetch(
      endpoint: string,
      options: ApiRequestOptions = {},
    ): Promise<Response> {
      const { skipAuth, ...requestOptions } = options;

      // Get current token (fresh from Clerk)
      const token = skipAuth ? null : await getToken();

      // Prepare headers
      const headers = new Headers(requestOptions.headers);
      headers.set('Content-Type', 'application/json');

      if (token !== null) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Make request
      const url = `${process.env.API_URL}${endpoint}`;
      const response = await fetch(url, {
        ...requestOptions,
        headers,
      });

      // Handle non-ok responses
      if (!response.ok) {
        const errorBody = await response.json().catch(() => undefined);
        throw ApiError.fromResponse(response, errorBody);
      }

      return response;
    },
  };
}
