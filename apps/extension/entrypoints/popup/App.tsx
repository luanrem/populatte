import { useEffect, useState } from 'react';
import { Coffee, RefreshCw } from 'lucide-react';
import { sendToBackground } from '../../src/messaging';
import type { StateResponse, ExtensionState } from '../../src/types';
import { ConnectView, ConnectedIndicator } from './components';

export default function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    loadState();

    // Listen for state updates from background
    const listener = (message: { type: string; payload: unknown }): undefined | false => {
      if (message.type === 'STATE_UPDATED') {
        setState(message.payload as ExtensionState);
        return undefined; // Handled, no response needed
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

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Project:</span>
                  <span className="text-gray-900">{state.projectId || 'None selected'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Batch:</span>
                  <span className="text-gray-900">{state.batchId || 'None selected'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Row:</span>
                  <span className="text-gray-900">
                    {state.rowTotal > 0 ? `${state.rowIndex + 1} of ${state.rowTotal}` : 'N/A'}
                  </span>
                </div>
              </div>
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
