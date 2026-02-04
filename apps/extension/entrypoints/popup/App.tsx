import { useEffect, useState } from 'react';
import { Coffee, RefreshCw } from 'lucide-react';
import { sendToBackground } from '../../src/messaging';
import type { StateResponse, ExtensionState, VoidResponse } from '../../src/types';
import {
  ConnectView,
  ConnectedIndicator,
  ProjectSelector,
  BatchSelector,
  RowIndicator,
  FillControls,
} from './components';

export default function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fillProgress, setFillProgress] = useState<{ current: number; total: number } | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    loadState();

    // Listen for state updates and fill progress from background
    const listener = (message: { type: string; payload: unknown }): undefined | false => {
      if (message.type === 'STATE_UPDATED') {
        setState(message.payload as ExtensionState);
        // Clear fill progress and error on state update
        setFillProgress(null);
        setFillError(null);
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

      <main className="flex-1 space-y-4">
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
              </div>

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
