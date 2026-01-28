/**
 * Error Toast Hook
 *
 * React hook for displaying API errors as toast notifications.
 */

'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api/error-handler';

/**
 * Hook to automatically show toast notifications for API errors.
 *
 * Watches an error object and displays a toast when the error is truthy.
 * Uses the error handler to generate user-friendly error messages.
 *
 * @param error - The error object to watch (typically from TanStack Query)
 * @param message - The primary error message to display
 *
 * @example
 * ```tsx
 * function ProfileComponent() {
 *   const { data, error } = useMe();
 *   useApiErrorToast(error, 'Could not load your profile');
 *
 *   if (!data) return null;
 *   return <div>{data.firstName}</div>;
 * }
 * ```
 */
export function useApiErrorToast(error: Error | null, message: string): void {
  useEffect(() => {
    if (error) {
      toast.error(message, {
        description: getErrorMessage(error),
      });
    }
  }, [error, message]);
}
