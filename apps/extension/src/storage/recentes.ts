import { storage } from 'wxt/utils/storage';
import type { RecentRowsState, RecentRowEntry } from './types';
import { DEFAULT_RECENT_ROWS } from './types';

const RECENT_ROWS_KEY = 'local:populatte:recentes';

const recentRowsItem = storage.defineItem<RecentRowsState>(RECENT_ROWS_KEY, {
  fallback: DEFAULT_RECENT_ROWS,
});

/**
 * Recent rows storage accessors
 * Manages navigation history per batch (max 10 entries with FIFO eviction)
 */
export const recentRowsStorage = {
  /**
   * Get recent row entries for a batch
   * @returns Array of entries, most recent first
   */
  async getEntries(batchId: string): Promise<RecentRowEntry[]> {
    try {
      const state = await recentRowsItem.getValue();
      return state.byBatch[batchId] ?? [];
    } catch (error) {
      console.error('[Storage] Failed to get recent rows:', error);
      return [];
    }
  },

  /**
   * Add a new entry to recent history
   * Deduplicates by rowIndex (removes old entry if exists)
   * Enforces max 10 entries per batch with FIFO eviction
   * @param batchId - Batch ID
   * @param entry - Entry to add (visitedAt will be set automatically)
   */
  async addEntry(
    batchId: string,
    entry: Omit<RecentRowEntry, 'visitedAt'>,
  ): Promise<void> {
    try {
      const state = await recentRowsItem.getValue();
      const currentEntries = state.byBatch[batchId] ?? [];

      // Remove existing entry with same rowIndex (deduplication)
      const filteredEntries = currentEntries.filter(
        (e) => e.rowIndex !== entry.rowIndex,
      );

      // Add new entry at the beginning with current timestamp
      const newEntry: RecentRowEntry = {
        ...entry,
        visitedAt: Date.now(),
      };
      filteredEntries.unshift(newEntry);

      // Enforce max 10 entries (FIFO eviction)
      if (filteredEntries.length > 10) {
        filteredEntries.splice(10);
      }

      // Update state
      await recentRowsItem.setValue({
        ...state,
        byBatch: {
          ...state.byBatch,
          [batchId]: filteredEntries,
        },
      });
    } catch (error) {
      console.error('[Storage] Failed to add recent row entry:', error);
    }
  },

  /**
   * Update status of an existing entry
   * @param batchId - Batch ID
   * @param rowIndex - Row index to update
   * @param status - New status
   */
  async updateStatus(
    batchId: string,
    rowIndex: number,
    status: 'success' | 'failed',
  ): Promise<void> {
    try {
      const state = await recentRowsItem.getValue();
      const currentEntries = state.byBatch[batchId] ?? [];

      // Find and update the entry
      const updatedEntries = currentEntries.map((entry) =>
        entry.rowIndex === rowIndex ? { ...entry, status } : entry,
      );

      // Only save if we found and modified an entry
      const hasChanged = updatedEntries.some(
        (entry, index) => entry !== currentEntries[index],
      );

      if (hasChanged) {
        await recentRowsItem.setValue({
          ...state,
          byBatch: {
            ...state.byBatch,
            [batchId]: updatedEntries,
          },
        });
      }
    } catch (error) {
      console.error('[Storage] Failed to update recent row status:', error);
    }
  },

  /**
   * Clear all recent rows for a batch
   * @param batchId - Batch ID
   */
  async clearForBatch(batchId: string): Promise<void> {
    try {
      const state = await recentRowsItem.getValue();
      const { [batchId]: _, ...remainingBatches } = state.byBatch;

      await recentRowsItem.setValue({
        byBatch: remainingBatches,
      });
    } catch (error) {
      console.error('[Storage] Failed to clear recent rows for batch:', error);
    }
  },

  /**
   * Get raw recent rows state
   */
  async getState(): Promise<RecentRowsState> {
    try {
      return await recentRowsItem.getValue();
    } catch (error) {
      console.error('[Storage] Failed to get recent rows state:', error);
      return DEFAULT_RECENT_ROWS;
    }
  },
};
