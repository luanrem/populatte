"use client";

import { Plus } from "lucide-react";

import { Card } from "@/components/ui/card";

interface NewImportTileProps {
  onClick: () => void;
}

export function NewImportTile({ onClick }: NewImportTileProps) {
  return (
    <Card
      className="flex items-center justify-center border-dashed cursor-pointer transition-all hover:border-gold/50 hover:bg-gold/[0.02] min-h-[112px]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
          <Plus className="size-5" />
        </div>
        <span className="text-sm font-medium">Nova importação</span>
      </div>
    </Card>
  );
}
