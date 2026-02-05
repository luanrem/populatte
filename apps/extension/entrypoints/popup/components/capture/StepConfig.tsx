/**
 * StepConfig Component
 *
 * Configuration panel for captured steps.
 * Allows configuring action type, source, and options.
 */

import { useState, useMemo } from 'react';
import { Clock, MousePointer, Pencil, Search, Target } from 'lucide-react';
import type { CaptureStep } from './StepList';

interface StepConfigProps {
  /** Step to edit, or null for new wait step */
  step: CaptureStep | null;
  /** Available columns from batch */
  columns: string[];
  /** Callback to save the step */
  onSave: (step: CaptureStep) => void;
  /** Callback to cancel editing */
  onCancel: () => void;
  /** True for new step, false for editing existing */
  isNew: boolean;
  /** Callback to highlight element on page */
  onHighlight?: (step: CaptureStep) => void;
}

type SourceMode = 'column' | 'fixed';

/**
 * StepConfig - Step configuration form
 */
export function StepConfig({
  step,
  columns,
  onSave,
  onCancel,
  isNew,
  onHighlight,
}: StepConfigProps) {
  console.log('[StepConfig] Received columns:', columns?.length ?? 0, columns);

  // Initialize state from step or defaults
  const [action, setAction] = useState<'fill' | 'click' | 'wait'>(step?.action ?? 'wait');
  const [sourceMode, setSourceMode] = useState<SourceMode>(
    step?.fixedValue ? 'fixed' : 'column'
  );
  const [sourceFieldKey, setSourceFieldKey] = useState(step?.sourceFieldKey ?? '');
  const [fixedValue, setFixedValue] = useState(step?.fixedValue ?? '');
  const [waitMs, setWaitMs] = useState(step?.waitMs ?? 1000);
  const [optional, setOptional] = useState(step?.optional ?? false);
  const [clearBefore, setClearBefore] = useState(step?.clearBefore ?? false);
  const [pressEnter, setPressEnter] = useState(step?.pressEnter ?? false);
  const [columnSearch, setColumnSearch] = useState('');
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!columnSearch) {
      return columns;
    }
    const search = columnSearch.toLowerCase();
    return columns.filter((col) => col.toLowerCase().includes(search));
  }, [columns, columnSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (action === 'fill') {
      if (sourceMode === 'column' && !sourceFieldKey) {
        setValidationError('Please select a source column');
        return;
      }
      if (sourceMode === 'fixed' && !fixedValue.trim()) {
        setValidationError('Please enter a fixed value');
        return;
      }
    }

    if (action === 'wait' && waitMs <= 0) {
      setValidationError('Wait duration must be greater than 0');
      return;
    }

    // Build updated step
    const updatedStep: CaptureStep = {
      id: step?.id ?? crypto.randomUUID(),
      stepNumber: step?.stepNumber ?? 0, // Will be assigned by parent
      action,
      selector: step?.selector,
      fallbacks: step?.fallbacks,
      elementType: step?.elementType,
      elementName: step?.elementName,
      optional,
      ...(action === 'fill' && {
        sourceFieldKey: sourceMode === 'column' ? sourceFieldKey : undefined,
        fixedValue: sourceMode === 'fixed' ? fixedValue : undefined,
        clearBefore,
        pressEnter,
      }),
      ...(action === 'wait' && {
        waitMs,
      }),
    };

    onSave(updatedStep);
  }

  function handleColumnSelect(column: string) {
    setSourceFieldKey(column);
    setColumnSearch('');
    setShowColumnDropdown(false);
  }

  function handleHighlightClick() {
    if (step && onHighlight) {
      onHighlight(step);
    }
  }

  // Determine if this is a wait-only step (no selector)
  const isWaitStep = !step?.selector;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Action Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Action Type
        </label>
        <div className="flex gap-2">
          {!isWaitStep && (
            <>
              <button
                type="button"
                onClick={() => setAction('fill')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${
                  action === 'fill'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Pencil className="w-4 h-4" />
                <span className="text-sm">Fill</span>
              </button>
              <button
                type="button"
                onClick={() => setAction('click')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${
                  action === 'click'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MousePointer className="w-4 h-4" />
                <span className="text-sm">Click</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setAction('wait')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${
              action === 'wait'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm">Wait</span>
          </button>
        </div>
      </div>

      {/* Source Section (fill only) */}
      {action === 'fill' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Source
          </label>

          {/* Source mode toggle */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSourceMode('column')}
              className={`flex-1 px-3 py-1.5 rounded text-sm ${
                sourceMode === 'column'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Column
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('fixed')}
              className={`flex-1 px-3 py-1.5 rounded text-sm ${
                sourceMode === 'fixed'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Fixed Value
            </button>
          </div>

          {/* Column dropdown */}
          {sourceMode === 'column' && (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={columnSearch || sourceFieldKey}
                  onChange={(e) => {
                    setColumnSearch(e.target.value);
                    setShowColumnDropdown(true);
                  }}
                  onFocus={() => setShowColumnDropdown(true)}
                  placeholder="Search columns..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {showColumnDropdown && filteredColumns.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      onClick={() => handleColumnSelect(column)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                        column === sourceFieldKey ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      {column}
                    </button>
                  ))}
                </div>
              )}
              {showColumnDropdown && filteredColumns.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg p-3">
                  <p className="text-sm text-gray-500">No columns found</p>
                </div>
              )}
            </div>
          )}

          {/* Fixed value input */}
          {sourceMode === 'fixed' && (
            <input
              type="text"
              value={fixedValue}
              onChange={(e) => setFixedValue(e.target.value)}
              placeholder="Enter fixed value..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      {/* Wait Section (wait only) */}
      {action === 'wait' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wait Duration
          </label>

          {/* Quick presets */}
          <div className="flex gap-2 mb-3">
            {[500, 1000, 2000].map((ms) => (
              <button
                key={ms}
                type="button"
                onClick={() => setWaitMs(ms)}
                className={`flex-1 px-3 py-1.5 rounded text-sm ${
                  waitMs === ms
                    ? 'bg-blue-50 border-blue-500 text-blue-700 border'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={waitMs}
              onChange={(e) => setWaitMs(Math.max(0, parseInt(e.target.value, 10) || 0))}
              min={0}
              step={100}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">ms</span>
          </div>
        </div>
      )}

      {/* Options Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Options
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={optional}
              onChange={(e) => setOptional(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Optional (skip if not found)</span>
          </label>

          {action === 'fill' && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={clearBefore}
                  onChange={(e) => setClearBefore(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Clear field before filling</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pressEnter}
                  onChange={(e) => setPressEnter(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Press Enter after filling</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Selector display (read-only) */}
      {step?.selector && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Selector
          </label>
          <div className="flex items-start gap-2">
            <code className="flex-1 p-2 bg-gray-50 border rounded text-xs font-mono text-gray-700 break-all">
              {step.selector.value}
            </code>
            {onHighlight && (
              <button
                type="button"
                onClick={handleHighlightClick}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Highlight target element"
              >
                <Target className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {isNew ? 'Add Step' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
