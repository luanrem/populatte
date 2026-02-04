"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMappingModal({ open, onOpenChange }: NewMappingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar novo mapping</DialogTitle>
          <DialogDescription>
            Mappings sao criados diretamente na extensao do navegador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Instale a extensao Populatte no Chrome</li>
            <li>Abra o site onde deseja preencher formularios</li>
            <li>Clique no icone da extensao e selecione este projeto</li>
            <li>Use o modo de captura para mapear os campos do formulario</li>
          </ol>

          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs text-muted-foreground">
              O mapping sera associado automaticamente a URL do site.
            </p>
            <p className="text-xs text-muted-foreground">
              Voce pode editar os campos capturados aqui no dashboard.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
