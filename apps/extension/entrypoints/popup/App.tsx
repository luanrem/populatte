import { useEffect, useState } from 'react';
import { Coffee, RefreshCw, Target } from 'lucide-react';
import { sendToBackground } from '../../src/messaging';
import { fetchBatchDetail } from '../../src/api/batches';
import { createMappingWithSteps } from '../../src/api/mappings';
import type { StateResponse, ExtensionState, VoidResponse } from '../../src/types';
import {
  ConnectView,
  ConnectedIndicator,
  ProjectSelector,
  BatchSelector,
  MappingSelector,
  RowIndicator,
  FillControls,
  CapturePanel,
  type CaptureStep,
} from './components';

export default function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fillProgress, setFillProgress] = useState<{ current: number; total: number } | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);

  // Capture mode state
  const [captureMode, setCaptureMode] = useState(false);
  const [batchColumns, setBatchColumns] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');

  // Load initial state
  useEffect(() => {
    loadState();

    // Get current tab URL
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        setCurrentUrl(tab.url);
      }
    });

    // Restore capture mode state from session storage
    chrome.storage.session.get(['captureMode', 'batchColumns']).then((data) => {
      console.log('[App] Storage data received:', JSON.stringify(data, null, 2));
      console.log('[App] Restoring capture mode from storage:', {
        captureMode: data.captureMode,
        columnsCount: data.batchColumns?.length ?? 0,
        columns: data.batchColumns,
      });
      if (data.captureMode) {
        const cols = data.batchColumns ?? [];
        console.log('[App] Setting captureMode=true, columns:', cols.length, cols);
        setCaptureMode(true);
        setBatchColumns(cols);
      }
    }).catch((err) => {
      console.error('[App] Failed to restore from storage:', err);
    });

    // Listen for state updates and fill progress from background
    const listener = (message: { type: string; payload: unknown }): undefined | false => {
      if (message.type === 'STATE_UPDATED') {
        const newState = message.payload as ExtensionState;
        setState(newState);
        // Only clear fill progress/error when fillStatus returns to idle
        // (e.g., after row navigation resets the state)
        if (newState.fillStatus === 'idle') {
          setFillProgress(null);
          setFillError(null);
        }
        return undefined; // Handled, no response needed
      }
      if (message.type === 'FILL_PROGRESS') {
        const progress = message.payload as { currentStep: number; totalSteps: number; status: string };
        setFillProgress({ current: progress.currentStep, total: progress.totalSteps });
        // Check for error in status
        if (progress.status.toLowerCase().includes('error')) {
          setFillError(progress.status);
        }
        return undefined;
      }
      return false; // Not handling this message, let other listeners respond
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  async function loadState() {
    setLoading(true);
    setError(null);

    try {
      const response = await sendToBackground<StateResponse>({ type: 'GET_STATE' });

      if (response.success) {
        setState(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load state');
    } finally {
      setLoading(false);
    }
  }

  async function handleProjectSelect(projectId: string) {
    try {
      await sendToBackground<VoidResponse>({
        type: 'PROJECT_SELECT',
        payload: { projectId },
      });
      // State update comes via STATE_UPDATED broadcast
    } catch (err) {
      console.error('[Popup] Failed to select project:', err);
    }
  }

  async function handleBatchSelect(batchId: string, rowTotal: number) {
    try {
      // Update local state immediately for rowTotal
      if (state) {
        setState({ ...state, rowTotal });
      }
      await sendToBackground<VoidResponse>({
        type: 'BATCH_SELECT',
        payload: { batchId, rowTotal },
      });
      // State update comes via STATE_UPDATED broadcast
    } catch (err) {
      console.error('[Popup] Failed to select batch:', err);
    }
  }

  // Fill cycle handlers
  async function handleFill() {
    // Stub for Phase 29: Will send FILL_START message
    setFillError(null);
    try {
      await sendToBackground<VoidResponse>({ type: 'FILL_START' });
    } catch (err) {
      setFillError(err instanceof Error ? err.message : 'Fill failed');
    }
  }

  async function handleNext() {
    setFillError(null);
    try {
      await sendToBackground<VoidResponse>({ type: 'ROW_NEXT' });
      // State update comes via STATE_UPDATED broadcast
    } catch (err) {
      console.error('[Popup] Failed to advance row:', err);
    }
  }

  async function handleMarkError(reason?: string) {
    setFillError(null);
    try {
      await sendToBackground<VoidResponse>({
        type: 'MARK_ERROR',
        payload: { reason },
      });
      // State update comes via STATE_UPDATED broadcast
    } catch (err) {
      console.error('[Popup] Failed to mark error:', err);
    }
  }

  async function handleMappingSelect(mappingId: string) {
    try {
      await sendToBackground<VoidResponse>({
        type: 'MAPPING_SELECT',
        payload: { mappingId },
      });
      // State update comes via STATE_UPDATED broadcast
    } catch (err) {
      console.error('[Popup] Failed to select mapping:', err);
    }
  }

  // ============================================================================
  // Capture Mode Handlers
  // ============================================================================

  async function handleEnterCaptureMode() {
    if (!state?.batchId || !state?.projectId) {
      setError('Select a batch first');
      return;
    }

    try {
      // Fetch batch columns
      const batch = await fetchBatchDetail(state.projectId, state.batchId);
      const columns = batch.columnMetadata.map((c) => c.header || c.key);
      console.log('[App] Batch columns loaded:', columns);
      setBatchColumns(columns);

      // Start capture mode in content script
      await sendToBackground({ type: 'CAPTURE_START', payload: { batchColumns: columns } });

      // Persist capture mode state to session storage
      await chrome.storage.session.set({
        captureMode: true,
        batchColumns: columns,
        capturedSteps: [],
        captureMappingName: '',
      });

      setCaptureMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start capture mode');
    }
  }

  async function handleExitCaptureMode() {
    // Clear persisted capture mode state
    await chrome.storage.session.remove(['captureMode', 'batchColumns', 'capturedSteps', 'captureMappingName']);
    await sendToBackground({ type: 'CAPTURE_STOP' });
    setCaptureMode(false);
  }

  async function handleStartFilling() {
    console.log('[App] handleStartFilling called');
    // Clear persisted capture mode state
    await chrome.storage.session.remove(['captureMode', 'batchColumns', 'capturedSteps', 'captureMappingName']);
    await sendToBackground({ type: 'CAPTURE_STOP' });
    setCaptureMode(false);
    // Refresh state to load the newly created mapping
    console.log('[App] Refreshing state to detect new mapping...');
    await loadState();
    console.log('[App] State loaded, state.hasMapping:', state?.hasMapping);
  }

  async function handleSaveMapping(name: string, steps: CaptureStep[]): Promise<{ id: string }> {
    console.log('[App] handleSaveMapping called');
    console.log('[App] name:', name);
    console.log('[App] steps count:', steps.length);
    console.log('[App] steps raw:', JSON.stringify(steps, null, 2));

    if (!state?.projectId) throw new Error('No project selected');

    const payload = {
      name,
      targetUrl: currentUrl,
      isActive: true,
      steps: steps.map((s) => ({
        action: s.action,
        selector: s.selector ?? { type: 'css' as const, value: '' },
        selectorFallbacks: s.fallbacks,
        sourceFieldKey: s.sourceFieldKey,
        fixedValue: s.fixedValue,
        clearBefore: s.clearBefore,
        pressEnter: s.pressEnter,
        waitMs: s.waitMs,
        optional: s.optional,
      })),
    };

    console.log('[App] Creating mapping with payload:', JSON.stringify(payload, null, 2));
    console.log('[App] Payload steps count:', payload.steps.length);
    const result = await createMappingWithSteps(state.projectId, payload);
    console.log('[App] Mapping created successfully:', result.id);
    console.log('[App] API response full:', JSON.stringify(result, null, 2));

    // Clear persisted capture mode state on successful save
    await chrome.storage.session.remove(['captureMode', 'batchColumns', 'capturedSteps', 'captureMappingName']);

    // Stop capture mode in content script (cleanup)
    await sendToBackground({ type: 'CAPTURE_STOP' });

    // Refresh state to show new mapping
    console.log('[App] Refreshing state after mapping save...');
    await loadState();
    console.log('[App] State refreshed');

    return { id: result.id };
  }

  async function handleRemoveStep(stepNumber: number) {
    await sendToBackground({
      type: 'CAPTURE_REMOVE_STEP',
      payload: { stepNumber },
    });
  }

  async function handleHighlightStep(stepNumber: number) {
    await sendToBackground({
      type: 'CAPTURE_HIGHLIGHT',
      payload: { stepNumber },
    });
  }

  // ============================================================================
  // Render
  // ============================================================================

  // Show capture mode UI if active
  if (captureMode) {
    return (
      <div className="w-[350px] h-[500px] bg-white p-4 flex flex-col overflow-hidden">
        <CapturePanel
          targetUrl={currentUrl}
          columns={batchColumns}
          projectId={state?.projectId}
          onSave={handleSaveMapping}
          onCancel={handleExitCaptureMode}
          onRemoveStep={handleRemoveStep}
          onHighlight={handleHighlightStep}
          onStartFilling={handleStartFilling}
        />
      </div>
    );
  }

  return (
    <div className="w-[350px] h-[500px] bg-white p-4 flex flex-col">
      <header className="flex items-center gap-2 mb-4 pb-3 border-b">
        <Coffee className="w-6 h-6 text-amber-700" />
        <h1 className="text-lg font-semibold text-gray-900">Populatte</h1>
        <button
          onClick={loadState}
          className="ml-auto p-1 hover:bg-gray-100 rounded"
          title="Refresh state"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto">
        {loading && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">Error: {error}</p>
          </div>
        )}

        {state && !loading && (
          state.isAuthenticated ? (
            <>
              <ConnectedIndicator />

              <div className="space-y-3">
                <ProjectSelector
                  selectedId={state.projectId}
                  onSelect={handleProjectSelect}
                />
                <BatchSelector
                  projectId={state.projectId}
                  selectedId={state.batchId}
                  onSelect={handleBatchSelect}
                />
                {state.hasMapping && state.availableMappings.length > 0 && (
                  <MappingSelector
                    mappings={state.availableMappings}
                    selectedId={state.mappingId}
                    onSelect={handleMappingSelect}
                  />
                )}
              </div>

              {/* Create Mapping button - shown when batch selected but no mapping for current URL */}
              {state.batchId && !state.hasMapping && (
                <button
                  type="button"
                  onClick={handleEnterCaptureMode}
                  className="w-full p-3 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 text-amber-800 font-medium flex items-center justify-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Criar Mapping
                </button>
              )}

              <RowIndicator
                rowIndex={state.rowIndex}
                rowTotal={state.rowTotal}
              />

              <FillControls
                batchId={state.batchId}
                fillStatus={state.fillStatus}
                fillProgress={fillProgress}
                fillError={fillError}
                onFill={handleFill}
                onNext={handleNext}
                onMarkError={handleMarkError}
              />
            </>
          ) : (
            <ConnectView onConnected={loadState} />
          )
        )}
      </main>

      <footer className="pt-3 border-t text-xs text-gray-400">
        <p>Version 0.1.0 - Foundation</p>
      </footer>
    </div>
  );
}
