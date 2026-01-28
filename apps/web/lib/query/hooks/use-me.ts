/**
 * User Data Hook
 *
 * TanStack Query hook for fetching the current user's profile data.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '../../api/client';
import { createUserEndpoints } from '../../api/endpoints/users';
import type { UserResponse } from '../../api/schemas/user.schema';

/**
 * Hook to fetch the current authenticated user's profile.
 *
 * Uses TanStack Query for caching, background refetching, and automatic retries.
 * The query is cached with a 5-minute stale time since user profile data rarely changes.
 *
 * @returns Query result with user data, loading state, and error state
 *
 * @example
 * ```tsx
 * function ProfileComponent() {
 *   const { data: user, isLoading, error } = useMe();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error loading profile</div>;
 *   if (!user) return null;
 *
 *   return <div>Welcome, {user.firstName}</div>;
 * }
 * ```
 */
export function useMe() {
  const client = useApiClient();
  const endpoints = createUserEndpoints(client.fetch);

  return useQuery<UserResponse>({
    queryKey: ['me'],
    queryFn: () => endpoints.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes - user profile changes infrequently
  });
}
