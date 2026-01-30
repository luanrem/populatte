/**
 * Client-side API Client
 *
 * Fetch wrapper for browser-based API calls with automatic Clerk token injection
 * and 401 retry logic with token refresh.
 *
 * Usage in React components:
 * ```tsx
 * const apiClient = useApiClient();
 * const response = await apiClient.fetch('/users/me');
 * ```
 *
 * Usage in callbacks/non-component contexts:
 * ```tsx
 * const { getToken } = useAuth();
 * const apiClient = createApiClient(getToken);
 * const response = await apiClient.fetch('/users/me');
 * ```
 */

'use client';

import { useAuth } from '@clerk/nextjs';

import { ApiError, type ApiRequestOptions } from './types';

/**
 * Options for Clerk's getToken function.
 */
interface GetTokenOptions {
  template?: string;
  organizationId?: string;
  leewayInSeconds?: number;
  skipCache?: boolean;
}

/**
 * Type for Clerk's getToken function.
 * Extracted from the return type of useAuth().getToken
 */
type GetToken = (options?: GetTokenOptions) => Promise<string | null>;

/**
 * API Client interface for making authenticated requests.
 */
interface ApiClient {
  /**
   * Make an authenticated fetch request to the API.
   *
   * Automatically injects Authorization header with Clerk Bearer token.
   * Retries once on 401 with token refresh.
   *
   * @param endpoint - API endpoint path (e.g., '/users/me')
   * @param options - Request options (extends fetch RequestInit)
   * @returns Response object
   * @throws ApiError on non-ok responses
   */
  fetch(endpoint: string, options?: ApiRequestOptions): Promise<Response>;
}

/**
 * Create an API client with Clerk token injection.
 *
 * Factory function for use in non-component contexts (callbacks, event handlers).
 * Call this inside a callback where hooks can't be used.
 *
 * @param getToken - Function to get Clerk auth token (accepts options for token refresh)
 * @returns API client instance
 */
export function createApiClient(getToken: GetToken): ApiClient {
  return {
    async fetch(
      endpoint: string,
      options: ApiRequestOptions = {},
    ): Promise<Response> {
      const { skipAuth, ...requestOptions } = options;

      // Get current token
      const token = skipAuth ? null : await getToken();

      // Prepare headers
      const headers = new Headers(requestOptions.headers);
      if (!(requestOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }

      if (token !== null) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // Make initial request
      const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
      let response = await fetch(url, {
        ...requestOptions,
        headers,
      });

      // Handle 401 with token refresh and retry
      if (response.status === 401 && !skipAuth) {
        // Refresh token - skip cache to force a fresh token from Clerk's servers
        const refreshedToken = await getToken({ skipCache: true });

        if (refreshedToken === null) {
          // Token refresh failed - throw error to trigger redirect
          const errorBody = await response.json().catch(() => undefined);
          throw ApiError.fromResponse(response, errorBody);
        }

        // Retry with refreshed token
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        response = await fetch(url, {
          ...requestOptions,
          headers,
        });

        // If retry also fails with 401, throw error (caller handles redirect)
        if (response.status === 401) {
          const errorBody = await response.json().catch(() => undefined);
          throw ApiError.fromResponse(response, errorBody);
        }
      }

      // Handle other non-ok responses
      if (!response.ok) {
        const errorBody = await response.json().catch(() => undefined);
        throw ApiError.fromResponse(response, errorBody);
      }

      return response;
    },
  };
}

/**
 * React hook for API client with Clerk authentication.
 *
 * Use this in React components for automatic token injection and refresh.
 *
 * @returns API client instance
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const apiClient = useApiClient();
 *
 *   async function loadUser() {
 *     const response = await apiClient.fetch('/users/me');
 *     const user = await response.json();
 *     console.log(user);
 *   }
 *
 *   return <button onClick={loadUser}>Load User</button>;
 * }
 * ```
 */
export function useApiClient(): ApiClient {
  const { getToken } = useAuth();

  // Create client with stable getToken reference
  // getToken from useAuth is stable and can be safely used in the client
  return createApiClient(getToken);
}
