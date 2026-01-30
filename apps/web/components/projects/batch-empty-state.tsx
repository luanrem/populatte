"use client";

import { FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BatchEmptyStateProps {
  onUploadClick: () => void;
}

export function BatchEmptyState({ onUploadClick }: BatchEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 mb-6">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mt-2">
        Nenhuma importacao ainda
      </h3>
      <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
        Clique em &quot;Nova Importacao&quot; acima para enviar sua primeira planilha.
      </p>
      <Button onClick={onUploadClick} className="mt-6">
        <Upload className="mr-2 h-4 w-4" />
        Enviar planilha
      </Button>
    </div>
  );
}
