"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectSummaryResponse } from "@/lib/api/schemas/project.schema";

import { NewProjectTile } from "./new-project-tile";
import { ProjectCard } from "./project-card";
import {
  ProjectEmptyState,
  type ProjectEmptyStateVariant,
} from "./project-empty-state";

interface ProjectGridProps {
  /** Already-filtered list to display (filter + search applied by the page). */
  projects?: ProjectSummaryResponse[];
  isLoading: boolean;
  /** Empty state to show when there is nothing to display. */
  emptyVariant: ProjectEmptyStateVariant;
  /** Active search term, shown in the "no-results" empty state body. */
  query: string;
  /** Whether to render the "Novo projeto" tile as the last grid cell. */
  showTile: boolean;
  onEdit: (project: ProjectSummaryResponse) => void;
  onDelete: (project: ProjectSummaryResponse) => void;
  onToggleArchive: (project: ProjectSummaryResponse) => void;
  onCreateClick: () => void;
  onClearSearch: () => void;
  onViewActive: () => void;
}

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card py-6 shadow-sm">
      <div className="space-y-2 px-6">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex gap-2 px-6">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function ProjectGrid({
  projects,
  isLoading,
  emptyVariant,
  query,
  showTile,
  onEdit,
  onDelete,
  onToggleArchive,
  onCreateClick,
  onClearSearch,
  onViewActive,
}: ProjectGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <ProjectEmptyState
        variant={emptyVariant}
        query={query}
        onCreateClick={onCreateClick}
        onClearSearch={onClearSearch}
        onViewActive={onViewActive}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleArchive={onToggleArchive}
        />
      ))}
      {showTile && <NewProjectTile onClick={onCreateClick} />}
    </div>
  );
}
