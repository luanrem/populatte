import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RowIndicatorProps {
  rowIndex: number;
  rowTotal: number;
  identifierPrimary: string | null;
  identifierSecondary: string | null;
  identifierFieldKey: string | null;
  secondaryFieldKey: string | null;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Row position indicator with identifier display
 *
 * Displays current row position and primary/secondary identifier values.
 * Entire block is clickable to copy primary identifier value to clipboard.
 * Long values truncate with ellipsis and show full value in tooltip.
 */
export function RowIndicator({
  rowIndex,
  rowTotal,
  identifierPrimary,
  identifierSecondary,
  identifierFieldKey,
  secondaryFieldKey,
  onPrev,
  onNext,
}: RowIndicatorProps) {
  const [copied, setCopied] = useState(false);

  // Reset copied state after delay
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const handleCopy = async () => {
    // Only copy if there's a primary identifier value
    if (!identifierPrimary) return;

    try {
      await navigator.clipboard.writeText(identifierPrimary);
      setCopied(true);
    } catch (err) {
      console.error('[RowIndicator] Failed to copy:', err);
    }
  };

  if (rowTotal === 0) {
    return (
      <div className="text-center text-sm text-gray-400">
        No rows
      </div>
    );
  }

  // Build tooltip text for primary identifier
  const primaryTooltip = identifierFieldKey && identifierPrimary
    ? `${identifierFieldKey}: ${identifierPrimary}`
    : identifierPrimary || '';

  // Build tooltip text for secondary identifier
  const secondaryTooltip = secondaryFieldKey && identifierSecondary
    ? `${secondaryFieldKey}: ${identifierSecondary}`
    : identifierSecondary || '';

  return (
    <div
      className="bg-gray-50 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCopy();
        }
      }}
    >
      {/* Row number with navigation arrows */}
      <div className="flex items-center justify-center gap-2">
        {/* Previous button - only show when multiple rows */}
        {rowTotal > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            disabled={rowIndex <= 0}
            className="p-0.5 rounded-full hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
            title="Previous row"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Row counter */}
        <div className="text-xs text-gray-500">
          Row {rowIndex + 1} of {rowTotal}
        </div>

        {/* Next button - only show when multiple rows */}
        {rowTotal > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            disabled={rowIndex >= rowTotal - 1}
            className="p-0.5 rounded-full hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
            title="Next row"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Identifiers - only shown when primary identifier has a value */}
      {identifierPrimary && (
        <div className="mt-1 space-y-0.5">
          {/* Primary identifier */}
          <div
            className="font-medium text-gray-900 truncate max-w-[250px] mx-auto"
            title={primaryTooltip}
          >
            {copied ? '✓ Copied!' : identifierPrimary}
          </div>

          {/* Secondary identifier - only if it has a value */}
          {identifierSecondary && (
            <div
              className="text-sm text-gray-600 truncate max-w-[250px] mx-auto"
              title={secondaryTooltip}
            >
              {identifierSecondary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
