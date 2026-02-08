/**
 * CompactIconGrid Component
 *
 * Compact mode view for the Preencher (Fill) tab.
 * Displays mapping steps as a grid of action icons with badges and tooltips.
 */

import { useState, useRef, useEffect } from 'react';
import { Pencil, MousePointer, Clock, AlertTriangle } from 'lucide-react';
import type { MappingStep } from '../../../../src/api/mappings';

interface CompactIconGridProps {
  /** Steps from fetchMappingWithSteps */
  steps: MappingStep[];
  /** stepId -> isValid (true = found on page) */
  validation: Map<string, boolean>;
  /** Highlight element on page when step clicked */
  onStepClick: (step: MappingStep) => Promise<void>;
}

/**
 * CompactStepIcon - Individual step icon
 */
function CompactStepIcon({
  step,
  isInvalid,
  onStepClick,
}: {
  step: MappingStep;
  isInvalid: boolean;
  onStepClick: (step: MappingStep) => Promise<void>;
}) {
  const [clickResult, setClickResult] = useState<'success' | 'failed' | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Action icon selection (same logic as PreencherStepList)
  const ActionIcon =
    step.action === 'fill' ? Pencil : step.action === 'click' ? MousePointer : Clock;

  // Tooltip text: "fill | #inputCnpj | CNPJ" or "wait | 500ms"
  const tooltipText =
    step.action === 'wait'
      ? `wait | ${step.waitMs ?? 0}ms`
      : [step.action, step.selector?.value ?? '', step.sourceFieldKey ?? step.fixedValue ?? '']
          .filter(Boolean)
          .join(' | ');

  async function handleClick() {
    try {
      await onStepClick(step);
      setClickResult('success');
    } catch (err) {
      console.error('[CompactStepIcon] Click failed:', err);
      setClickResult('failed');
    }

    // Clear result badge after 1500ms
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setClickResult(null);
    }, 1500);
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative flex items-center justify-center w-full aspect-square bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 group/tooltip transition-colors"
    >
      <ActionIcon className="w-6 h-6 text-gray-600" />

      {/* Step number badge - top-right, notification style */}
      <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
        {step.stepOrder}
      </span>

      {/* Invalid selector warning - top-left, always visible */}
      {isInvalid && (
        <span className="absolute top-0.5 left-0.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </span>
      )}

      {/* Group-hover tooltip (Phase 37 pattern - instant, no delay) */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-opacity pointer-events-none z-50">
        {tooltipText}
      </div>

      {/* Temporary click result badge - bottom-right corner */}
      {clickResult && (
        <span
          className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full ${
            clickResult === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      )}
    </button>
  );
}

/**
 * CompactIconGrid - Grid of step action icons
 */
export function CompactIconGrid({ steps, validation, onStepClick }: CompactIconGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-2 overflow-y-auto flex-1">
      {steps.map((step) => (
        <CompactStepIcon
          key={step.id}
          step={step}
          isInvalid={validation.get(step.id) === false}
          onStepClick={onStepClick}
        />
      ))}
    </div>
  );
}
