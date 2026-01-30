"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/layout/app-header";
import { BatchEmptyState } from "@/components/projects/batch-empty-state";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/query/hooks/use-projects";
import { useBatches } from "@/lib/query/hooks/use-batches";
import { ApiError } from "@/lib/api/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading: projectLoading, isError: projectError, error: projectErrorData } = useProject(id);
  const { data: batches, isLoading: batchesLoading } = useBatches(id);

  // Handle error toasts
  useEffect(() => {
    if (projectError && projectErrorData instanceof ApiError && projectErrorData.status !== 404) {
      toast.error("Erro ao carregar o projeto");
    }
  }, [projectError, projectErrorData]);

  // Loading state
  if (projectLoading) {
    return (
      <main className="w-full">
        <div className="px-8 pt-4">
          <Skeleton className="h-4 w-48" />
        </div>
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state - 404
  if (projectError && projectErrorData instanceof ApiError && projectErrorData.status === 404) {
    return (
      <main className="w-full">
        <div className="mx-auto max-w-5xl px-8 py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Projeto nao encontrado
            </h2>
            <p className="text-muted-foreground">
              O projeto que voce procura nao existe ou foi removido.
            </p>
            <Link href="/projects">
              <Button variant="default">
                Voltar para projetos
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Error state - other errors
  if (projectError) {
    return (
      <main className="w-full">
        <div className="mx-auto max-w-5xl px-8 py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Algo deu errado
            </h2>
            <p className="text-muted-foreground">
              Tente novamente mais tarde.
            </p>
            <Link href="/projects">
              <Button variant="default">
                Voltar para projetos
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Loaded state
  if (!project) {
    return null;
  }

  return (
    <main className="w-full">
      <div className="px-8 pt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/projects">Projetos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <AppHeader title={project.name}>
        <Button size="sm" disabled>
          <Upload className="mr-2 h-4 w-4" />
          Nova Importacao
        </Button>
      </AppHeader>

      <div className="mx-auto max-w-5xl px-8 py-6">
        {batchesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : batches && batches.items.length === 0 ? (
          <BatchEmptyState />
        ) : (
          <p className="text-sm text-muted-foreground">
            {batches?.items.length} importacoes
          </p>
        )}
      </div>
    </main>
  );
}
