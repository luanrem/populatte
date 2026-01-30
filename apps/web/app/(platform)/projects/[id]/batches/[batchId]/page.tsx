"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { BatchDetailHeader } from "@/components/projects/batch-detail-header";
import { BatchDataTable } from "@/components/projects/batch-data-table";
import { BatchTablePagination } from "@/components/projects/batch-table-pagination";
import { BatchTableEmptyState } from "@/components/projects/batch-table-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/lib/query/hooks/use-projects";
import { useBatch, useBatchRows } from "@/lib/query/hooks/use-batches";
import { ApiError } from "@/lib/api/types";

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string; batchId: string }>;
}) {
  const { id, batchId } = use(params);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const {
    data: project,
    isLoading: projectLoading,
  } = useProject(id);

  const {
    data: batch,
    isLoading: batchLoading,
    isError: batchError,
    error: batchErrorData,
  } = useBatch(id, batchId);

  const {
    data: rowsData,
    isLoading: rowsLoading,
    isPlaceholderData,
  } = useBatchRows(id, batchId, limit, offset);

  // Handle error toasts
  useEffect(() => {
    if (
      batchError &&
      batchErrorData instanceof ApiError &&
      batchErrorData.status !== 404
    ) {
      toast.error("Erro ao carregar a importacao");
    }
  }, [batchError, batchErrorData]);

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit);
    setOffset(0); // Reset to first page when page size changes
  };

  // Loading state
  if (batchLoading || projectLoading) {
    return (
      <main className="w-full">
        <div className="mx-auto max-w-7xl px-8 py-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-64" />
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
            <div className="border rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state - 404
  if (
    batchError &&
    batchErrorData instanceof ApiError &&
    batchErrorData.status === 404
  ) {
    return (
      <main className="w-full">
        <div className="mx-auto max-w-7xl px-8 py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Importacao nao encontrada
            </h2>
            <p className="text-muted-foreground">
              A importacao que voce procura nao existe ou foi removida.
            </p>
            <Link href={`/projects/${id}`}>
              <Button variant="default">Voltar para o projeto</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Error state - other errors
  if (batchError) {
    return (
      <main className="w-full">
        <div className="mx-auto max-w-7xl px-8 py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Algo deu errado
            </h2>
            <p className="text-muted-foreground">
              Tente novamente mais tarde.
            </p>
            <Link href={`/projects/${id}`}>
              <Button variant="default">Voltar para o projeto</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Loaded state
  if (!batch || !project) {
    return null;
  }

  return (
    <main className="w-full">
      <div className="mx-auto max-w-7xl px-8 py-6">
        <div className="space-y-6">
          <BatchDetailHeader
            batch={batch}
            projectId={id}
            projectName={project.name}
          />

          {batch.totalRows === 0 ? (
            <BatchTableEmptyState />
          ) : (
            <div className="space-y-4">
              <BatchDataTable
                batch={batch}
                rows={rowsData?.items ?? []}
                isLoading={rowsLoading}
                isPlaceholderData={isPlaceholderData}
                offset={offset}
              />
              <BatchTablePagination
                total={rowsData?.total ?? batch.totalRows}
                limit={limit}
                offset={offset}
                onPageChange={setOffset}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
