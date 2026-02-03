/**
 * Response Types
 *
 * Per CONTEXT.md: Return error objects: `{ success: false, error: 'message' }`
 * Caller decides how to display errors.
 */

import type { ExtensionState, StepResult } from './messages';

/**
 * Base response wrapper
 */
export type Response<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Void response (for commands that don't return data)
 */
export type VoidResponse =
  | { success: true }
  | { success: false; error: string };

// ============================================================================
// Specific Response Types
// ============================================================================

export type AuthResponse = Response<{
  token: string | null;
  userId: string | null;
  userEmail: string | null;
  isExpired: boolean;
}>;

export type ProjectsResponse = Response<{
  projects: ProjectSummary[];
}>;

export interface ProjectSummary {
  id: string;
  name: string;
  batchCount: number;
}

export type BatchesResponse = Response<{
  batches: BatchSummary[];
}>;

export interface BatchSummary {
  id: string;
  name: string;
  filename: string;
  rowCount: number;
  createdAt: string;
}

export type RowsResponse = Response<{
  rows: RowData[];
  total: number;
  page: number;
}>;

export interface RowData {
  id: string;
  rowNumber: number;
  data: Record<string, unknown>;
  fillStatus?: string;
}

export type StateResponse = Response<ExtensionState>;

export type FillResponse = Response<{
  stepResults: StepResult[];
}>;

export type PingResponse = Response<{
  pong: true;
  context: 'background' | 'content';
}>;
