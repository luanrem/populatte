/**
 * TanStack Query Client Configuration
 *
 * Factory function for creating QueryClient instances with project-specific defaults.
 */

import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '../api/types';

/**
 * Create a new QueryClient with configured defaults.
 *
 * Defaults configured:
 * - Stale time: 1 minute (queries refetch after this period)
 * - Retry: Smart retry based on error type
 *   - No retry for 4xx errors (client errors are not transient)
 *   - Up to 3 retries for 5xx/network errors (server errors may recover)
 * - Retry delay: Exponential backoff (1s, 2s, 4s, 8s max)
 *
 * @returns New QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute

        // Smart retry: Don't retry client errors (4xx), do retry server/network errors
        retry: (failureCount: number, error: Error) => {
          // Never retry client errors (4xx) - these won't be fixed by retrying
          if (error instanceof ApiError) {
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
          }

          // Retry server errors and network errors up to 3 times
          return failureCount < 3;
        },

        // Exponential backoff: 1s, 2s, 4s, capped at 8s
        retryDelay: (attemptIndex: number) =>
          Math.min(1000 * 2 ** attemptIndex, 8000),
      },
    },
  });
}
