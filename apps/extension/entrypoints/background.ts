import { storage, initializeStorage } from '../src/storage';
import { exchangeCode, getMe, fetchProjects, fetchBatches, fetchMappingsByUrl, fetchMappingWithSteps, fetchRowByIndex, updateRowStatus, fetchBatchDetail } from '../src/api';
import type { ExtensionState, PopupToBackgroundMessage, ContentToBackgroundMessage, FillStatus, SuccessDetectedMessage } from '../src/types';

// ============================================================================
// Per-Tab State Interface
// ============================================================================
interface TabState {
  /** Mapping matches for this tab's URL */
  mappingMatches: Array<{ id: string; name: string; stepCount: number }>;
  hasMapping: boolean;
  currentMappingId: string | null;
  currentMappingName: string | null;
  /** Fill tracking */
  fillStatus: FillStatus;
  /** Batch identifier fields */
  identifierFieldKey: string | null;
  secondaryFieldKey: string | null;
  currentRowData: Record<string, unknown> | null;
}

export default defineBackground(() => {
  console.log('[Populatte] Service worker initialized');

  // Eager initialization of storage (from Plan 24-02)
  initializeStorage().catch((err) => {
    console.error('[Populatte] Storage initialization failed:', err);
  });

  // Enable Side Panel on icon click (replaces popup)
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.error('[Populatte] Failed to set panel behavior:', err);
  });

  // ============================================================================
  // Per-tab state management
  // ============================================================================
  const tabStates = new Map<number, TabState>();
  let sidepanelPort: chrome.runtime.Port | null = null;
  let activeTabId: number | null = null;

  /**
   * Safely send a message to a port, catching disconnection errors
   * @returns true if message was sent successfully, false if port is disconnected
   */
  function safeSendToPort(port: chrome.runtime.Port | null, message: Record<string, unknown>): boolean {
    if (!port) return false;
    try {
      port.postMessage(message);
      return true;
    } catch (err) {
      console.warn('[Background] Port send failed (disconnected), nulling port:', err);
      if (port === sidepanelPort) {
        sidepanelPort = null;
      }
      return false;
    }
  }

  /**
   * Get or create tab state for a given tab ID
   */
  function getTabState(tabId: number): TabState {
    let state = tabStates.get(tabId);
    if (!state) {
      state = {
        mappingMatches: [],
        hasMapping: false,
        currentMappingId: null,
        currentMappingName: null,
        fillStatus: 'idle',
        identifierFieldKey: null,
        secondaryFieldKey: null,
        currentRowData: null,
      };
      tabStates.set(tabId, state);
    }
    return state;
  }

  // ============================================================================
  // Success monitoring helpers
  // ============================================================================
  async function stopSuccessMonitorInTab(): Promise<void> {
    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await browser.tabs.sendMessage(activeTab.id, { type: 'STOP_MONITOR' });
      }
    } catch {
      // Ignore errors (tab may not have content script)
    }
  }

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
      const tab = await browser.tabs.get(tabId);
      const currentUrl = tab.url;
      const tabState = getTabState(tabId);
      console.log('[Background] checkMappingForTab: tabId=', tabId, 'url=', currentUrl);

      if (!currentUrl || currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
        console.log('[Background] checkMappingForTab: Skipping special URL');
        tabState.mappingMatches = [];
        tabState.hasMapping = false;
        tabState.currentMappingId = null;
        tabState.currentMappingName = null;
        await clearBadge();
        await sendStateToSidepanel(tabId);
        return;
      }

      const selection = await storage.selection.getSelection();
      const projectId = selection.projectId;
      console.log('[Background] checkMappingForTab: projectId=', projectId);

      if (!projectId) {
        console.log('[Background] checkMappingForTab: No project selected');
        tabState.mappingMatches = [];
        tabState.hasMapping = false;
        tabState.currentMappingId = null;
        tabState.currentMappingName = null;
        await clearBadge();
        await sendStateToSidepanel(tabId);
        return;
      }

      console.log('[Background] checkMappingForTab: Fetching mappings for URL...');
      const mappings = await fetchMappingsByUrl(projectId, currentUrl);
      console.log('[Background] checkMappingForTab: Found mappings:', mappings.length, mappings.map((m) => ({ id: m.id, name: m.name, stepCount: m.stepCount })));

      const validMappings = mappings.filter((m) => m.stepCount > 0);
      console.log('[Background] checkMappingForTab: Valid mappings (stepCount > 0):', validMappings.length);

      if (validMappings.length === 0) {
        console.log('[Background] checkMappingForTab: No valid mappings found');
        tabState.mappingMatches = [];
        tabState.hasMapping = false;
        tabState.currentMappingId = null;
        tabState.currentMappingName = null;
        await clearBadge();
        await sendStateToSidepanel(tabId);
        return;
      }

      tabState.mappingMatches = validMappings.map((m) => ({
        id: m.id,
        name: m.name,
        stepCount: m.stepCount,
      }));
      tabState.hasMapping = true;

      const lastMappingId = await storage.preferences.getLastMappingId(projectId);
      const lastMatch = lastMappingId
        ? validMappings.find((m) => m.id === lastMappingId)
        : null;

      if (lastMatch) {
        tabState.currentMappingId = lastMatch.id;
        tabState.currentMappingName = lastMatch.name;
      } else if (validMappings.length === 1) {
        const singleMapping = validMappings[0];
        if (singleMapping) {
          tabState.currentMappingId = singleMapping.id;
          tabState.currentMappingName = singleMapping.name;
        }
      } else {
        tabState.currentMappingId = null;
        tabState.currentMappingName = null;
      }

      await setBadge(validMappings.length);
      await sendStateToSidepanel(tabId);
    } catch (err) {
      console.error('[Background] checkMappingForTab error:', err);
      const tabState = getTabState(tabId);
      tabState.mappingMatches = [];
      tabState.hasMapping = false;
      tabState.currentMappingId = null;
      tabState.currentMappingName = null;
      await clearBadge();
      await sendStateToSidepanel(tabId);
    }
  }

  // ============================================================================
  // Tab listeners for mapping detection and cleanup
  // ============================================================================
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    activeTabId = activeInfo.tabId;
    await checkMappingForTab(activeInfo.tabId);
    // State is pushed by checkMappingForTab
  });

  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
    if (changeInfo.url) {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id === tabId) {
        await checkMappingForTab(tabId);
      }
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    console.log('[Background] Tab closed, cleaning up state:', tabId);
    tabStates.delete(tabId);
    if (activeTabId === tabId) {
      activeTabId = null;
    }
  });

  // ============================================================================
  // State building and notification
  // ============================================================================
  async function buildState(tabId: number): Promise<ExtensionState> {
    const tabState = getTabState(tabId);
    const [auth, selection] = await Promise.all([
      storage.auth.getAuth(),
      storage.selection.getSelection(),
    ]);

    const identifierPrimary = tabState.identifierFieldKey && tabState.currentRowData?.[tabState.identifierFieldKey]
      ? String(tabState.currentRowData[tabState.identifierFieldKey])
      : null;
    const identifierSecondary = tabState.secondaryFieldKey && tabState.currentRowData?.[tabState.secondaryFieldKey]
      ? String(tabState.currentRowData[tabState.secondaryFieldKey])
      : null;

    return {
      isAuthenticated: auth.token !== null && !(await storage.auth.isExpired()),
      userEmail: auth.userEmail,
      projectId: selection.projectId,
      batchId: selection.batchId,
      rowIndex: selection.rowIndex,
      rowTotal: selection.rowTotal,
      fillStatus: tabState.fillStatus,
      mappingId: tabState.currentMappingId,
      mappingName: tabState.currentMappingName,
      hasMapping: tabState.hasMapping,
      availableMappings: tabState.mappingMatches.map((m) => ({ id: m.id, name: m.name })),
      identifierFieldKey: tabState.identifierFieldKey,
      secondaryFieldKey: tabState.secondaryFieldKey,
      identifierPrimary,
      identifierSecondary,
    };
  }

  async function sendStateToSidepanel(tabId: number): Promise<void> {
    if (!sidepanelPort) return; // Panel not open
    const state = await buildState(tabId);
    safeSendToPort(sidepanelPort, { type: 'STATE_UPDATED', payload: state });
  }

  // ============================================================================
  // Port connection handler for sidepanel
  // ============================================================================
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel') {
      console.log('[Background] Sidepanel connected');
      sidepanelPort = port;

      port.onMessage.addListener(async (message: PopupToBackgroundMessage) => {
        await handleSidepanelMessage(message, port);
      });

      port.onDisconnect.addListener(() => {
        console.log('[Background] Sidepanel disconnected (panel closed)');
        sidepanelPort = null;
        // Per locked decision: Background keeps API connection alive after panel close
        // No auth cleanup here. State remains in tabStates Map for instant resume.
      });

      // Do NOT push state immediately on connect.
      // Sidepanel will request state via GET_STATE, which is the canonical
      // way to get initial state. The immediate push caused race conditions
      // where async work from sendStateToSidepanel interfered with the
      // GET_STATE handler running concurrently.
    }
  });

  // ============================================================================
  // Sidepanel message handler
  // ============================================================================
  async function handleSidepanelMessage(message: PopupToBackgroundMessage, port: chrome.runtime.Port): Promise<void> {
    try {
      const currentTabId = activeTabId ?? 0;
      const tabState = getTabState(currentTabId);

      switch (message.type) {
        case 'GET_STATE': {
          // Ensure activeTabId is known (may be null on fresh extension load)
          if (activeTabId === null) {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id) {
              activeTabId = activeTab.id;
            }
          }
          const resolvedTabId = activeTabId ?? 0;
          console.log('[Background] GET_STATE: Refreshing mapping detection for tab:', resolvedTabId);
          if (resolvedTabId > 0) {
            await checkMappingForTab(resolvedTabId);
          }
          const state = await buildState(resolvedTabId);
          console.log('[Background] GET_STATE: Returning state, hasMapping:', state.hasMapping, 'mappingId:', state.mappingId, 'availableMappings:', state.availableMappings.length);
          port.postMessage({ type: 'RESPONSE', requestType: 'GET_STATE', success: true, data: state });
          break;
        }

        case 'PROJECT_SELECT': {
          const { projectId } = message.payload;
          await storage.selection.setSelectedProject(projectId);
          await storage.preferences.setLastProjectId(projectId);
          if (activeTabId !== null) {
            await checkMappingForTab(activeTabId);
          } else {
            await sendStateToSidepanel(currentTabId);
          }
          port.postMessage({ type: 'RESPONSE', requestType: 'PROJECT_SELECT', success: true });
          break;
        }

        case 'BATCH_SELECT': {
          const { batchId, rowTotal } = message.payload;
          await storage.selection.setSelectedBatch(batchId, rowTotal);
          try {
            const selection = await storage.selection.getSelection();
            if (selection.projectId) {
              const batch = await fetchBatchDetail(selection.projectId, batchId);
              tabState.identifierFieldKey = batch.identifierFieldKey;
              tabState.secondaryFieldKey = batch.secondaryFieldKey;
              console.log('[Background] Batch identifier fields loaded:', {
                identifierFieldKey: tabState.identifierFieldKey,
                secondaryFieldKey: tabState.secondaryFieldKey,
              });
              if (selection.rowIndex >= 0) {
                const row = await fetchRowByIndex(selection.projectId, batchId, selection.rowIndex);
                tabState.currentRowData = row.data;
              }
            }
          } catch (err) {
            console.error('[Background] Failed to load batch identifiers:', err);
            tabState.identifierFieldKey = null;
            tabState.secondaryFieldKey = null;
            tabState.currentRowData = null;
          }
          await sendStateToSidepanel(currentTabId);
          port.postMessage({ type: 'RESPONSE', requestType: 'BATCH_SELECT', success: true });
          break;
        }

        case 'ROW_NEXT': {
          tabState.fillStatus = 'idle';
          const newIndex = await storage.selection.nextRow();
          try {
            const selection = await storage.selection.getSelection();
            if (selection.projectId && selection.batchId && newIndex >= 0) {
              const row = await fetchRowByIndex(selection.projectId, selection.batchId, newIndex);
              tabState.currentRowData = row.data;
            }
          } catch (err) {
            console.error('[Background] Failed to fetch row data:', err);
            tabState.currentRowData = null;
          }
          await sendStateToSidepanel(currentTabId);
          port.postMessage({ type: 'RESPONSE', requestType: 'ROW_NEXT', success: true, data: { rowIndex: newIndex } });
          break;
        }

        case 'ROW_PREV': {
          tabState.fillStatus = 'idle';
          const newIndex = await storage.selection.prevRow();
          try {
            const selection = await storage.selection.getSelection();
            if (selection.projectId && selection.batchId && newIndex >= 0) {
              const row = await fetchRowByIndex(selection.projectId, selection.batchId, newIndex);
              tabState.currentRowData = row.data;
            }
          } catch (err) {
            console.error('[Background] Failed to fetch row data:', err);
            tabState.currentRowData = null;
          }
          await sendStateToSidepanel(currentTabId);
          port.postMessage({ type: 'RESPONSE', requestType: 'ROW_PREV', success: true, data: { rowIndex: newIndex } });
          break;
        }

        case 'MARK_ERROR': {
          const { reason } = message.payload;
          try {
            const selection = await storage.selection.getSelection();
            if (!selection.projectId || !selection.batchId) {
              port.postMessage({ type: 'RESPONSE', requestType: 'MARK_ERROR', success: false, error: 'No project/batch selected' });
              break;
            }
            const row = await fetchRowByIndex(selection.projectId, selection.batchId, selection.rowIndex);
            await updateRowStatus(selection.projectId, selection.batchId, row.id, 'ERROR', reason ?? 'Manually marked as error');
            console.log('[Background] MARK_ERROR: Row marked as error');
            tabState.fillStatus = 'idle';
            const newIndex = await storage.selection.nextRow();
            await sendStateToSidepanel(currentTabId);
            port.postMessage({ type: 'RESPONSE', requestType: 'MARK_ERROR', success: true, data: { rowIndex: newIndex } });
          } catch (err) {
            console.error('[Background] MARK_ERROR error:', err);
            tabState.fillStatus = 'idle';
            const newIndex = await storage.selection.nextRow();
            await sendStateToSidepanel(currentTabId);
            port.postMessage({ type: 'RESPONSE', requestType: 'MARK_ERROR', success: false, error: err instanceof Error ? err.message : 'Failed to mark error', data: { rowIndex: newIndex } });
          }
          break;
        }

        case 'GET_MAPPINGS': {
          port.postMessage({
            type: 'RESPONSE',
            requestType: 'GET_MAPPINGS',
            success: true,
            data: {
              mappings: tabState.mappingMatches.map((m) => ({ id: m.id, name: m.name })),
              selectedId: tabState.currentMappingId,
            },
          });
          break;
        }

        case 'MAPPING_SELECT': {
          const { mappingId } = message.payload;
          const selection = await storage.selection.getSelection();
          const projectId = selection.projectId;
          const mapping = tabState.mappingMatches.find((m) => m.id === mappingId);
          if (mapping) {
            tabState.currentMappingId = mapping.id;
            tabState.currentMappingName = mapping.name;
            if (projectId) {
              await storage.preferences.setLastMappingId(projectId, mappingId);
            }
            await sendStateToSidepanel(currentTabId);
            port.postMessage({ type: 'RESPONSE', requestType: 'MAPPING_SELECT', success: true });
          } else {
            port.postMessage({ type: 'RESPONSE', requestType: 'MAPPING_SELECT', success: false, error: 'Mapping not found in current matches' });
          }
          break;
        }

        case 'FILL_START': {
          try {
            await stopSuccessMonitorInTab();
            const selection = await storage.selection.getSelection();
            if (!selection.projectId || !selection.batchId) {
              port.postMessage({ type: 'RESPONSE', requestType: 'FILL_START', success: false, error: 'No project/batch selected' });
              break;
            }
            const mappingId = tabState.currentMappingId;
            if (!mappingId) {
              port.postMessage({ type: 'RESPONSE', requestType: 'FILL_START', success: false, error: 'No mapping selected' });
              break;
            }
            tabState.fillStatus = 'filling';
            await sendStateToSidepanel(currentTabId);
            const mapping = await fetchMappingWithSteps(selection.projectId, mappingId);
            if (!mapping || mapping.steps.length === 0) {
              tabState.fillStatus = 'failed';
              await sendStateToSidepanel(currentTabId);
              port.postMessage({ type: 'RESPONSE', requestType: 'FILL_START', success: false, error: 'Mapping has no steps' });
              break;
            }
            const row = await fetchRowByIndex(selection.projectId, selection.batchId, selection.rowIndex);
            tabState.currentRowData = row.data;
            safeSendToPort(sidepanelPort, { type: 'FILL_PROGRESS', payload: { currentStep: 0, totalSteps: mapping.steps.length, status: 'Starting...' } });
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!activeTab?.id) {
              tabState.fillStatus = 'failed';
              await sendStateToSidepanel(currentTabId);
              port.postMessage({ type: 'RESPONSE', requestType: 'FILL_START', success: false, error: 'No active tab' });
              break;
            }
            const fillSteps = mapping.steps.map((step) => ({
              id: step.id, stepOrder: step.stepOrder, action: step.action, selector: step.selector,
              selectorFallbacks: step.selectorFallbacks, sourceFieldKey: step.sourceFieldKey,
              fixedValue: step.fixedValue, clearBefore: step.clearBefore, pressEnter: step.pressEnter,
              waitMs: step.waitMs, optional: step.optional,
            }));
            const result = await browser.tabs.sendMessage(activeTab.id, {
              type: 'FILL_EXECUTE', payload: { steps: fillSteps, rowData: row.data },
            }) as { success: boolean; data?: { stepResults?: Array<{ stepId: string; success: boolean; skipped?: boolean; error?: string }> }; error?: string; } | undefined;
            if (!result) {
              console.error('[Background] FILL_EXECUTE: No response from content script');
              tabState.fillStatus = 'failed';
              safeSendToPort(sidepanelPort, { type: 'FILL_PROGRESS', payload: { currentStep: 0, totalSteps: mapping.steps.length, status: 'Content script not responding' } });
              await sendStateToSidepanel(currentTabId);
              port.postMessage({ type: 'RESPONSE', requestType: 'FILL_START', success: false, error: 'Content script not responding' });
              break;
            }
            if (result.success) {
              tabState.fillStatus = 'success';
              safeSendToPort(sidepanelPort, { type: 'FILL_PROGRESS', payload: { currentStep: mapping.steps.length, totalSteps: mapping.steps.length, status: 'Complete' } });
            } else {
              const successCount = result.data?.stepResults?.filter((r) => r.success).length ?? 0;
              tabState.fillStatus = successCount > 0 ? 'partial' : 'failed';
              safeSendToPort(sidepanelPort, { type: 'FILL_PROGRESS', payload: { currentStep: successCount, totalSteps: mapping.steps.length, status: result.error ?? 'Fill failed' } });
            }
            if (result.success && mapping.successTrigger) {
              console.log('[Background] Starting success monitor:', mapping.successTrigger);
              await browser.tabs.sendMessage(activeTab.id, {
                type: 'MONITOR_SUCCESS', payload: { trigger: mapping.successTrigger, config: mapping.successConfig ?? {}, timeoutMs: 30000 },
              });
            }
            try {
              if (result.success) {
                await updateRowStatus(selection.projectId, selection.batchId, row.id, 'VALID');
              } else {
                const failedStep = result.data?.stepResults?.find((r) => !r.success && !r.skipped);
                await updateRowStatus(selection.projectId, selection.batchId, row.id, 'ERROR', result.error ?? failedStep?.error ?? 'Fill failed', failedStep?.stepId);
              }
            } catch (statusErr) {
              console.error('[Background] Failed to update row status:', statusErr);
            }
            await sendStateToSidepanel(currentTabId);
            port.postMessage({ type: 'RESPONSE', requestType: 'FILL_START', success: result.success, data: result.data });
          } catch (err) {
            tabState.fillStatus = 'failed';
            await sendStateToSidepanel(currentTabId);
            console.error('[Background] FILL_START error:', err);
            port.postMessage({ type: 'RESPONSE', requestType: 'FILL_START', success: false, error: err instanceof Error ? err.message : 'Fill failed' });
          }
          break;
        }

        case 'CAPTURE_START':
        case 'CAPTURE_STOP':
        case 'CAPTURE_HIGHLIGHT':
        case 'CAPTURE_REMOVE_STEP': {
          console.log('[Background] Relay capture message to content script:', message.type);
          try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              const response = await browser.tabs.sendMessage(tab.id, message);
              port.postMessage({ type: 'RESPONSE', requestType: message.type, success: true, data: response });
            } else {
              port.postMessage({ type: 'RESPONSE', requestType: message.type, success: false, error: 'No active tab' });
            }
          } catch (error) {
            console.error('[Background] Failed to relay capture message:', error);
            port.postMessage({ type: 'RESPONSE', requestType: message.type, success: false, error: error instanceof Error ? error.message : 'Failed to communicate with page' });
          }
          break;
        }

        case 'GET_PROJECTS': {
          try {
            const projects = await fetchProjects();
            port.postMessage({ type: 'RESPONSE', requestType: 'GET_PROJECTS', success: true, data: { projects } });
          } catch (err) {
            console.error('[Background] GET_PROJECTS error:', err);
            port.postMessage({
              type: 'RESPONSE',
              requestType: 'GET_PROJECTS',
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
            const batchesArray = Array.isArray(allBatches) ? allBatches : [];
            const batches = batchesArray.filter((batch) => batch.doneCount < batch.rowCount);
            port.postMessage({ type: 'RESPONSE', requestType: 'GET_BATCHES', success: true, data: { batches } });
          } catch (err) {
            console.error('[Background] GET_BATCHES error:', err);
            port.postMessage({
              type: 'RESPONSE',
              requestType: 'GET_BATCHES',
              success: false,
              error: err instanceof Error ? err.message : 'Failed to fetch batches',
            });
          }
          break;
        }

        case 'AUTH_LOGIN': {
          const { code } = message.payload;
          try {
            const { token } = await exchangeCode(code);
            const user = await getMe(token);
            const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
            await storage.auth.setToken(token, expiresAt);
            await storage.auth.setUser(user.id, user.email);
            await sendStateToSidepanel(currentTabId);
            port.postMessage({ type: 'RESPONSE', requestType: 'AUTH_LOGIN', success: true });
          } catch (err) {
            console.error('[Background] AUTH_LOGIN error:', err);
            port.postMessage({
              type: 'RESPONSE',
              requestType: 'AUTH_LOGIN',
              success: false,
              error: err instanceof Error ? err.message : 'Connection failed',
            });
          }
          break;
        }

        case 'AUTH_LOGOUT': {
          await storage.auth.clearAuth();
          await storage.selection.clearSelection();
          // Clear all tab states
          tabStates.clear();
          await clearBadge();
          await sendStateToSidepanel(currentTabId);
          port.postMessage({ type: 'RESPONSE', requestType: 'AUTH_LOGOUT', success: true });
          break;
        }

        case 'GET_AUTH': {
          const auth = await storage.auth.getAuth();
          const isExpired = await storage.auth.isExpired();
          port.postMessage({
            type: 'RESPONSE',
            requestType: 'GET_AUTH',
            success: true,
            data: { token: auth.token, userId: auth.userId, userEmail: auth.userEmail, isExpired },
          });
          break;
        }

        case 'PING': {
          port.postMessage({ type: 'RESPONSE', requestType: 'PING', success: true, data: { pong: true, context: 'background' } });
          break;
        }

        default:
          console.log('[Background] Unhandled sidepanel message type:', (message as { type: string }).type);
          port.postMessage({ type: 'RESPONSE', requestType: (message as { type: string }).type, success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[Background] Sidepanel handler error:', err);
      try {
        port.postMessage({ type: 'RESPONSE', requestType: message.type, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      } catch {
        console.warn('[Background] Cannot send error response, port disconnected');
      }
    }
  }

  // ============================================================================
  // Content script message handler (still uses onMessage, not port)
  // ============================================================================
  browser.runtime.onMessage.addListener(
    (message: ContentToBackgroundMessage, _sender, sendResponse) => {
      console.log('[Background] Received content script message:', message.type);

      (async () => {
        try {
          const currentTabId = activeTabId ?? 0;
          const tabState = getTabState(currentTabId);

          switch (message.type) {
            case 'SUCCESS_DETECTED': {
              const { success, reason } = (message as SuccessDetectedMessage).payload;
              console.log('[Background] Success detected:', success, reason);
              if (success) {
                tabState.fillStatus = 'idle';
                await storage.selection.nextRow();
                await sendStateToSidepanel(currentTabId);
                safeSendToPort(sidepanelPort, { type: 'FILL_PROGRESS', payload: { currentStep: 0, totalSteps: 0, status: `Auto-advanced: ${reason}` } });
              } else {
                safeSendToPort(sidepanelPort, { type: 'FILL_PROGRESS', payload: { currentStep: 0, totalSteps: 0, status: `Monitor timeout: ${reason}` } });
              }
              sendResponse({ success: true });
              break;
            }

            case 'FILL_RESULT': {
              console.log('[Background] FILL_RESULT received directly (unexpected)');
              sendResponse({ success: true });
              break;
            }

            case 'ELEMENT_CAPTURED': {
              console.log('[Background] Saving captured step to storage');
              const step = message.payload as unknown as {
                id?: string; stepNumber: number; action: string;
                selector: { type: 'css'; value: string };
                fallbacks?: Array<{ type: 'css'; value: string }>;
                elementType: string; elementName: string;
                optional?: boolean; clearBefore?: boolean; pressEnter?: boolean;
              };
              const data = await chrome.storage.session.get(['capturedSteps']);
              const currentSteps = (data.capturedSteps ?? []) as unknown[];
              const newStep = { ...step, id: step.id ?? crypto.randomUUID(), stepNumber: currentSteps.length + 1 };
              const updatedSteps = [...currentSteps, newStep];
              await chrome.storage.session.set({ capturedSteps: updatedSteps });
              console.log('[Background] Steps saved to storage, total:', updatedSteps.length);
              safeSendToPort(sidepanelPort, { type: 'ELEMENT_CAPTURED', payload: newStep });
              console.log('[Background] Port message sent for ELEMENT_CAPTURED');
              sendResponse({ success: true, stepNumber: newStep.stepNumber });
              break;
            }

            case 'ELEMENT_ALREADY_CAPTURED': {
              console.log('[Background] Relay element already captured to sidepanel:', message.payload);
              safeSendToPort(sidepanelPort, { type: 'ELEMENT_ALREADY_CAPTURED', payload: message.payload });
              console.log('[Background] Port message sent for ELEMENT_ALREADY_CAPTURED');
              sendResponse({ success: true });
              break;
            }

            default:
              console.log('[Background] Unhandled content message type:', (message as { type: string }).type);
              sendResponse({ success: false, error: 'Unknown message type' });
          }
        } catch (err) {
          console.error('[Background] Content handler error:', err);
          sendResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      })();
      return true;
    }
  );

  browser.runtime.onInstalled.addListener((details) => {
    console.log('[Populatte] Extension installed/updated:', details.reason);
  });
});
