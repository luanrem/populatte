'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Edit,
  Trash2,
  Type,
  MousePointerClick,
  Clock,
  CheckCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Step, StepAction } from '@/lib/api/schemas/step.schema';
import { useDeleteStep } from '@/lib/query/hooks';
import { cn } from '@/lib/utils';

interface StepCardProps {
  step: Step;
  index: number;
  projectId: string;
  mappingId: string;
  onEdit: () => void;
  isDragOverlay?: boolean;
}

// Action type colors for left border stripe (from CONTEXT.md)
const actionColors: Record<StepAction, string> = {
  fill: 'border-l-blue-500',
  click: 'border-l-green-500',
  wait: 'border-l-amber-500',
  verify: 'border-l-purple-500',
};

// Action type icons
const actionIcons: Record<StepAction, typeof Type> = {
  fill: Type,
  click: MousePointerClick,
  wait: Clock,
  verify: CheckCircle,
};

// Action type labels (Portuguese)
const actionLabels: Record<StepAction, string> = {
  fill: 'Preencher',
  click: 'Clicar',
  wait: 'Aguardar',
  verify: 'Verificar',
};

export function StepCard({
  step,
  index,
  projectId,
  mappingId,
  onEdit,
  isDragOverlay = false,
}: StepCardProps) {
  const deleteStep = useDeleteStep(projectId, mappingId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled: isDragOverlay });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const ActionIcon = actionIcons[step.action];

  function handleDelete() {
    deleteStep.mutate({ stepId: step.id });
  }

  return (
    <div ref={isDragOverlay ? undefined : setNodeRef} style={style}>
      <Card
        className={cn(
          'border-l-4',
          actionColors[step.action],
          isDragging && 'opacity-50',
          isDragOverlay && 'shadow-lg opacity-90',
        )}
      >
        <div className="flex items-center gap-3 p-4">
          {/* Drag handle */}
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>

          {/* Step number */}
          <span className="min-w-[24px] text-sm font-medium text-muted-foreground">
            {index + 1}
          </span>

          {/* Action type icon */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md bg-muted"
            title={actionLabels[step.action]}
          >
            <ActionIcon className="h-4 w-4" />
          </div>

          {/* Selector (monospace, truncated) */}
          <code className="flex-1 truncate font-mono text-sm text-muted-foreground">
            {step.selector.value}
          </code>

          {/* Source column or fixed value */}
          {step.sourceFieldKey && (
            <span className="text-sm text-muted-foreground">
              {step.sourceFieldKey}
            </span>
          )}
          {step.fixedValue && (
            <span className="text-sm italic text-muted-foreground">
              &quot;{step.fixedValue}&quot;
            </span>
          )}
          {step.action === 'wait' && step.waitMs && (
            <span className="text-sm text-muted-foreground">{step.waitMs}ms</span>
          )}

          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
          >
            <Edit className="h-4 w-4" />
          </Button>

          {/* Delete button with confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir passo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acao nao pode ser desfeita. O passo sera removido
                  permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}
