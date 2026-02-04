import { storage } from 'wxt/utils/storage';
import type { PreferencesState } from './types';
import { DEFAULT_PREFERENCES } from './types';

const PREFERENCES_KEY = 'local:populatte:preferences';

const preferencesItem = storage.defineItem<PreferencesState>(PREFERENCES_KEY, {
  fallback: DEFAULT_PREFERENCES,
});

/**
 * Preferences storage accessors
 */
export const preferencesStorage = {
  /**
   * Get preferences state
   */
  async getPreferences(): Promise<PreferencesState> {
    try {
      return await preferencesItem.getValue();
    } catch (error) {
      console.error('[Storage] Failed to get preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  },

  /**
   * Set preferences state
   */
  async setPreferences(preferences: PreferencesState): Promise<void> {
    try {
      await preferencesItem.setValue(preferences);
    } catch (error) {
      console.error('[Storage] Failed to set preferences:', error);
    }
  },

  /**
   * Get last project ID (for quick restore)
   */
  async getLastProjectId(): Promise<string | null> {
    const prefs = await this.getPreferences();
    return prefs.lastProjectId;
  },

  /**
   * Set last project ID
   */
  async setLastProjectId(projectId: string | null): Promise<void> {
    const current = await this.getPreferences();
    await this.setPreferences({
      ...current,
      lastProjectId: projectId,
    });
  },

  /**
   * Get last selected mapping ID for a project
   */
  async getLastMappingId(projectId: string): Promise<string | null> {
    const prefs = await this.getPreferences();
    return prefs.lastMappingIdByProject[projectId] ?? null;
  },

  /**
   * Set last selected mapping ID for a project
   */
  async setLastMappingId(projectId: string, mappingId: string | null): Promise<void> {
    const current = await this.getPreferences();
    const updated = { ...current.lastMappingIdByProject };

    if (mappingId === null) {
      delete updated[projectId];
    } else {
      updated[projectId] = mappingId;
    }

    await this.setPreferences({
      ...current,
      lastMappingIdByProject: updated,
    });
  },
};
