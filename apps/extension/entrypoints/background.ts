import { storage, initializeStorage } from '../src/storage';
import { broadcast } from '../src/messaging';
import { exchangeCode, getMe, fetchProjects, fetchBatches, fetchMappingsByUrl } from '../src/api';
import type { ExtensionState, PopupToBackgroundMessage } from '../src/types';

export default defineBackground(() => {
  console.log('[Populatte] Service worker initialized');

  // Eager initialization of storage (from Plan 24-02)
  initializeStorage().catch((err) => {
    console.error('[Populatte] Storage initialization failed:', err);
  });

  // ============================================================================
  // Module-level state for mapping detection
  // ============================================================================
  let currentMappingMatches: Array<{ id: string; name: string; stepCount: number }> = [];
  let hasMapping = false;
  let currentMappingId: string | null = null;
  let currentMappingName: string | null = null;

  // ============================================================================
  // Badge management
  // ============================================================================
  async function setBadge(count: number): Promise<void> {
    if (count > 0) {
      await browser.action.setBadgeText({ text: String(count) });
      await browser.action.setBadgeBackgroundColor({ color: '#22c55e' }); // Green
    } else {
      await browser.action.setBadgeText({ text: '' });
    }
  }

  async function clearBadge(): Promise<void> {
    await browser.action.setBadgeText({ text: '' });
  }

  // ============================================================================
  // Mapping detection
  // ============================================================================
  async function checkMappingForTab(tabId: number): Promise<void> {
    try {
      // Get current tab URL
      const tab = await browser.tabs.get(tabId);
      const currentUrl = tab.url;

      // Skip if no URL or special pages
      if (!currentUrl || currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
        await clearMappingState();
        return;
      }

      // Get selected projectId from storage
      const selection = await storage.selection.getSelection();
      const projectId = selection.projectId;

      // If no project selected, clear badge and return
      if (!projectId) {
        await clearMappingState();
        return;
      }

      // Fetch mappings matching the current URL
      const mappings = await fetchMappingsByUrl(projectId, currentUrl);

      // Filter to mappings with stepCount > 0 (no badge for empty mappings)
      const validMappings = mappings.filter((m) => m.stepCount > 0);

      if (validMappings.length === 0) {
        await clearMappingState();
        return;
      }

      // Store matches
      currentMappingMatches = validMappings.map((m) => ({
        id: m.id,
        name: m.name,
        stepCount: m.stepCount,
      }));
      hasMapping = true;

      // Try to auto-select last used mapping for this project
      const lastMappingId = await storage.preferences.getLastMappingId(projectId);
      const lastMatch = lastMappingId
        ? validMappings.find((m) => m.id === lastMappingId)
        : null;

      if (lastMatch) {
        currentMappingId = lastMatch.id;
        currentMappingName = lastMatch.name;
      } else if (validMappings.length === 1) {
        // Auto-select if only one mapping matches
        const singleMapping = validMappings[0];
        if (singleMapping) {
          currentMappingId = singleMapping.id;
          currentMappingName = singleMapping.name;
        }
      } else {
        // Multiple matches, no auto-select
        currentMappingId = null;
        currentMappingName = null;
      }

      // Set badge with count
      await setBadge(validMappings.length);

      // Broadcast state update
      await notifyStateUpdate();
    } catch (err) {
      console.error('[Background] checkMappingForTab error:', err);
      // On error, clear state but don't throw
      await clearMappingState();
    }
  }

  async function clearMappingState(): Promise<void> {
    currentMappingMatches = [];
    hasMapping = false;
    currentMappingId = null;
    currentMappingName = null;
    await clearBadge();
    await notifyStateUpdate();
  }

  // ============================================================================
  // Tab listeners for mapping detection
  // ============================================================================
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    await checkMappingForTab(activeInfo.tabId);
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
    // Only check on URL changes for the active tab
    if (changeInfo.url) {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id === tabId) {
        await checkMappingForTab(tabId);
      }
    }
  });

  // ============================================================================
  // State building and notification
  // ============================================================================
  async function buildState(): Promise<ExtensionState> {
    const [auth, selection] = await Promise.all([
      storage.auth.getAuth(),
      storage.selection.getSelection(),
    ]);

    return {
      isAuthenticated: auth.token !== null && !(await storage.auth.isExpired()),
      userEmail: auth.userEmail,
      projectId: selection.projectId,
      batchId: selection.batchId,
      rowIndex: selection.rowIndex,
      rowTotal: selection.rowTotal,
      fillStatus: 'idle',
      // Mapping state
      mappingId: currentMappingId,
      mappingName: currentMappingName,
      hasMapping,
      availableMappings: currentMappingMatches.map((m) => ({ id: m.id, name: m.name })),
    };
  }

  // Broadcast state update to popup
  async function notifyStateUpdate(): Promise<void> {
    const state = await buildState();
    broadcast({ type: 'STATE_UPDATED', payload: state });
  }

  // ============================================================================
  // Message handlers
  // ============================================================================
  browser.runtime.onMessage.addListener(
    (message: PopupToBackgroundMessage, _sender, sendResponse) => {
      console.log('[Background] Received message:', message.type);

      // Handle messages asynchronously
      (async () => {
        try {
          switch (message.type) {
            case 'PING': {
              sendResponse({ success: true, data: { pong: true, context: 'background' } });
              break;
            }

            case 'GET_STATE': {
              const state = await buildState();
              sendResponse({ success: true, data: state });
              break;
            }

            case 'GET_AUTH': {
              const auth = await storage.auth.getAuth();
              const isExpired = await storage.auth.isExpired();
              sendResponse({
                success: true,
                data: { token: auth.token, userId: auth.userId, userEmail: auth.userEmail, isExpired },
              });
              break;
            }

            case 'AUTH_LOGIN': {
              const { code } = message.payload;
              try {
                // Exchange code for token
                const { token } = await exchangeCode(code);

                // Get user info with the token
                const user = await getMe(token);

                // Store token with 30-day expiry
                const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
                await storage.auth.setToken(token, expiresAt);

                // Store user info
                await storage.auth.setUser(user.id, user.email);

                // Broadcast state update
                await notifyStateUpdate();

                sendResponse({ success: true });
              } catch (err) {
                console.error('[Background] AUTH_LOGIN error:', err);
                sendResponse({
                  success: false,
                  error: err instanceof Error ? err.message : 'Connection failed',
                });
              }
              break;
            }

            case 'AUTH_LOGOUT': {
              await storage.auth.clearAuth();
              await storage.selection.clearSelection();
              await clearMappingState();
              sendResponse({ success: true });
              break;
            }

            case 'GET_PROJECTS': {
              try {
                const projects = await fetchProjects();
                sendResponse({ success: true, data: { projects } });
              } catch (err) {
                console.error('[Background] GET_PROJECTS error:', err);
                sendResponse({
                  success: false,
                  error: err instanceof Error ? err.message : 'Failed to fetch projects',
                });
              }
              break;
            }

            case 'GET_BATCHES': {
              const { projectId } = message.payload;
              try {
                const allBatches = await fetchBatches(projectId);
                console.log('[Background] GET_BATCHES fetched:', allBatches);
                // Ensure allBatches is an array
                const batchesArray = Array.isArray(allBatches) ? allBatches : [];
                // Filter out completed batches (where all rows are done)
                // Per CONTEXT.md: Hide completed batches from dropdown
                const batches = batchesArray.filter((batch) => batch.doneCount < batch.rowCount);
                sendResponse({ success: true, data: { batches } });
              } catch (err) {
                console.error('[Background] GET_BATCHES error:', err);
                sendResponse({
                  success: false,
                  error: err instanceof Error ? err.message : 'Failed to fetch batches',
                });
              }
              break;
            }

            case 'PROJECT_SELECT': {
              const { projectId } = message.payload;
              await storage.selection.setSelectedProject(projectId);
              await storage.preferences.setLastProjectId(projectId);
              // Re-evaluate mapping for new project
              const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
              if (activeTab?.id !== undefined) {
                await checkMappingForTab(activeTab.id);
              } else {
                await notifyStateUpdate();
              }
              sendResponse({ success: true });
              break;
            }

            case 'BATCH_SELECT': {
              const { batchId, rowTotal } = message.payload;
              await storage.selection.setSelectedBatch(batchId, rowTotal);
              await notifyStateUpdate();
              sendResponse({ success: true });
              break;
            }

            case 'ROW_NEXT': {
              const newIndex = await storage.selection.nextRow();
              await notifyStateUpdate();
              sendResponse({ success: true, data: { rowIndex: newIndex } });
              break;
            }

            case 'ROW_PREV': {
              const newIndex = await storage.selection.prevRow();
              await notifyStateUpdate();
              sendResponse({ success: true, data: { rowIndex: newIndex } });
              break;
            }

            case 'MARK_ERROR': {
              // Stub implementation: Just advance to next row
              // Phase 29 will wire up actual PATCH /rows/:id/status API call
              const { reason } = message.payload;
              console.log('[Background] MARK_ERROR with reason:', reason ?? '(none)');
              const newIndex = await storage.selection.nextRow();
              await notifyStateUpdate();
              sendResponse({ success: true, data: { rowIndex: newIndex } });
              break;
            }

            case 'GET_MAPPINGS': {
              // Return current mapping matches
              sendResponse({
                success: true,
                data: {
                  mappings: currentMappingMatches.map((m) => ({ id: m.id, name: m.name })),
                  selectedId: currentMappingId,
                },
              });
              break;
            }

            case 'MAPPING_SELECT': {
              const { mappingId } = message.payload;
              const selection = await storage.selection.getSelection();
              const projectId = selection.projectId;

              // Find the mapping in current matches
              const mapping = currentMappingMatches.find((m) => m.id === mappingId);
              if (mapping) {
                currentMappingId = mapping.id;
                currentMappingName = mapping.name;

                // Store as last selected for this project
                if (projectId) {
                  await storage.preferences.setLastMappingId(projectId, mappingId);
                }

                await notifyStateUpdate();
                sendResponse({ success: true });
              } else {
                sendResponse({ success: false, error: 'Mapping not found in current matches' });
              }
              break;
            }

            default:
              console.log('[Background] Unhandled message type:', (message as { type: string }).type);
              sendResponse({ success: false, error: 'Unknown message type' });
          }
        } catch (err) {
          console.error('[Background] Handler error:', err);
          sendResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      })();

      // Return true to indicate we'll call sendResponse asynchronously
      return true;
    }
  );

  // Log when extension is installed or updated
  browser.runtime.onInstalled.addListener((details) => {
    console.log('[Populatte] Extension installed/updated:', details.reason);
  });
});
