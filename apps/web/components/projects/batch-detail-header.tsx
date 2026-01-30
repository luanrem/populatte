"use client";

import { Calendar, FileSpreadsheet, Rows } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import type { BatchResponse } from "@/lib/api/schemas/batch.schema";

interface BatchDetailHeaderProps {
  batch: BatchResponse;
  projectId: string;
  projectName: string;
}

export function BatchDetailHeader({
  batch,
  projectId,
  projectName,
}: BatchDetailHeaderProps) {
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

  const statusConfig = {
    COMPLETED: {
      text: "Concluido",
      className:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 hover:bg-emerald-100",
    },
    PROCESSING: {
      text: "Processando",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100",
    },
    FAILED: {
      text: "Falhou",
      className:
        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-100",
    },
  };

  const mode = modeConfig[batch.mode];
  const status = statusConfig[batch.status];

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/projects">Projetos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/projects/${projectId}`}>
              {projectName}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{batch.name ?? "Importacao"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            {batch.name ?? "Sem nome"}
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge className={mode.className}>{mode.text}</Badge>
            <Badge className={status.className}>{status.text}</Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatter.format(new Date(batch.createdAt))}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Rows className="h-4 w-4" />
              <span>
                {batch.totalRows}{" "}
                {batch.totalRows === 1 ? "registro" : "registros"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
