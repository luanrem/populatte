/**
 * PreencherStepList Component
 *
 * Read-only steps list for the Preencher (Fill) tab.
 * Displays mapping steps with validation badges, fill results, and drag-and-drop reordering.
 */

import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  MousePointer,
  Pencil,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { MappingStep } from '../../../../src/api/mappings';

interface PreencherStepListProps {
  /** Steps from fetchMappingWithSteps */
  steps: MappingStep[];
  /** stepId -> isValid (true = found on page) */
  validation: Map<string, boolean>;
  /** stepId -> fill status */
  fillResults: Map<string, 'success' | 'failed'>;
  /** Highlight element on page when step clicked */
  onStepClick: (step: MappingStep) => void;
  /** Reorder callback with updated stepOrder */
  onReorder: (steps: MappingStep[]) => void;
}

/**
 * SortableStepItem - Individual step row
 */
function SortableStepItem({
  step,
  validation,
  fillResults,
  onStepClick,
}: {
  step: MappingStep;
  validation: Map<string, boolean>;
  fillResults: Map<string, 'success' | 'failed'>;
  onStepClick: (step: MappingStep) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine action icon
  const ActionIcon = step.action === 'fill'
    ? Pencil
    : step.action === 'click'
      ? MousePointer
      : Clock;

  // Source field display
  function getSourceDisplay(): string {
    if (step.action === 'wait') {
      return `${step.waitMs ?? 0}ms`;
    }
    if (step.action === 'click') {
      return '(click only)';
    }
    if (step.sourceFieldKey) {
      return step.sourceFieldKey;
    }
    if (step.fixedValue) {
      return `"${step.fixedValue}"`;
    }
    return '(no source)';
  }

  // Truncate selector for display
  function getTruncatedSelector(): string {
    const selector = step.selector?.value ?? '';
    if (selector.length <= 30) {
      return selector;
    }
    return `${selector.slice(0, 27)}...`;
  }

  // Check validation status
  const isInvalid = validation.get(step.id) === false;
  const fillResult = fillResults.get(step.id);

  function handleRowClick(e: React.MouseEvent) {
    // Don't trigger click if clicking drag handle
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle]')) {
      return;
    }
    onStepClick(step);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer group"
      onClick={handleRowClick}
    >
      {/* Drag handle */}
      <button
        type="button"
        data-drag-handle
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Step number badge */}
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
        {step.stepOrder}
      </span>

      {/* Action icon */}
      <ActionIcon className="flex-shrink-0 w-4 h-4 text-gray-500" />

      {/* Step info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {getSourceDisplay()}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {getTruncatedSelector()}
        </div>
      </div>

      {/* Validation badge - red dot with tooltip */}
      {isInvalid && (
        <div className="relative group/tooltip">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          {/* Tooltip - same pattern as TabBar */}
          <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-opacity pointer-events-none z-50">
            Seletor nao encontrado: {step.selector?.value}
          </div>
        </div>
      )}

      {/* Fill result indicator */}
      {fillResult === 'success' && (
        <CheckCircle className="flex-shrink-0 w-4 h-4 text-green-600" />
      )}
      {fillResult === 'failed' && (
        <XCircle className="flex-shrink-0 w-4 h-4 text-red-600" />
      )}
    </div>
  );
}

/**
 * PreencherStepList - Collapsible, sortable steps list
 */
export function PreencherStepList({
  steps,
  validation,
  fillResults,
  onStepClick,
  onReorder,
}: PreencherStepListProps) {
  const [expanded, setExpanded] = useState(false);

  // Configure sensors with delay to distinguish from click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  // Extract step IDs for sortable context
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  // Count invalid steps
  const invalidCount = useMemo(() => {
    return steps.filter((s) => validation.get(s.id) === false).length;
  }, [steps, validation]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);

      // Reorder and update stepOrder values
      const reordered = arrayMove(steps, oldIndex, newIndex).map((step, index) => ({
        ...step,
        stepOrder: index + 1,
      }));

      onReorder(reordered);
    }
  }

  // Empty state
  if (steps.length === 0) {
    return (
      <div className="p-3 text-center text-sm text-gray-400">
        Nenhum passo configurado
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            Passos ({steps.length})
          </span>
          {invalidCount > 0 && (
            <span className="text-xs text-red-500">
              {invalidCount} de {steps.length} passos com problema
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Steps list */}
      {expanded && (
        <div className="p-2 border-t">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {steps.map((step) => (
                  <SortableStepItem
                    key={step.id}
                    step={step}
                    validation={validation}
                    fillResults={fillResults}
                    onStepClick={onStepClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
