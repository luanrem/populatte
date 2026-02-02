"use client";

import { Table2, LayoutGrid } from "lucide-react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

export type ViewMode = "table" | "inventory";

interface BatchViewToggleProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
}

export function BatchViewToggle({
  value,
  onValueChange,
}: BatchViewToggleProps) {
  const handleValueChange = (newValue: string) => {
    // Guard against empty string (when user clicks already-selected item)
    if (newValue) {
      onValueChange(newValue as ViewMode);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Visualizacao:</span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={handleValueChange}
      >
        <ToggleGroupItem value="table" aria-label="Ver tabela">
          <Table2 className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="inventory" aria-label="Ver inventario de campos">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
