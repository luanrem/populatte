"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MappingListItem } from "@/lib/api/schemas/mapping.schema";
import { useDeleteMapping, useMappings } from "@/lib/query/hooks/use-mappings";

import { DeleteMappingDialog } from "./delete-mapping-dialog";
import { MappingsEmptyState } from "./mappings-empty-state";
import { NewMappingModal } from "./new-mapping-modal";

interface MappingsListProps {
  projectId: string;
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

  const handleDeleteClick = (mapping: MappingListItem) => {
    setSelectedMapping(mapping);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMapping) return;

    await deleteMapping.mutateAsync({ mappingId: selectedMapping.id });
    setDeleteDialogOpen(false);
    setSelectedMapping(null);
    toast.success("Mapping excluido");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Passos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mappings</h2>
        <Button onClick={() => setNewMappingModalOpen(true)}>
          <Plus className="size-4" />
          Novo Mapping
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Passos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow
                key={mapping.id}
                className="cursor-pointer"
                onClick={() => router.push(`/mappings/${mapping.id}?projectId=${projectId}`)}
              >
                <TableCell className="font-medium">{mapping.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {mapping.targetUrl}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{mapping.stepCount}</Badge>
                </TableCell>
                <TableCell>
                  {mapping.isActive ? (
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/mappings/${mapping.id}?projectId=${projectId}`}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Editar</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(mapping)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Excluir</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
