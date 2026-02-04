/**
 * FillControls Component
 *
 * Fill cycle control buttons: Fill, Next, and Mark Error.
 * Follows COPILOTO mode where user manually advances after each fill.
 */

import { useState } from 'react';
import type { FillStatus } from '../../../src/types';
import { ErrorInput } from './ErrorInput';

interface FillControlsProps {
  batchId: string | null;
  fillStatus: FillStatus;
  fillProgress: { current: number; total: number } | null;
  fillError: string | null;
  onFill: () => void;
  onNext: () => void;
  onMarkError: (reason?: string) => void;
}

export function FillControls({
  batchId,
  fillStatus,
  fillProgress,
  fillError,
  onFill,
  onNext,
  onMarkError,
}: FillControlsProps) {
  const [showErrorInput, setShowErrorInput] = useState(false);
  const [errorReason, setErrorReason] = useState('');
  const [markingError, setMarkingError] = useState(false);

  const isFilling = fillStatus === 'filling';
  const canConfirm = fillStatus === 'success' || fillStatus === 'partial' || fillStatus === 'failed';
  const hasBatch = batchId !== null;

  // Fill button text
  function getFillButtonText(): string {
    if (isFilling && fillProgress) {
      return `Filling ${fillProgress.current}/${fillProgress.total}...`;
    }
    return 'Fill';
  }

  // Handle mark error submission
  async function handleMarkErrorSubmit() {
    setMarkingError(true);
    try {
      onMarkError(errorReason.trim() || undefined);
      setShowErrorInput(false);
      setErrorReason('');
    } finally {
      setMarkingError(false);
    }
  }

  // Handle mark error cancel
  function handleMarkErrorCancel() {
    setShowErrorInput(false);
    setErrorReason('');
  }

  return (
    <div className="space-y-3">
      {/* Error display */}
      {fillError && (
        <div className="p-2 bg-red-50 rounded-md border border-red-200">
          <p className="text-sm text-red-600">{fillError}</p>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2">
        <button
          onClick={onFill}
          disabled={!hasBatch || isFilling}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {getFillButtonText()}
        </button>
        <button
          onClick={onNext}
          disabled={!canConfirm}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
        <button
          onClick={() => setShowErrorInput(!showErrorInput)}
          disabled={!hasBatch}
          className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
        >
          Mark Error
        </button>
      </div>

      {/* Error input form */}
      {showErrorInput && (
        <ErrorInput
          value={errorReason}
          onChange={setErrorReason}
          onSubmit={handleMarkErrorSubmit}
          onCancel={handleMarkErrorCancel}
          loading={markingError}
        />
      )}
    </div>
  );
}
