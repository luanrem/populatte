"use client";

import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { EntityChip } from "@/components/ui/entity-chip";
import { ProgressMeter } from "@/components/ui/progress-meter";
import {
  StatusBadge,
  type StatusBadgeStatus,
} from "@/components/ui/status-badge";
import { UrlChip } from "@/components/ui/url-chip";
import type { ProjectSummaryResponse } from "@/lib/api/schemas/project.schema";

interface ProjectCardProps {
  project: ProjectSummaryResponse;
  onEdit: (project: ProjectSummaryResponse) => void;
  onDelete: (project: ProjectSummaryResponse) => void;
  onToggleArchive: (project: ProjectSummaryResponse) => void;
}

/**
 * Provisional lifecycle status for the StatusBadge / ProgressMeter color.
 *
 * Real fill progress is not tracked yet (deferred to POP-22), so we derive a
 * placeholder from the only signals available on ProjectSummaryResponse: a
 * project that already points at a target URL is "ready" (awaiting import),
 * otherwise it is still "pending" (being configured). The archive flag is
 * orthogonal — it drives the "Arquivado" pill and the dimmed card, never the
 * lifecycle badge.
 */
function deriveStatus(project: ProjectSummaryResponse): StatusBadgeStatus {
  return project.urls.length > 0 ? "ready" : "pending";
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onToggleArchive,
}: ProjectCardProps) {
  const isArchived = project.status === "archived";
  const status = deriveStatus(project);

  return (
    <Link href={`/projects/${project.id}`} className="group block min-w-0">
      <Card
        className={`gap-0 rounded-lg px-[18px] py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
          isArchived ? "opacity-[0.72]" : ""
        }`}
      >
        {/* top: name (+ archived pill) + kebab */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold leading-tight text-foreground">
                {project.name}
              </span>
              {isArchived && (
                <span className="shrink-0 rounded-full border border-mocha-300 bg-mocha-100 px-[7px] py-[3px] text-[0.5625rem] font-semibold uppercase leading-none tracking-[0.04em] text-mocha-600">
                  Arquivado
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-mocha-500"
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
        </div>

        {/* badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={status} />
          {project.targetEntity && <EntityChip label={project.targetEntity} />}
          {project.urls.length > 0 && <UrlChip count={project.urls.length} />}
        </div>

        {/* progress — placeholder until real fill data exists (POP-22) */}
        <ProgressMeter filled={0} total={0} status={status} className="mt-3.5" />

        {/* footer — members & "updated" are placeholders until real data exists */}
        <div className="mt-3.5 flex items-center justify-between">
          <AvatarGroup members={[{ name: project.name }]} />
          <span className="text-xs text-mocha-400">—</span>
        </div>
      </Card>
    </Link>
  );
}
