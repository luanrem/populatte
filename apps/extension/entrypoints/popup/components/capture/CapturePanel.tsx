/**
 * CapturePanel Component
 *
 * Main container for capture mode in the extension popup.
 * Manages mapping name, step list, and step configuration.
 */

import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Target } from 'lucide-react';
import { StepList, type CaptureStep } from './StepList';
import { StepConfig } from './StepConfig';

interface CapturePanelProps {
  /** Current page URL for the mapping target */
  targetUrl: string;
  /** Available columns from the selected batch */
  columns: string[];
  /** Callback when mapping is saved */
  onSave: (name: string, steps: CaptureStep[]) => void;
  /** Callback to cancel capture mode */
  onCancel: () => void;
  /** Callback to remove a step from content script */
  onRemoveStep?: (stepNumber: number) => void;
  /** Callback to highlight an element on the page */
  onHighlight?: (stepNumber: number) => void;
}

/**
 * CapturePanel - Main capture mode container
 */
export function CapturePanel({
  targetUrl,
  columns,
  onSave,
  onCancel,
  onRemoveStep,
  onHighlight,
}: CapturePanelProps) {
  // State
  const [mappingName, setMappingName] = useState('');
  const [steps, setSteps] = useState<CaptureStep[]>([]);
  const [editingStep, setEditingStep] = useState<CaptureStep | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [addingWait, setAddingWait] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Listen for captured elements from content script
  useEffect(() => {
    const listener = (message: { type: string; payload?: unknown }): undefined | false => {
      if (message.type === 'ELEMENT_CAPTURED') {
        const payload = message.payload as {
          selector: { type: 'css'; value: string };
          fallbacks?: Array<{ type: 'css'; value: string }>;
          elementType?: string;
          elementName?: string;
        };

        // Create new step from captured element
        const newStep: CaptureStep = {
          id: crypto.randomUUID(),
          stepNumber: steps.length + 1,
          action: getDefaultAction(payload.elementType ?? ''),
          selector: payload.selector,
          fallbacks: payload.fallbacks,
          elementType: payload.elementType,
          elementName: payload.elementName,
          optional: false,
          clearBefore: false,
          pressEnter: false,
        };

        setSteps((prev) => [...prev, newStep]);
        // Auto-open config for new step
        setEditingStep(newStep);
        setShowConfig(true);
        setAddingWait(false);

        return undefined;
      }
      return false;
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [steps.length]);

  // Determine default action based on element type
  function getDefaultAction(elementType: string): 'fill' | 'click' | 'wait' {
    const fillTypes = ['input', 'textarea', 'select', 'checkbox', 'radio'];
    const clickTypes = ['button', 'a', 'link'];

    if (fillTypes.includes(elementType.toLowerCase())) {
      return 'fill';
    }
    if (clickTypes.includes(elementType.toLowerCase())) {
      return 'click';
    }
    return 'fill'; // Default to fill
  }

  // Handle step reordering
  const handleReorder = useCallback((newSteps: CaptureStep[]) => {
    setSteps(newSteps);
  }, []);

  // Handle step edit
  const handleEdit = useCallback((stepId: string) => {
    const step = steps.find((s) => s.id === stepId);
    if (step) {
      setEditingStep(step);
      setShowConfig(true);
      setAddingWait(false);
    }
  }, [steps]);

  // Handle step delete
  const handleDelete = useCallback((stepId: string) => {
    const step = steps.find((s) => s.id === stepId);
    if (step && onRemoveStep) {
      onRemoveStep(step.stepNumber);
    }

    setSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== stepId);
      // Re-number steps
      return filtered.map((s, index) => ({
        ...s,
        stepNumber: index + 1,
      }));
    });
  }, [steps, onRemoveStep]);

  // Handle step highlight
  const handleHighlight = useCallback((stepNumber: number) => {
    if (onHighlight) {
      onHighlight(stepNumber);
    }
  }, [onHighlight]);

  // Handle config save
  const handleConfigSave = useCallback((updatedStep: CaptureStep) => {
    if (addingWait) {
      // Adding new wait step
      const newStep: CaptureStep = {
        ...updatedStep,
        stepNumber: steps.length + 1,
      };
      setSteps((prev) => [...prev, newStep]);
    } else if (editingStep) {
      // Editing existing step
      setSteps((prev) =>
        prev.map((s) => (s.id === updatedStep.id ? updatedStep : s))
      );
    }

    setShowConfig(false);
    setEditingStep(null);
    setAddingWait(false);
  }, [addingWait, editingStep, steps.length]);

  // Handle config cancel
  const handleConfigCancel = useCallback(() => {
    setShowConfig(false);
    setEditingStep(null);
    setAddingWait(false);
  }, []);

  // Handle add wait step
  const handleAddWait = useCallback(() => {
    setEditingStep(null);
    setAddingWait(true);
    setShowConfig(true);
  }, []);

  // Handle cancel with confirmation
  const handleCancelClick = useCallback(() => {
    if (steps.length > 0) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  }, [steps.length, onCancel]);

  // Confirm cancel
  const confirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    onCancel();
  }, [onCancel]);

  // Handle save
  const handleSave = useCallback(() => {
    if (mappingName.trim() && steps.length >= 1) {
      onSave(mappingName.trim(), steps);
    }
  }, [mappingName, steps, onSave]);

  // Handle highlight from config
  const handleConfigHighlight = useCallback((step: CaptureStep) => {
    if (onHighlight) {
      onHighlight(step.stepNumber);
    }
  }, [onHighlight]);

  // Can save: has name and at least 1 step
  const canSave = mappingName.trim().length > 0 && steps.length >= 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <Target className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Capture Mode</h2>
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          {steps.length} {steps.length === 1 ? 'step' : 'steps'}
        </span>
      </div>

      {/* Mapping name input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mapping Name
        </label>
        <input
          type="text"
          value={mappingName}
          onChange={(e) => setMappingName(e.target.value)}
          placeholder="e.g., Invoice Form, Client Registration..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto mb-4">
        {showConfig ? (
          <StepConfig
            step={addingWait ? null : editingStep}
            columns={columns}
            onSave={handleConfigSave}
            onCancel={handleConfigCancel}
            isNew={addingWait || (editingStep !== null && steps.findIndex((s) => s.id === editingStep.id) === -1)}
            onHighlight={handleConfigHighlight}
          />
        ) : (
          <>
            <StepList
              steps={steps}
              onReorder={handleReorder}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onHighlight={handleHighlight}
            />

            {/* Add Wait button */}
            {steps.length > 0 && (
              <button
                type="button"
                onClick={handleAddWait}
                className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-dashed rounded-lg hover:bg-gray-100 hover:text-gray-900"
              >
                <Clock className="w-4 h-4" />
                <Plus className="w-3 h-3" />
                Add Wait Step
              </button>
            )}
          </>
        )}
      </div>

      {/* Cancel confirmation overlay */}
      {showCancelConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 max-w-xs">
            <h3 className="font-medium text-gray-900 mb-2">Discard changes?</h3>
            <p className="text-sm text-gray-600 mb-4">
              You have {steps.length} captured {steps.length === 1 ? 'step' : 'steps'}. Are you sure you want to cancel?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!showConfig && (
        <div className="flex gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={handleCancelClick}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Mapping
          </button>
        </div>
      )}

      {/* Target URL indicator */}
      <div className="mt-2 pt-2 border-t">
        <p className="text-xs text-gray-400 truncate" title={targetUrl}>
          Target: {targetUrl}
        </p>
      </div>
    </div>
  );
}
