"use client";

import { FileSpreadsheet, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BatchEmptyStateProps {
  onUploadClick: () => void;
}

export function BatchEmptyState({ onUploadClick }: BatchEmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border-[1.5px] border-dashed border-mocha-300 bg-card px-6 py-10 text-center">
      <span className="mb-4 grid size-[60px] place-items-center rounded-lg border border-latte-300 bg-latte-100">
        <FileSpreadsheet className="size-7 text-espresso-700" />
      </span>
      <h3 className="mb-1.5 text-lg font-bold text-foreground">
        Nenhuma planilha ainda
      </h3>
      <p className="mb-5 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
        Importe sua primeira planilha para começar. A gente cuida do resto — você
        só dá nome às colunas e parte para o preenchimento.
      </p>
      <Button
        onClick={onUploadClick}
        size="lg"
        className="bg-gold font-bold text-gold-foreground hover:bg-gold-600"
      >
        <Upload className="size-[18px]" />
        Importar planilha
      </Button>
      <p className="mt-3 text-[11.5px] text-mocha-400">
        .xlsx ou .xls · até 5 MB
      </p>
    </div>
  );
}
