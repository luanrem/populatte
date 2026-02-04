"use client";

import { Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MappingListItem } from "@/lib/api/schemas/mapping.schema";

interface DeleteMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  mapping: MappingListItem | null;
  isPending?: boolean;
}

export function DeleteMappingDialog({
  open,
  onOpenChange,
  onConfirm,
  mapping,
  isPending,
}: DeleteMappingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <TriangleAlert className="size-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Excluir mapping</DialogTitle>
              <DialogDescription>
                Esta acao nao pode ser desfeita.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tem certeza que deseja excluir o mapping{" "}
          <strong className="text-foreground">
            {mapping?.name ?? "Sem nome"}
          </strong>
          ? Todos os passos associados serao removidos.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
