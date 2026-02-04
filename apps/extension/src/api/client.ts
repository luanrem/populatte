/**
 * API Client
 *
 * Core utilities for making API requests from the extension.
 * Handles authentication headers and 401 response handling.
 */

import { storage } from '../storage';
import { broadcast } from '../messaging';

/**
 * API base URL for the backend
 * Hardcoded for development - extensions don't have .env files like web apps
 */
export const API_BASE_URL = 'http://localhost:3001';

/**
 * Fetch with authentication
 *
 * Adds Authorization header with JWT token from storage.
 * Handles 401 responses by clearing auth and broadcasting state update.
 *
 * @param url - Full URL to fetch
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Fetch response for successful calls
 * @throws Error('Not authenticated') if no token in storage
 * @throws Error('SESSION_EXPIRED') on 401 response
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = await storage.auth.getAuth();

  if (!auth.token) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${auth.token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token invalid or expired - clear auth and notify
    await storage.auth.clearAuth();
    const state = await buildExpiredState();
    broadcast({ type: 'STATE_UPDATED', payload: state });
    throw new Error('SESSION_EXPIRED');
  }

  return response;
}

/**
 * Build state object for expired session broadcast
 */
async function buildExpiredState() {
  const selection = await storage.selection.getSelection();

  return {
    isAuthenticated: false,
    userEmail: null,
    projectId: selection.projectId,
    batchId: selection.batchId,
    rowIndex: selection.rowIndex,
    rowTotal: selection.rowTotal,
    fillStatus: 'idle' as const,
  };
}
