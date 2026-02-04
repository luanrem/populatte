import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { sendToBackground } from '../../../src/messaging';
import type { BatchWithProgress } from '../../../src/types';

interface BatchSelectorProps {
  projectId: string | null;
  selectedId: string | null;
  onSelect: (batchId: string, rowTotal: number) => void;
}

interface BatchesResponseData {
  batches: BatchWithProgress[];
}

type BatchesResponse =
  | { success: true; data: BatchesResponseData }
  | { success: false; error: string };

/**
 * Batch dropdown selector
 *
 * Fetches batches for selected project and displays in dropdown.
 * Per CONTEXT.md: Shows "filename - X/Y done" format for progress visibility.
 * Auto-selects if only one batch exists.
 */
export function BatchSelector({ projectId, selectedId, onSelect }: BatchSelectorProps) {
  const [batches, setBatches] = useState<BatchWithProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setBatches([]);
      return;
    }

    loadBatches(projectId);
  }, [projectId]);

  async function loadBatches(projId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await sendToBackground<BatchesResponse>({
        type: 'GET_BATCHES',
        payload: { projectId: projId },
      });

      if (response.success) {
        const fetchedBatches = response.data.batches;
        setBatches(fetchedBatches);

        // Per CONTEXT.md: Auto-select if only one batch
        if (fetchedBatches.length === 1 && fetchedBatches[0]) {
          const batch = fetchedBatches[0];
          onSelect(batch.id, batch.rowCount);
        }
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value) {
      const batch = batches.find((b) => b.id === value);
      if (batch) {
        onSelect(value, batch.rowCount);
      }
    }
  }

  function formatBatchOption(batch: BatchWithProgress): string {
    return `${batch.filename} - ${batch.doneCount}/${batch.rowCount} done`;
  }

  // Disabled state when no project selected
  if (!projectId) {
    return (
      <div className="space-y-1">
        <label htmlFor="batch-select" className="text-xs font-medium text-gray-500">
          Batch
        </label>
        <select
          id="batch-select"
          disabled
          className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-md text-gray-400 cursor-not-allowed"
        >
          <option value="">Select a project first</option>
        </select>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Batch</label>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading batches...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Batch</label>
        <div className="space-y-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => loadBatches(projectId)}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Batch</label>
        <div className="text-sm text-gray-500">
          No pending batches.{' '}
          <a
            href="http://localhost:3000/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Upload data in the web app
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor="batch-select" className="text-xs font-medium text-gray-500">
        Batch
      </label>
      <select
        id="batch-select"
        value={selectedId ?? ''}
        onChange={handleChange}
        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      >
        <option value="">Select a batch</option>
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {formatBatchOption(batch)}
          </option>
        ))}
      </select>
    </div>
  );
}
