"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import type { BatchListResponse, BatchResponse } from "@/lib/api/schemas/batch.schema";
import { useDeleteBatch } from "@/lib/query/hooks/use-batches";

import { BatchCard } from "./batch-card";
import { BatchEmptyState } from "./batch-empty-state";
import { BatchSettingsModal } from "./batch-settings-modal";
import { DeleteBatchDialog } from "./delete-batch-dialog";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchResponse | null>(null);

  const deleteBatch = useDeleteBatch(projectId);

  const handleSettingsClick = (batch: BatchResponse) => {
    setSelectedBatch(batch);
    setSettingsOpen(true);
  };

  const handleDeleteClick = (batch: BatchResponse) => {
    setSelectedBatch(batch);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedBatch) return;

    deleteBatch.mutate(
      { batchId: selectedBatch.id },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedBatch(null);
          toast.success("Importacao excluida");
        },
      }
    );
  };

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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.items.map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            projectId={projectId}
            onSettingsClick={handleSettingsClick}
            onDeleteClick={handleDeleteClick}
          />
        ))}
      </div>

      <BatchSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        batch={selectedBatch}
        projectId={projectId}
        onSave={() => setSettingsOpen(false)}
      />

      <DeleteBatchDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        batch={selectedBatch}
        onConfirm={handleDeleteConfirm}
        isPending={deleteBatch.isPending}
      />
    </>
  );
}
