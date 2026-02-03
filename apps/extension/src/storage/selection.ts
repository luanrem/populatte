import { storage } from 'wxt/storage';
import type { SelectionState } from './types';
import { DEFAULT_SELECTION } from './types';

const SELECTION_KEY = 'local:populatte:selection';

const selectionItem = storage.defineItem<SelectionState>(SELECTION_KEY, {
  fallback: DEFAULT_SELECTION,
});

/**
 * Selection storage accessors
 */
export const selectionStorage = {
  /**
   * Get current selection state
   */
  async getSelection(): Promise<SelectionState> {
    try {
      return await selectionItem.getValue();
    } catch (error) {
      console.error('[Storage] Failed to get selection:', error);
      return DEFAULT_SELECTION;
    }
  },

  /**
   * Set selection state (full replacement)
   */
  async setSelection(selection: SelectionState): Promise<void> {
    try {
      await selectionItem.setValue(selection);
    } catch (error) {
      console.error('[Storage] Failed to set selection:', error);
    }
  },

  /**
   * Get selected project ID
   */
  async getSelectedProject(): Promise<string | null> {
    const selection = await this.getSelection();
    return selection.projectId;
  },

  /**
   * Set selected project (clears batch/row selection)
   */
  async setSelectedProject(projectId: string | null): Promise<void> {
    await this.setSelection({
      projectId,
      batchId: null,
      rowIndex: 0,
      rowTotal: 0,
    });
  },

  /**
   * Get selected batch ID
   */
  async getSelectedBatch(): Promise<string | null> {
    const selection = await this.getSelection();
    return selection.batchId;
  },

  /**
   * Set selected batch (resets row index)
   */
  async setSelectedBatch(batchId: string | null, rowTotal: number = 0): Promise<void> {
    const current = await this.getSelection();
    await this.setSelection({
      ...current,
      batchId,
      rowIndex: 0,
      rowTotal,
    });
  },

  /**
   * Get current row index
   */
  async getRowIndex(): Promise<number> {
    const selection = await this.getSelection();
    return selection.rowIndex;
  },

  /**
   * Set current row index
   */
  async setRowIndex(rowIndex: number): Promise<void> {
    const current = await this.getSelection();
    await this.setSelection({
      ...current,
      rowIndex: Math.max(0, Math.min(rowIndex, current.rowTotal - 1)),
    });
  },

  /**
   * Advance to next row
   */
  async nextRow(): Promise<number> {
    const current = await this.getSelection();
    const newIndex = Math.min(current.rowIndex + 1, current.rowTotal - 1);
    await this.setRowIndex(newIndex);
    return newIndex;
  },

  /**
   * Go to previous row
   */
  async prevRow(): Promise<number> {
    const current = await this.getSelection();
    const newIndex = Math.max(current.rowIndex - 1, 0);
    await this.setRowIndex(newIndex);
    return newIndex;
  },

  /**
   * Clear selection state
   */
  async clearSelection(): Promise<void> {
    await this.setSelection(DEFAULT_SELECTION);
  },
};
