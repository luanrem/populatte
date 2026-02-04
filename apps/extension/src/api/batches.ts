/**
 * Batches API Functions
 *
 * Functions for fetching batch data from the backend.
 * Uses fetchWithAuth for authenticated requests.
 */

import { API_BASE_URL, fetchWithAuth } from './client';
import type { BatchWithProgress } from '../types/responses';

/**
 * Fetch all batches for a project with progress info
 *
 * @param projectId - Project ID to fetch batches for
 * @returns Array of batches with progress information
 * @throws Error on network or API failure
 */
export async function fetchBatches(projectId: string): Promise<BatchWithProgress[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/projects/${projectId}/batches`);

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const message = errorData.message || errorData.error || 'Failed to fetch batches';
      throw new Error(message);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Failed to fetch batches') {
        throw e;
      }
      throw new Error(`Failed to fetch batches: ${response.statusText}`);
    }
  }

  const data = await response.json();

  // Map API response to BatchWithProgress format
  // API returns: { id, name, filename, rowCount, createdAt, updatedAt }
  // For MVP: rowCount as total, 0 as done (progress calculation deferred to Phase 29)
  return data.map(
    (batch: {
      id: string;
      name: string;
      filename: string | null;
      rowCount: number;
      createdAt: string;
    }) => ({
      id: batch.id,
      name: batch.name,
      filename: batch.filename ?? batch.name,
      rowCount: batch.rowCount,
      createdAt: batch.createdAt,
      // MVP: No progress tracking yet - all rows considered pending
      pendingCount: batch.rowCount,
      doneCount: 0,
    })
  );
}
