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
  // API returns: { items: [...], total, limit, offset }
  // Each item has: { id, name, filename, totalRows, createdAt, updatedAt }
  // For MVP: totalRows as rowCount, 0 as done (progress calculation deferred to Phase 29)
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

  return items.map((batch: {
    id: string;
    name: string;
    filename: string | null;
    totalRows?: number;
    rowCount?: number;
    createdAt: string;
  }) => {
    const rowCount = batch.totalRows ?? batch.rowCount ?? 0;
    return {
      id: batch.id,
      name: batch.name,
      filename: batch.filename ?? batch.name,
      rowCount,
      createdAt: batch.createdAt,
      // MVP: No progress tracking yet - all rows considered pending
      pendingCount: rowCount,
      doneCount: 0,
    };
  });
}
