"use client";

import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectSummaryResponse } from "@/lib/api/schemas/project.schema";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  project: ProjectSummaryResponse | null;
  isPending?: boolean;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  onConfirm,
  project,
  isPending,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-[42px] shrink-0 place-items-center rounded-[11px] border border-terra-200 bg-terra-50">
              <Trash2 className="size-5 text-terra-500" />
            </span>
            <DialogTitle>Excluir projeto?</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            O projeto{" "}
            <strong className="font-bold text-foreground">
              {project?.name}
            </strong>{" "}
            e todos os seus dados serão removidos. Esta ação{" "}
            <strong className="font-bold text-foreground">
              não pode ser desfeita
            </strong>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Excluir projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
