import { storage } from 'wxt/utils/storage';
import type { AuthState } from './types';
import { DEFAULT_AUTH } from './types';

const AUTH_KEY = 'local:populatte:auth';

const authItem = storage.defineItem<AuthState>(AUTH_KEY, {
  fallback: DEFAULT_AUTH,
});

/**
 * Auth storage accessors
 */
export const authStorage = {
  /**
   * Get current auth state
   */
  async getAuth(): Promise<AuthState> {
    try {
      return await authItem.getValue();
    } catch (error) {
      console.error('[Storage] Failed to get auth:', error);
      return DEFAULT_AUTH;
    }
  },

  /**
   * Set auth state (full replacement)
   */
  async setAuth(auth: AuthState): Promise<void> {
    try {
      await authItem.setValue(auth);
    } catch (error) {
      console.error('[Storage] Failed to set auth:', error);
    }
  },

  /**
   * Update auth token
   */
  async setToken(token: string, expiresAt: number): Promise<void> {
    const current = await this.getAuth();
    await this.setAuth({
      ...current,
      token,
      expiresAt,
    });
  },

  /**
   * Set user info after token validation
   */
  async setUser(userId: string, userEmail: string): Promise<void> {
    const current = await this.getAuth();
    await this.setAuth({
      ...current,
      userId,
      userEmail,
    });
  },

  /**
   * Clear auth state (logout)
   */
  async clearAuth(): Promise<void> {
    await this.setAuth(DEFAULT_AUTH);
  },

  /**
   * Check if token is expired
   */
  async isExpired(): Promise<boolean> {
    const auth = await this.getAuth();
    if (!auth.token || !auth.expiresAt) {
      return true;
    }
    // Consider expired if less than 1 minute remaining
    return Date.now() > auth.expiresAt - 60000;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const auth = await this.getAuth();
    return auth.token !== null && !(await this.isExpired());
  },
};
