"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MappingListItem } from "@/lib/api/schemas/mapping.schema";
import { useDeleteMapping, useMappings } from "@/lib/query/hooks/use-mappings";

import { DeleteMappingDialog } from "./delete-mapping-dialog";
import { MappingCard } from "./mapping-card";
import { MappingsEmptyState } from "./mappings-empty-state";
import { NewMappingModal } from "./new-mapping-modal";

interface MappingsListProps {
  projectId: string;
}

function MappingCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Skeleton className="size-[42px] rounded-lg shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-20 shrink-0" />
      </div>
    </div>
  );
}

export function MappingsList({ projectId }: MappingsListProps) {
  const router = useRouter();
  const [selectedMapping, setSelectedMapping] = useState<MappingListItem | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newMappingModalOpen, setNewMappingModalOpen] = useState(false);

  const { data, isLoading } = useMappings(projectId);
  const deleteMapping = useDeleteMapping(projectId);

  const handleEditClick = (mapping: MappingListItem) => {
    router.push(`/mappings/${mapping.id}?projectId=${projectId}`);
  };

  const handleDeleteClick = (mapping: MappingListItem) => {
    setSelectedMapping(mapping);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMapping) return;

    await deleteMapping.mutateAsync({ mappingId: selectedMapping.id });
    setDeleteDialogOpen(false);
    setSelectedMapping(null);
    toast.success("Mapeamento excluído");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
          {Array.from({ length: 2 }).map((_, i) => (
            <MappingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const mappings = data?.items ?? [];

  if (mappings.length === 0) {
    return (
      <>
        <MappingsEmptyState onNewClick={() => setNewMappingModalOpen(true)} />
        <NewMappingModal
          open={newMappingModalOpen}
          onOpenChange={setNewMappingModalOpen}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone title lives on the page (page-owned zone headers); this row only
          carries the create action. */}
      <div className="flex justify-end">
        <Button onClick={() => setNewMappingModalOpen(true)}>
          <Plus className="size-4" />
          Novo mapeamento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
        {mappings.map((mapping) => (
          <MappingCard
            key={mapping.id}
            mapping={mapping}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      <DeleteMappingDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        mapping={selectedMapping}
        isPending={deleteMapping.isPending}
      />

      <NewMappingModal
        open={newMappingModalOpen}
        onOpenChange={setNewMappingModalOpen}
      />
    </div>
  );
}
