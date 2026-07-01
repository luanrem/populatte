"use client";

import { GitCompareArrows, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MappingListItem } from "@/lib/api/schemas/mapping.schema";

interface MappingCardProps {
  mapping: MappingListItem;
  onEdit?: (mapping: MappingListItem) => void;
  onDelete?: (mapping: MappingListItem) => void;
}

export function MappingCard({ mapping, onEdit, onDelete }: MappingCardProps) {
  return (
    <Card className="group relative transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-[42px] shrink-0 items-center justify-center rounded-lg bg-success-soft">
            <GitCompareArrows className="size-[34px] text-success-text" />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground truncate">
                {mapping.name}
              </h4>
              <Badge
                variant={mapping.isActive ? "default" : "secondary"}
                className={
                  mapping.isActive
                    ? "bg-success-soft text-success-text hover:bg-success-soft"
                    : ""
                }
              >
                {mapping.isActive ? "pronto p/ usar" : "inativo"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground font-mono truncate">
              {mapping.targetUrl}
            </p>

            <p className="text-xs text-muted-foreground">
              {mapping.stepCount}{" "}
              {mapping.stepCount === 1 ? "passo" : "passos"}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={(e) => {
              e.preventDefault();
              onEdit?.(mapping);
            }}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        </div>

        {onDelete && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(mapping)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Excluir</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
