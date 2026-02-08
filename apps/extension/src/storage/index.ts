/**
 * Storage Module
 *
 * Provides type-safe storage accessors for the extension.
 * Uses WXT's storage.defineItem() API over chrome.storage.local.
 *
 * Usage:
 *   import { storage } from '@/storage';
 *   const auth = await storage.auth.getAuth();
 *   await storage.selection.setSelectedProject('project-123');
 */

export * from './types';
export { authStorage } from './auth';
export { selectionStorage } from './selection';
export { preferencesStorage } from './preferences';
export { recentRowsStorage } from './recentes';

import { authStorage } from './auth';
import { selectionStorage } from './selection';
import { preferencesStorage } from './preferences';
import { recentRowsStorage } from './recentes';

/**
 * Unified storage accessor
 * Provides namespaced access to all storage domains
 */
export const storage = {
  auth: authStorage,
  selection: selectionStorage,
  preferences: preferencesStorage,
  recentes: recentRowsStorage,
};

/**
 * Initialize storage with eager load
 * Called on service worker startup to warm cache
 *
 * Per CONTEXT.md: Eager initialization - load full state into memory when service worker starts
 */
export async function initializeStorage(): Promise<void> {
  console.log('[Storage] Initializing...');

  // Pre-load all storage values to verify they're accessible
  const [auth, selection, preferences, recentRows] = await Promise.all([
    authStorage.getAuth(),
    selectionStorage.getSelection(),
    preferencesStorage.getPreferences(),
    recentRowsStorage.getState(),
  ]);

  console.log('[Storage] Initialized:', {
    authenticated: auth.token !== null,
    hasProject: selection.projectId !== null,
    lastProject: preferences.lastProjectId,
    recentBatches: Object.keys(recentRows.byBatch).length,
  });
}
