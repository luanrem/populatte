"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { BatchListResponse } from "@/lib/api/schemas/batch.schema";

import { BatchCard } from "./batch-card";
import { BatchEmptyState } from "./batch-empty-state";

interface BatchGridProps {
  projectId: string;
  batches?: BatchListResponse;
  isLoading: boolean;
  onUploadClick: () => void;
}

function BatchCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-5 w-5 rounded-full shrink-0 ml-4" />
    </div>
  );
}

export function BatchGrid({
  projectId,
  batches,
  isLoading,
  onUploadClick,
}: BatchGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <BatchCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!batches || batches.items.length === 0) {
    return <BatchEmptyState onUploadClick={onUploadClick} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {batches.items.map((batch) => (
        <BatchCard key={batch.id} batch={batch} projectId={projectId} />
      ))}
    </div>
  );
}
