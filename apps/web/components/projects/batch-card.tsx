"use client";

import Link from "next/link";
import { Calendar, FileSpreadsheet, Rows, Settings, Trash2 } from "lucide-react";

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

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr);
  const deltaMs = now - date.getTime();

  const deltaMinutes = Math.floor(deltaMs / (1000 * 60));
  const deltaHours = Math.floor(deltaMs / (1000 * 60 * 60));
  const deltaDays = Math.floor(deltaMs / (1000 * 60 * 60 * 24));
  const deltaWeeks = Math.floor(deltaMs / (1000 * 60 * 60 * 24 * 7));
  const deltaMonths = Math.floor(deltaMs / (1000 * 60 * 60 * 24 * 30));

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (deltaMinutes < 1) {
    return "agora mesmo";
  } else if (deltaMinutes < 60) {
    return rtf.format(-deltaMinutes, "minute");
  } else if (deltaHours < 24) {
    return rtf.format(-deltaHours, "hour");
  } else if (deltaDays < 7) {
    return rtf.format(-deltaDays, "day");
  } else if (deltaWeeks < 4) {
    return rtf.format(-deltaWeeks, "week");
  } else {
    return rtf.format(-deltaMonths, "month");
  }
}

export function BatchCard({
  batch,
  projectId,
  onSettingsClick,
  onDeleteClick,
}: BatchCardProps) {
  const modeConfig = {
    LIST_MODE: {
      text: "Modo Lista",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100",
    },
    PROFILE_MODE: {
      text: "Modo Perfil",
      className:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-100",
    },
  };

  const mode = modeConfig[batch.mode];

  return (
    <Link href={`/projects/${projectId}/batches/${batch.id}`}>
      <Card className="group relative transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span>{batch.name ?? "Sem nome"}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatRelativeDate(batch.createdAt)}</span>
            </div>

            <Badge className={mode.className}>{mode.text}</Badge>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Rows className="h-4 w-4" />
              <span>
                {batch.totalRows} {batch.totalRows === 1 ? "registro" : "registros"}
              </span>
            </div>
          </div>

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
                  <span className="sr-only">Configuracoes</span>
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
