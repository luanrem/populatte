/**
 * API Error Handler Utilities
 *
 * Pure functions for classifying and formatting API errors.
 * Used by API clients and UI components for consistent error handling.
 */

import { ApiError } from './types';

/**
 * Check if an error is an authentication error (401 Unauthorized).
 *
 * @param error - The error to check
 * @returns True if the error is a 401 ApiError
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/**
 * Check if an error is a sync failure (503 Service Unavailable).
 *
 * This indicates the ClerkAuthGuard detected a sync failure while
 * attempting to sync the user from Clerk to the local database.
 *
 * @param error - The error to check
 * @returns True if the error is a 503 ApiError
 */
export function isSyncError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}

/**
 * Check if an error is retryable.
 *
 * Returns true for 5xx server errors and network errors.
 * Returns false for 4xx client errors (these indicate a problem with the request itself).
 *
 * @param error - The error to check
 * @returns True if the request should be retried
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors (fetch failures) are retryable
  if (error instanceof TypeError) {
    return true;
  }

  // 5xx server errors are retryable
  if (error instanceof ApiError) {
    return error.status >= 500 && error.status < 600;
  }

  return false;
}

/**
 * Get a user-friendly error message for display in the UI.
 *
 * Maps technical errors to human-readable messages that help users
 * understand what went wrong and what they can do about it.
 *
 * @param error - The error to format
 * @returns A user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  // Handle ApiError instances with specific status codes
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return 'The requested resource was not found.';
      case 503:
        return 'Syncing your account, please wait...';
      default:
        // Other 5xx errors
        if (error.status >= 500 && error.status < 600) {
          return 'Something went wrong. Please try again later.';
        }
        // Other 4xx errors
        if (error.status >= 400 && error.status < 500) {
          return 'The request could not be completed. Please check your input and try again.';
        }
    }
  }

  // Network errors (fetch failures)
  if (error instanceof TypeError) {
    return 'Unable to connect. Please check your internet connection.';
  }

  // Generic fallback
  return 'An unexpected error occurred.';
}
