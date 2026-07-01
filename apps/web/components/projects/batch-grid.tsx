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
import { NewImportTile } from "./new-import-tile";

interface BatchGridProps {
  projectId: string;
  batches?: BatchListResponse;
  isLoading: boolean;
  onUploadClick: () => void;
}

function BatchCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <Skeleton className="size-[42px] rounded-lg shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-5 w-40" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>
      </div>
      <Skeleton className="size-5 shrink-0" />
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
          toast.success("Importação excluída");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
        {Array.from({ length: 4 }).map((_, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
        {batches.items.map((batch) => (
          <BatchCard
            key={batch.id}
            batch={batch}
            projectId={projectId}
            onSettingsClick={handleSettingsClick}
            onDeleteClick={handleDeleteClick}
          />
        ))}
        <NewImportTile onClick={onUploadClick} />
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
