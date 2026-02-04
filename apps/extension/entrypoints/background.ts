import { storage, initializeStorage } from '../src/storage';
import { broadcast } from '../src/messaging';
import { exchangeCode, getMe, fetchProjects, fetchBatches } from '../src/api';
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
              await notifyStateUpdate();
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
                // Filter out completed batches (where all rows are done)
                // Per CONTEXT.md: Hide completed batches from dropdown
                const batches = allBatches.filter((batch) => batch.doneCount < batch.rowCount);
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
