"use client";

import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectResponse } from "@/lib/api/schemas/project.schema";

interface ProjectCardProps {
  project: ProjectResponse;
  onEdit: (project: ProjectResponse) => void;
  onDelete: (project: ProjectResponse) => void;
  onToggleArchive: (project: ProjectResponse) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onToggleArchive,
}: ProjectCardProps) {
  const isArchived = project.status === "archived";

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="truncate">{project.name}</span>
              {isArchived && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Arquivado
                </Badge>
              )}
            </CardTitle>
            {project.description && (
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Ações do projeto</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Pencil />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchive(project)}>
                {isArchived ? <ArchiveRestore /> : <Archive />}
                {isArchived ? "Desarquivar" : "Arquivar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(project)}
              >
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {project.targetEntity && (
            <Badge variant="outline" className="text-xs font-normal">
              {project.targetEntity}
            </Badge>
          )}
          {project.targetUrl && (
            <Badge variant="outline" className="text-xs font-normal">
              <ExternalLink className="size-3" />
              URL definida
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
