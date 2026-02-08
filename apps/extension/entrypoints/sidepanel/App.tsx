import { useEffect, useState, useRef } from 'react';
import { Coffee, RefreshCw, Target } from 'lucide-react';
import { sendViaPort, PortDisconnectedError } from '../../src/messaging';
import { fetchBatchDetail } from '../../src/api/batches';
import { createMappingWithSteps, fetchMappingWithSteps, type MappingStep } from '../../src/api/mappings';
import { preferencesStorage } from '../../src/storage/preferences';
import { recentRowsStorage, type RecentRowEntry } from '../../src/storage/recentes';
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
  TabBar,
  PreencherStepList,
  RecentesList,
  type CaptureStep,
} from './components';

export default function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fillProgress, setFillProgress] = useState<{ current: number; total: number } | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const [portVersion, setPortVersion] = useState(0);
  const retriesRef = useRef(0);
  const maxRetries = 5;

  // Capture mode state
  const [captureMode, setCaptureMode] = useState(false);
  const [batchColumns, setBatchColumns] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'preencher' | 'captura'>('preencher');

  // Mapping steps state
  const [mappingSteps, setMappingSteps] = useState<MappingStep[]>([]);
  const [stepValidation, setStepValidation] = useState<Map<string, boolean>>(new Map());
  const [fillResultsMap, setFillResultsMap] = useState<Map<string, 'success' | 'failed'>>(new Map());

  // Recent rows state
  const [recentRows, setRecentRows] = useState<RecentRowEntry[]>([]);
  const prevRowIndexRef = useRef<number | null>(null);

  // Persist tab changes to storage
  useEffect(() => {
    preferencesStorage.setLastActiveTab(activeTab);
  }, [activeTab]);

  // Fetch mapping steps when mapping is selected
  useEffect(() => {
    if (state?.projectId && state?.mappingId) {
      fetchMappingWithSteps(state.projectId, state.mappingId)
        .then(async (mapping) => {
          setMappingSteps(mapping.steps);

          // Validate selectors on page
          if (portRef.current && mapping.steps.length > 0) {
            try {
              const response = await sendViaPort<{
                success: boolean;
                data?: { results: Array<{ stepId: string; found: boolean; matchCount: number }> };
              }>(portRef.current, {
                type: 'VALIDATE_SELECTORS',
                payload: {
                  selectors: mapping.steps
                    .filter(s => s.action !== 'wait')  // Wait steps have no selector
                    .map(s => ({
                      stepId: s.id,
                      selector: s.selector,
                      selectorFallbacks: s.selectorFallbacks,
                    })),
                },
              } as any);

              if (response.success && response.data) {
                const validationMap = new Map<string, boolean>();
                for (const result of response.data.results) {
                  validationMap.set(result.stepId, result.found);
                }
                // Wait steps are always "valid" (no selector to check)
                for (const step of mapping.steps) {
                  if (step.action === 'wait') {
                    validationMap.set(step.id, true);
                  }
                }
                setStepValidation(validationMap);
              }
            } catch (err) {
              console.error('[App] Failed to validate selectors:', err);
            }
          }
        })
        .catch((err) => console.error('[App] Failed to fetch mapping steps:', err));
    } else {
      setMappingSteps([]);
      setStepValidation(new Map());
    }
  }, [state?.projectId, state?.mappingId]);

  // Load recent rows when batch changes
  useEffect(() => {
    if (state?.batchId) {
      recentRowsStorage
        .getEntries(state.batchId)
        .then(setRecentRows)
        .catch((err) => console.error('[App] Failed to load recent rows:', err));

      // Initialize prevRowIndexRef when batch first loads
      if (prevRowIndexRef.current === null) {
        prevRowIndexRef.current = state.rowIndex;
      }
    } else {
      setRecentRows([]);
      prevRowIndexRef.current = null;
    }
  }, [state?.batchId]);

  // Load initial state
  useEffect(() => {
    let disposed = false;

    // Define messageListener before connectPort call
    const messageListener = (message: { type: string; payload?: unknown }) => {
      if (message.type === 'STATE_UPDATED') {
        const newState = message.payload as ExtensionState;
        setState(newState);
        // Only clear fill progress/error when fillStatus returns to idle
        if (newState.fillStatus === 'idle') {
          setFillProgress(null);
          setFillError(null);
        }

        // Track row navigation in recent history (if batch is selected and row changed)
        if (newState.batchId && newState.rowIndex !== prevRowIndexRef.current) {
          recentRowsStorage
            .addEntry(newState.batchId, {
              rowIndex: newState.rowIndex,
              identifierValue: newState.identifierPrimary ?? null,
              identifierFieldKey: newState.identifierFieldKey ?? null,
              status: 'navigated',
            })
            .then(() => recentRowsStorage.getEntries(newState.batchId!))
            .then(setRecentRows)
            .catch((err) => console.error('[App] Failed to track recent row:', err));

          prevRowIndexRef.current = newState.rowIndex;
        }
      }
      if (message.type === 'FILL_PROGRESS') {
        const progress = message.payload as { currentStep: number; totalSteps: number; status: string };
        setFillProgress({ current: progress.currentStep, total: progress.totalSteps });
        // Check for error in status
        if (progress.status.toLowerCase().includes('error')) {
          setFillError(progress.status);
        }
      }
      if (message.type === 'ELEMENT_CAPTURED') {
        // Handled by CapturePanel via storage listener, but we could forward here too
      }
      // RESPONSE messages are handled inside sendViaPort
    };

    function connectPort() {
      if (disposed) return;

      try {
        const p = chrome.runtime.connect({ name: 'sidepanel' });
        portRef.current = p;
        setPortVersion((v) => v + 1);

        p.onMessage.addListener(messageListener);

        p.onDisconnect.addListener(() => {
          console.log('[Sidepanel] Port disconnected, will reconnect...');
          portRef.current = null;

          if (disposed) return;

          retriesRef.current += 1;
          if (retriesRef.current > maxRetries) {
            setError('Connection lost. Please reopen the Side Panel.');
            return;
          }

          const delay = Math.min(500 * Math.pow(2, retriesRef.current - 1), 8000);
          setTimeout(connectPort, delay);
        });

        // Request initial state
        sendViaPort<StateResponse>(p, { type: 'GET_STATE' })
          .then((response) => {
            retriesRef.current = 0; // Reset retries on successful communication
            if (response.success) {
              setState(response.data);
            } else {
              setError(response.error);
            }
            setLoading(false);
          })
          .catch((err) => {
            // If port disconnected during GET_STATE, onDisconnect will handle reconnection
            if (err instanceof PortDisconnectedError) {
              console.log('[Sidepanel] Port disconnected during GET_STATE, awaiting reconnect...');
              return;
            }
            setError(err instanceof Error ? err.message : 'Failed to load state');
            setLoading(false);
          });
      } catch (err) {
        console.error('[Sidepanel] Failed to connect port:', err);
        if (!disposed && retriesRef.current < maxRetries) {
          retriesRef.current += 1;
          const delay = Math.min(500 * Math.pow(2, retriesRef.current - 1), 8000);
          setTimeout(connectPort, delay);
        } else {
          setError('Connection lost. Please reopen the Side Panel.');
        }
      }
    }

    connectPort();

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
        // Auto-switch to Captura tab when restoring active capture mode
        setActiveTab('captura');
      }
    }).catch((err) => {
      console.error('[App] Failed to restore from storage:', err);
    });

    return () => {
      disposed = true;
      portRef.current?.disconnect();
    };
  }, []);

  async function loadState() {
    if (!portRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const response = await sendViaPort<StateResponse>(portRef.current, { type: 'GET_STATE' });

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
    if (!portRef.current) return;
    try {
      await sendViaPort<VoidResponse>(portRef.current, {
        type: 'PROJECT_SELECT',
        payload: { projectId },
      });
      // State update comes via STATE_UPDATED port message
    } catch (err) {
      console.error('[Sidepanel] Failed to select project:', err);
    }
  }

  async function handleBatchSelect(batchId: string, rowTotal: number) {
    if (!portRef.current) return;
    try {
      // Update local state immediately for rowTotal
      if (state) {
        setState({ ...state, rowTotal });
      }
      await sendViaPort<VoidResponse>(portRef.current, {
        type: 'BATCH_SELECT',
        payload: { batchId, rowTotal },
      });
      // State update comes via STATE_UPDATED port message
    } catch (err) {
      console.error('[Sidepanel] Failed to select batch:', err);
    }
  }

  // Fill cycle handlers
  async function handleFill() {
    if (!portRef.current) return;
    setFillError(null);
    setFillResultsMap(new Map()); // Clear previous fill results
    try {
      const response = await sendViaPort<{
        success: boolean;
        data?: { stepResults?: Array<{ stepId: string; success: boolean; skipped?: boolean }> };
      }>(portRef.current, { type: 'FILL_START' });

      // Parse step results and build fillResultsMap
      if (response.data?.stepResults) {
        const resultsMap = new Map<string, 'success' | 'failed'>();
        for (const stepResult of response.data.stepResults) {
          if (!stepResult.skipped) {
            resultsMap.set(stepResult.stepId, stepResult.success ? 'success' : 'failed');
          }
        }
        setFillResultsMap(resultsMap);

        // Update recent row status based on fill results
        if (state?.batchId) {
          const allSuccess = response.data.stepResults.every(
            (step) => step.skipped || step.success
          );
          const fillStatus = allSuccess ? 'success' : 'failed';

          await recentRowsStorage.updateStatus(state.batchId, state.rowIndex, fillStatus);
          const entries = await recentRowsStorage.getEntries(state.batchId);
          setRecentRows(entries);
        }
      }
    } catch (err) {
      setFillError(err instanceof Error ? err.message : 'Fill failed');
    }
  }

  async function handleNext() {
    if (!portRef.current) return;
    setFillError(null);
    setFillResultsMap(new Map()); // Clear fill results on row navigation
    try {
      await sendViaPort<VoidResponse>(portRef.current, { type: 'ROW_NEXT' });
      // State update comes via STATE_UPDATED port message
    } catch (err) {
      console.error('[Sidepanel] Failed to advance row:', err);
    }
  }

  async function handlePrev() {
    if (!portRef.current) return;
    setFillError(null);
    setFillResultsMap(new Map()); // Clear fill results on row navigation
    try {
      await sendViaPort<VoidResponse>(portRef.current, { type: 'ROW_PREV' });
      // State update comes via STATE_UPDATED port message
    } catch (err) {
      console.error('[Sidepanel] Failed to go to previous row:', err);
    }
  }

  async function handleRecentRowSelect(rowIndex: number) {
    if (!portRef.current || !state?.batchId) return;

    // Guard: if same row, no-op
    if (rowIndex === state.rowIndex) return;

    // Optimistic update: update row navigator number instantly
    if (state) {
      setState({ ...state, rowIndex });
    }

    // Clear fill results for new row
    setFillResultsMap(new Map());
    setFillError(null);

    try {
      // Send ROW_SELECT to background (created in Plan 01)
      await sendViaPort<VoidResponse>(portRef.current, {
        type: 'ROW_SELECT',
        payload: { rowIndex },
      });
      // State update with real data comes via STATE_UPDATED port message
    } catch (err) {
      console.error('[Sidepanel] Failed to navigate to recent row:', err);
      // Rollback optimistic update by reloading state
      await loadState();
    }
  }

  async function handleMarkError(reason?: string) {
    if (!portRef.current) return;
    setFillError(null);
    try {
      await sendViaPort<VoidResponse>(portRef.current, {
        type: 'MARK_ERROR',
        payload: { reason },
      });
      // State update comes via STATE_UPDATED port message
    } catch (err) {
      console.error('[Sidepanel] Failed to mark error:', err);
    }
  }

  async function handleMappingSelect(mappingId: string) {
    if (!portRef.current) return;
    try {
      await sendViaPort<VoidResponse>(portRef.current, {
        type: 'MAPPING_SELECT',
        payload: { mappingId },
      });
      // State update comes via STATE_UPDATED port message
    } catch (err) {
      console.error('[Sidepanel] Failed to select mapping:', err);
    }
  }

  // ============================================================================
  // Capture Mode Handlers
  // ============================================================================

  async function handleEnterCaptureMode() {
    if (!portRef.current || !state?.batchId || !state?.projectId) {
      setError('Select a batch first');
      return;
    }

    // Optimistic UI update: switch tab and mode immediately
    setActiveTab('captura');
    setCaptureMode(true);

    try {
      // Fetch batch columns
      const batch = await fetchBatchDetail(state.projectId, state.batchId);
      const columns = batch.columnMetadata.map((c) => c.header || c.key);
      console.log('[App] Batch columns loaded:', columns);
      setBatchColumns(columns);

      // Start capture mode in content script
      await sendViaPort(portRef.current, { type: 'CAPTURE_START', payload: { batchColumns: columns } });

      // Persist capture mode state to session storage
      await chrome.storage.session.set({
        captureMode: true,
        batchColumns: columns,
        capturedSteps: [],
        captureMappingName: '',
      });
    } catch (err) {
      // Rollback on failure
      setCaptureMode(false);
      setActiveTab('preencher');
      setError(err instanceof Error ? err.message : 'Failed to start capture mode');
    }
  }

  async function handleExitCaptureMode() {
    if (!portRef.current) return;
    // Clear persisted capture mode state
    await chrome.storage.session.remove(['captureMode', 'batchColumns', 'capturedSteps', 'captureMappingName']);
    await sendViaPort(portRef.current, { type: 'CAPTURE_STOP' });
    setCaptureMode(false);
  }

  async function handleStartFilling() {
    if (!portRef.current) return;
    console.log('[App] handleStartFilling called');
    // Clear persisted capture mode state
    await chrome.storage.session.remove(['captureMode', 'batchColumns', 'capturedSteps', 'captureMappingName']);
    await sendViaPort(portRef.current, { type: 'CAPTURE_STOP' });
    setCaptureMode(false);
    // Refresh state to load the newly created mapping
    console.log('[App] Refreshing state to detect new mapping...');
    await loadState();
    console.log('[App] State loaded, state.hasMapping:', state?.hasMapping);
  }

  async function handleSaveMapping(name: string, steps: CaptureStep[]): Promise<{ id: string }> {
    if (!portRef.current) throw new Error('Not connected');
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
    await sendViaPort(portRef.current, { type: 'CAPTURE_STOP' });

    // Refresh state to show new mapping
    console.log('[App] Refreshing state after mapping save...');
    await loadState();
    console.log('[App] State refreshed');

    return { id: result.id };
  }

  async function handleRemoveStep(stepNumber: number) {
    if (!portRef.current) return;
    await sendViaPort(portRef.current, {
      type: 'CAPTURE_REMOVE_STEP',
      payload: { stepNumber },
    });
  }

  async function handleHighlightStep(stepNumber: number) {
    if (!portRef.current) return;
    await sendViaPort(portRef.current, {
      type: 'CAPTURE_HIGHLIGHT',
      payload: { stepNumber },
    });
  }

  // ============================================================================
  // Preencher Tab Handlers
  // ============================================================================

  function handleStepReorder(reorderedSteps: MappingStep[]) {
    setMappingSteps(reorderedSteps);
  }

  async function handleStepHighlight(step: MappingStep) {
    if (!portRef.current) return;
    try {
      const response = await sendViaPort<{ success: boolean; data?: { found: boolean; matchCount: number } }>(
        portRef.current,
        {
          type: 'HIGHLIGHT_STEP',
          payload: {
            selector: step.selector,
            selectorFallbacks: step.selectorFallbacks,
          },
        } as any  // Cast needed until union type is updated
      );

      if (response.success && response.data && !response.data.found) {
        // Show toast: "Elemento nao encontrado na pagina"
        setFillError('Elemento nao encontrado na pagina');
        // Auto-clear toast after 3 seconds
        setTimeout(() => setFillError(null), 3000);
      }

      // Re-validate this specific step after clicking
      setStepValidation(prev => {
        const next = new Map(prev);
        next.set(step.id, response.success && response.data?.found === true);
        return next;
      });
    } catch (err) {
      console.error('[App] Failed to highlight step:', err);
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="w-full min-h-screen bg-white p-4 flex flex-col">
      <header className="flex items-center gap-2 mb-4 pb-3 border-b">
        <Coffee className="w-6 h-6 text-amber-700" />
        <h1 className="text-lg font-semibold text-gray-900">Populatte</h1>
        {state?.isAuthenticated && <ConnectedIndicator />}
        <button
          onClick={loadState}
          className="ml-auto p-1 hover:bg-gray-100 rounded"
          title="Refresh state"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
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
              {/* Tab bar */}
              <TabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                captureActive={captureMode}
              />

              {/* Tab content */}
              {activeTab === 'preencher' ? (
                <div className="flex-1 flex flex-col overflow-hidden pt-4">
                  {/* Selectors - always visible */}
                  <div className="space-y-2 pb-2">
                    <ProjectSelector
                      selectedId={state.projectId}
                      onSelect={handleProjectSelect}
                      port={portRef.current!}
                    />
                    <BatchSelector
                      projectId={state.projectId}
                      selectedId={state.batchId}
                      onSelect={handleBatchSelect}
                      port={portRef.current!}
                    />
                  </div>

                  {/* Empty state when no batch selected */}
                  {!state.batchId ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                      <Coffee className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-400">Selecione um projeto e batch para comecar</p>
                    </div>
                  ) : (
                    <>
                      {/* Scrollable content area */}
                      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
                        {state.hasMapping && state.availableMappings.length > 0 && (
                          <MappingSelector
                            mappings={state.availableMappings}
                            selectedId={state.mappingId}
                            onSelect={handleMappingSelect}
                          />
                        )}

                        {/* Create Mapping button - shown when batch selected but no mapping for current URL */}
                        {!state.hasMapping && !captureMode && (
                          <button
                            type="button"
                            onClick={handleEnterCaptureMode}
                            className="w-full p-3 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 text-amber-800 font-medium flex items-center justify-center gap-2"
                          >
                            <Target className="w-4 h-4" />
                            Criar Mapping
                          </button>
                        )}

                        {/* Steps list */}
                        {mappingSteps.length > 0 && (
                          <PreencherStepList
                            steps={mappingSteps}
                            validation={stepValidation}
                            fillResults={fillResultsMap}
                            onStepClick={handleStepHighlight}
                            onReorder={handleStepReorder}
                          />
                        )}

                        {/* Recent rows section */}
                        {recentRows.length > 0 && (
                          <RecentesList
                            entries={recentRows}
                            currentRowIndex={state.rowIndex}
                            onRowSelect={handleRecentRowSelect}
                          />
                        )}
                      </div>

                      {/* Sticky footer with row indicator and fill controls */}
                      <div className="sticky bottom-0 bg-white pt-2 border-t space-y-2">
                        <RowIndicator
                          rowIndex={state.rowIndex}
                          rowTotal={state.rowTotal}
                          identifierPrimary={state.identifierPrimary}
                          identifierSecondary={state.identifierSecondary}
                          identifierFieldKey={state.identifierFieldKey}
                          secondaryFieldKey={state.secondaryFieldKey}
                          onPrev={handlePrev}
                          onNext={handleNext}
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
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pt-4">
                  {/* Captura tab content */}
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
              )}
            </>
          ) : (
            <ConnectView port={portRef.current!} onConnected={loadState} />
          )
        )}
      </main>

      <footer className="pt-3 border-t text-xs text-gray-400">
        <p>Version 0.1.0 - Foundation</p>
      </footer>
    </div>
  );
}
