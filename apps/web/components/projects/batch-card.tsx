"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileSpreadsheet,
  Settings,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BatchResponse } from "@/lib/api/schemas/batch.schema";

interface BatchCardProps {
  batch: BatchResponse;
  projectId: string;
  onSettingsClick?: (batch: BatchResponse) => void;
  onDeleteClick?: (batch: BatchResponse) => void;
}

export function BatchCard({
  batch,
  projectId,
  onSettingsClick,
  onDeleteClick,
}: BatchCardProps) {
  const modeLabel =
    batch.mode === "LIST_MODE"
      ? "Uma linha por registro"
      : "Um registro por arquivo";

  const rowLabel =
    batch.totalRows === 1
      ? "1 registro"
      : `${batch.totalRows} registros`;

  return (
    <Link href={`/projects/${projectId}/batches/${batch.id}`}>
      <Card className="group relative transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-[42px] shrink-0 items-center justify-center rounded-lg bg-success-soft">
            <FileSpreadsheet className="size-[34px] text-success-text" />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span className="font-medium text-foreground truncate">
              {batch.name ?? "Sem nome"}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="text-xs font-normal"
              >
                {modeLabel}
              </Badge>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <Badge
                variant="secondary"
                className="text-xs font-normal"
              >
                {rowLabel}
              </Badge>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <Badge className="bg-gold/10 text-gold hover:bg-gold/10 text-xs font-normal gap-1">
                Significado: pendente
                <ArrowRight className="size-3" />
              </Badge>
            </div>
          </div>

          <ChevronRight className="size-5 text-muted-foreground/40 shrink-0" />

          {(onSettingsClick || onDeleteClick) && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {onSettingsClick && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onSettingsClick(batch)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Configurações</span>
                </Button>
              )}
              {onDeleteClick && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDeleteClick(batch)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
