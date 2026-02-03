import { storage, initializeStorage } from '../src/storage';
import { broadcast } from '../src/messaging';
import type { ExtensionState, PopupToBackgroundMessage } from '../src/types';

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

  // Register message listener with simple handler
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

            case 'AUTH_LOGOUT': {
              await storage.auth.clearAuth();
              await storage.selection.clearSelection();
              await notifyStateUpdate();
              sendResponse({ success: true });
              break;
            }

            case 'PROJECT_SELECT': {
              const { projectId } = message.payload;
              await storage.selection.setSelectedProject(projectId);
              await storage.preferences.setLastProjectId(projectId);
              await notifyStateUpdate();
              sendResponse({ success: true });
              break;
            }

            case 'BATCH_SELECT': {
              const { batchId } = message.payload;
              await storage.selection.setSelectedBatch(batchId, 0);
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
