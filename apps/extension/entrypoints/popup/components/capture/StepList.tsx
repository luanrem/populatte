/**
 * StepList Component
 *
 * Displays captured steps with drag-and-drop reordering support.
 * Uses dnd-kit for accessible and performant sorting.
 */

import { useMemo } from 'react';
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
import { Clock, GripVertical, MousePointer, Pencil, Trash2 } from 'lucide-react';

/**
 * Represents a captured step in the mapping flow.
 */
export interface CaptureStep {
  /** Temporary ID for list management */
  id: string;
  /** Step execution order (1-based) */
  stepNumber: number;
  /** Action to perform on the element */
  action: 'fill' | 'click' | 'wait';
  /** Primary CSS selector */
  selector?: {
    type: 'css';
    value: string;
  };
  /** Fallback selectors if primary fails */
  fallbacks?: Array<{ type: 'css'; value: string }>;
  /** HTML element type (input, button, select, etc.) */
  elementType?: string;
  /** Element name or identifier for display */
  elementName?: string;
  /** Source column key from batch data */
  sourceFieldKey?: string;
  /** Fixed value to use instead of column */
  fixedValue?: string;
  /** Clear field before filling */
  clearBefore?: boolean;
  /** Press Enter after filling */
  pressEnter?: boolean;
  /** Wait duration in milliseconds (for wait action) */
  waitMs?: number;
  /** Skip step if element not found */
  optional?: boolean;
}

interface StepListProps {
  /** List of captured steps */
  steps: CaptureStep[];
  /** Callback when steps are reordered */
  onReorder: (steps: CaptureStep[]) => void;
  /** Callback to edit a step */
  onEdit: (stepId: string) => void;
  /** Callback to delete a step */
  onDelete: (stepId: string) => void;
  /** Callback to highlight an element on the page */
  onHighlight: (stepNumber: number) => void;
}

/**
 * SortableStepItem - Individual step in the sortable list
 */
function SortableStepItem({
  step,
  onEdit,
  onDelete,
  onHighlight,
}: {
  step: CaptureStep;
  onEdit: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onHighlight: (stepNumber: number) => void;
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

  // Determine source display text
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

  function handleRowClick(e: React.MouseEvent) {
    // Don't trigger highlight if clicking on buttons or drag handle
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-drag-handle]')) {
      return;
    }
    onHighlight(step.stepNumber);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer"
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
        {step.stepNumber}
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

      {/* Action buttons */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(step.id);
        }}
        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
        title="Edit step"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(step.id);
        }}
        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
        title="Delete step"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * StepList - Sortable list of captured steps with drag-and-drop
 */
export function StepList({
  steps,
  onReorder,
  onEdit,
  onDelete,
  onHighlight,
}: StepListProps) {
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);

      // Reorder and update step numbers
      const reordered = arrayMove(steps, oldIndex, newIndex).map((step, index) => ({
        ...step,
        stepNumber: index + 1,
      }));

      onReorder(reordered);
    }
  }

  // Empty state
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MousePointer className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">
          Click elements on the page to capture steps
        </p>
      </div>
    );
  }

  return (
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
              onEdit={onEdit}
              onDelete={onDelete}
              onHighlight={onHighlight}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
