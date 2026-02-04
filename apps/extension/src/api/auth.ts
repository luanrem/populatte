/**
 * Auth API Functions
 *
 * Functions for the extension authentication flow.
 * Uses plain fetch (not fetchWithAuth) since these are for initial auth.
 */

import { API_BASE_URL } from './client';

/**
 * Exchange connection code for JWT token
 *
 * @param code - 6-digit connection code from web app
 * @returns Object with token on success
 * @throws Error with specific message from API on failure
 */
export async function exchangeCode(code: string): Promise<{ token: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/extension-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    // Try to parse error message from API
    try {
      const errorData = await response.json();
      const message = errorData.message || errorData.error || 'Connection failed';
      throw new Error(message);
    } catch (e) {
      // If JSON parsing fails, use status text
      if (e instanceof Error && e.message !== 'Connection failed') {
        throw e;
      }
      throw new Error(`Connection failed: ${response.statusText}`);
    }
  }

  const data = await response.json();
  return { token: data.token };
}

/**
 * Get current user info using token
 *
 * @param token - JWT token
 * @returns User info object
 * @throws Error on failure
 */
export async function getMe(token: string): Promise<{
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}> {
  const response = await fetch(`${API_BASE_URL}/auth/extension-me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const message = errorData.message || errorData.error || 'Failed to get user info';
      throw new Error(message);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Failed to get user info') {
        throw e;
      }
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }
  }

  return response.json();
}
