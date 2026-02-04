/**
 * Storage Types
 *
 * Storage is organized into three flat sections:
 * - auth: Authentication state (token, user info)
 * - selection: Current project/batch/row selection
 * - preferences: User preferences
 *
 * Each section is persisted independently in chrome.storage.local
 */

/**
 * Authentication state
 * Persisted to survive browser restarts
 */
export interface AuthState {
  /** JWT token from extension auth flow */
  token: string | null;
  /** User ID from Populatte API */
  userId: string | null;
  /** User email for display */
  userEmail: string | null;
  /** Token expiry timestamp (ms since epoch) */
  expiresAt: number | null;
}

/**
 * Current selection state
 * Persisted to restore user's last position
 */
export interface SelectionState {
  /** Currently selected project ID */
  projectId: string | null;
  /** Currently selected batch ID */
  batchId: string | null;
  /** Current row index within batch (0-based) */
  rowIndex: number;
  /** Total rows in current batch (cached) */
  rowTotal: number;
}

/**
 * User preferences
 * Persisted across sessions
 */
export interface PreferencesState {
  /** Last used project ID (for quick restore) */
  lastProjectId: string | null;
  /** Last selected mapping ID per project (maps projectId to mappingId) */
  lastMappingIdByProject: Record<string, string>;
}

/**
 * Default values for storage initialization
 */
export const DEFAULT_AUTH: AuthState = {
  token: null,
  userId: null,
  userEmail: null,
  expiresAt: null,
};

export const DEFAULT_SELECTION: SelectionState = {
  projectId: null,
  batchId: null,
  rowIndex: 0,
  rowTotal: 0,
};

export const DEFAULT_PREFERENCES: PreferencesState = {
  lastProjectId: null,
  lastMappingIdByProject: {},
};
