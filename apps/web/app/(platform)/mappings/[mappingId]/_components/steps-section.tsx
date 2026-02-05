'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Step } from '@/lib/api/schemas/step.schema';

import { StepCard } from './step-card';
import { StepEditorModal } from './step-editor-modal';

interface StepsSectionProps {
  steps: Step[];
  projectId: string;
  mappingId: string;
  onStepsChange: (orderedIds: string[]) => void;
  excelColumns: string[];
}

export function StepsSection({
  steps,
  projectId,
  mappingId,
  onStepsChange,
  excelColumns,
}: StepsSectionProps) {
  // Track step IDs for drag-and-drop ordering
  // We derive the initial order from props and only track local reordering
  const stepIdsFromProps = steps.map((s) => s.id).join(',');
  const [orderedStepIds, setOrderedStepIds] = useState<string[]>(() =>
    steps.map((s) => s.id),
  );
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastSyncedIds, setLastSyncedIds] = useState(stepIdsFromProps);

  // Sync orderedStepIds when steps prop changes (e.g., after save or server update)
  // Only update if the prop IDs actually changed (avoids cascading renders)
  if (stepIdsFromProps !== lastSyncedIds) {
    setOrderedStepIds(steps.map((s) => s.id));
    setLastSyncedIds(stepIdsFromProps);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press for touch devices
        tolerance: 5,
      },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedStepIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const reordered = arrayMove(items, oldIndex, newIndex);
        onStepsChange(reordered); // Notify parent of reorder
        return reordered;
      });
    }
  }

  function handleAddStep() {
    setEditingStep(null);
    setIsModalOpen(true);
  }

  function handleEditStep(step: Step) {
    setEditingStep(step);
    setIsModalOpen(true);
  }

  function handleModalClose() {
    setIsModalOpen(false);
    setEditingStep(null);
  }

  // Build ordered steps array from orderedStepIds
  const orderedSteps = orderedStepIds
    .map((id) => steps.find((s) => s.id === id))
    .filter((s): s is Step => s !== undefined);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Passos</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {steps.length}
          </span>
        </div>
        <Button size="sm" onClick={handleAddStep}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Passo
        </Button>
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="mb-4 text-sm text-muted-foreground">
            Nenhum passo configurado
          </p>
          <Button variant="outline" onClick={handleAddStep}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Passo
          </Button>
        </div>
      ) : (
        <div className="max-h-[500px] overflow-y-auto pr-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedStepIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {orderedSteps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    projectId={projectId}
                    mappingId={mappingId}
                    onEdit={() => handleEditStep(step)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Step editor modal */}
      <StepEditorModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        step={editingStep}
        projectId={projectId}
        mappingId={mappingId}
        excelColumns={excelColumns}
      />
    </div>
  );
}
