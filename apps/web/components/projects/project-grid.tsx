"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectSummaryResponse } from "@/lib/api/schemas/project.schema";

import { ProjectCard } from "./project-card";
import { ProjectEmptyState } from "./project-empty-state";

interface ProjectGridProps {
  projects?: ProjectSummaryResponse[];
  isLoading: boolean;
  onEdit: (project: ProjectSummaryResponse) => void;
  onDelete: (project: ProjectSummaryResponse) => void;
  onToggleArchive: (project: ProjectSummaryResponse) => void;
  onCreateClick: () => void;
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
  onEdit,
  onDelete,
  onToggleArchive,
  onCreateClick,
}: ProjectGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return <ProjectEmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleArchive={onToggleArchive}
        />
      ))}
    </div>
  );
}
