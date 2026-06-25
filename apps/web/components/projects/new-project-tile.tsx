"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface NewProjectTileProps {
  onClick: () => void;
  className?: string;
}

/**
 * Dashed "create project" cell rendered as the last item of the projects grid.
 * Purely presentational — the caller decides when it should appear (only with
 * results, no active query, outside the Archived tab; wired in [integration]).
 */
export function NewProjectTile({ onClick, className }: NewProjectTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[150px] flex-col items-start justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-mocha-300 bg-card p-[18px] text-left transition-colors hover:border-gold-500 hover:bg-latte-50",
        className
      )}
    >
      <span className="grid size-[42px] place-items-center rounded-[12px] border border-latte-300 bg-latte-100">
        <Plus className="size-5 text-espresso-700" />
      </span>
      <span className="text-sm font-semibold text-foreground">
        Novo projeto
      </span>
      <span className="text-xs text-muted-foreground">
        Agrupe importações e mapeamentos
      </span>
    </button>
  );
}
