import { storage, initializeStorage } from '../src/storage';
import { createMessageRouter, success, error, broadcast } from '../src/messaging';
import type { ExtensionState, PingResponse, StateResponse, AuthResponse } from '../src/types';

export default defineBackground(() => {
  console.log('[Populatte] Service worker initialized');

  // Eager initialization of storage (from Plan 24-02)
  initializeStorage().catch((err) => {
    console.error('[Populatte] Storage initialization failed:', err);
  });

  // Build current state from storage
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
    };
  }

  // Broadcast state update to popup
  async function notifyStateUpdate(): Promise<void> {
    const state = await buildState();
    broadcast({ type: 'STATE_UPDATED', payload: state });
  }

  // Create message router with handlers
  const router = createMessageRouter({
    // Ping handler (for testing connectivity)
    PING: async () => {
      return success({ pong: true, context: 'background' }) as PingResponse;
    },

    // Get current extension state
    GET_STATE: async () => {
      const state = await buildState();
      return success(state) as StateResponse;
    },

    // Get auth state
    GET_AUTH: async () => {
      const auth = await storage.auth.getAuth();
      const isExpired = await storage.auth.isExpired();
      return success({
        token: auth.token,
        userId: auth.userId,
        userEmail: auth.userEmail,
        isExpired,
      }) as AuthResponse;
    },

    // Logout
    AUTH_LOGOUT: async () => {
      await storage.auth.clearAuth();
      await storage.selection.clearSelection();
      await notifyStateUpdate();
      return success(undefined);
    },

    // Project selection
    PROJECT_SELECT: async (message) => {
      const { projectId } = message.payload;
      await storage.selection.setSelectedProject(projectId);
      await storage.preferences.setLastProjectId(projectId);
      await notifyStateUpdate();
      return success(undefined);
    },

    // Batch selection
    BATCH_SELECT: async (message) => {
      const { batchId } = message.payload;
      // TODO: Fetch row count from API in Phase 27
      await storage.selection.setSelectedBatch(batchId, 0);
      await notifyStateUpdate();
      return success(undefined);
    },

    // Row navigation
    ROW_NEXT: async () => {
      const newIndex = await storage.selection.nextRow();
      await notifyStateUpdate();
      return success({ rowIndex: newIndex });
    },

    ROW_PREV: async () => {
      const newIndex = await storage.selection.prevRow();
      await notifyStateUpdate();
      return success({ rowIndex: newIndex });
    },
  });

  // Register message listener
  browser.runtime.onMessage.addListener(router);

  // Log when extension is installed or updated
  browser.runtime.onInstalled.addListener((details) => {
    console.log('[Populatte] Extension installed/updated:', details.reason);
  });
});
