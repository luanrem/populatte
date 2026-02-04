"use client";

import { Layers, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MappingsEmptyStateProps {
  onNewClick?: () => void;
}

export function MappingsEmptyState({ onNewClick }: MappingsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Layers className="size-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Nenhum mapping criado</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Mappings sao criados pela extensao do navegador. Abra o site de destino
        e use a extensao para capturar os campos.
      </p>
      {onNewClick && (
        <Button className="mt-6" onClick={onNewClick}>
          <Plus className="size-4" />
          Novo Mapping
        </Button>
      )}
    </div>
  );
}
