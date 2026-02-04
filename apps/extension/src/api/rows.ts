/**
 * Rows API Functions
 *
 * Functions for fetching row data from the backend.
 * Uses fetchWithAuth for authenticated requests.
 */

import { API_BASE_URL, fetchWithAuth } from './client';

/**
 * Row data returned by the API
 */
export interface RowData {
  id: string;
  data: Record<string, unknown>;
  fillStatus: 'PENDING' | 'VALID' | 'ERROR';
}

/**
 * Fetch a single row by index from a batch
 *
 * Uses the paginated rows endpoint with limit=1 and offset=rowIndex.
 * This retrieves the row at the specified index position (0-based).
 *
 * @param projectId - Project ID
 * @param batchId - Batch ID to fetch row from
 * @param rowIndex - Row index (0-based)
 * @returns Row data for the specified index
 * @throws Error if row not found (offset out of bounds) or on API failure
 */
export async function fetchRowByIndex(
  projectId: string,
  batchId: string,
  rowIndex: number
): Promise<RowData> {
  const params = new URLSearchParams({
    limit: '1',
    offset: String(rowIndex),
  });

  const response = await fetchWithAuth(
    `${API_BASE_URL}/projects/${projectId}/batches/${batchId}/rows?${params.toString()}`
  );

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const message = errorData.message || errorData.error || 'Failed to fetch row';
      throw new Error(message);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Failed to fetch row') {
        throw e;
      }
      throw new Error(`Failed to fetch row: ${response.statusText}`);
    }
  }

  const data = await response.json();

  // API returns: { items: [...], total, limit, offset }
  const items = Array.isArray(data.items) ? data.items : [];

  if (items.length === 0) {
    throw new Error(`Row not found at index ${rowIndex}`);
  }

  const row = items[0] as {
    id: string;
    data: Record<string, unknown>;
    fillStatus: string;
  };

  return {
    id: row.id,
    data: row.data,
    fillStatus: row.fillStatus as 'PENDING' | 'VALID' | 'ERROR',
  };
}

/**
 * Update row fill status
 *
 * @param projectId - Project ID (for ownership validation)
 * @param batchId - Batch ID containing the row
 * @param rowId - Row ID to update
 * @param status - New fill status (PENDING, VALID, ERROR)
 * @param errorMessage - Optional error message (only for ERROR status)
 * @param errorStep - Optional step ID that failed (only for ERROR status)
 */
export async function updateRowStatus(
  projectId: string,
  batchId: string,
  rowId: string,
  status: 'PENDING' | 'VALID' | 'ERROR',
  errorMessage?: string,
  errorStep?: string
): Promise<void> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/projects/${projectId}/batches/${batchId}/rows/${rowId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        fillStatus: status,
        ...(errorMessage !== undefined && { fillErrorMessage: errorMessage }),
        ...(errorStep !== undefined && { fillErrorStep: errorStep }),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message ?? `Failed to update row status: ${response.status}`
    );
  }
}
