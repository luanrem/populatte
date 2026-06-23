"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { usePageHeader } from "@/components/layout/page-header-context";
import { BatchGrid } from "@/components/projects/batch-grid";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { MappingsList } from "@/components/projects/mappings-list";
import { UploadBatchModal } from "@/components/projects/upload-batch-modal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject, useDeleteProject } from "@/lib/query/hooks/use-projects";
import { useBatches } from "@/lib/query/hooks/use-batches";
import { ApiError } from "@/lib/api/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: project, isLoading: projectLoading, isError: projectError, error: projectErrorData } = useProject(id);
  const { data: batches, isLoading: batchesLoading } = useBatches(id);
  const deleteProject = useDeleteProject();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Drive the global header title with the project name; the breadcrumb stays
  // route-derived (Acme › Workspace › Projetos). Called unconditionally — falls
  // back to a generic label until the project loads.
  usePageHeader({ title: project?.name ?? "Projeto" });

  const handleDeleteConfirm = async () => {
    await deleteProject.mutateAsync(id);
    toast.success("Projeto excluido");
    router.push("/projects");
  };

  // Handle error toasts
  useEffect(() => {
    if (projectError && projectErrorData instanceof ApiError && projectErrorData.status !== 404) {
      toast.error("Erro ao carregar o projeto");
    }
  }, [projectError, projectErrorData]);

  // Loading state
  if (projectLoading) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state - 404
  if (projectError && projectErrorData instanceof ApiError && projectErrorData.status === 404) {
    return (
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
    );
  }

  // Error state - other errors
  if (projectError) {
    return (
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
    );
  }

  // Loaded state
  if (!project) {
    return null;
  }

  return (
    <>
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-8 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => setUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Nova Importacao
        </Button>
      </div>

      <div className="mx-auto max-w-5xl px-8 pb-6 space-y-10">
        {/* Batches Section */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Importacoes</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Dados importados de arquivos Excel
          </p>
          <BatchGrid
            projectId={id}
            batches={batches}
            isLoading={batchesLoading}
            onUploadClick={() => setUploadModalOpen(true)}
          />
        </section>

        <Separator />

        {/* Mappings Section */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Mappings</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Regras de preenchimento automatico
          </p>
          <MappingsList projectId={id} />
        </section>
      </div>

      <UploadBatchModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        projectId={id}
      />

      <DeleteProjectDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        project={project}
        isPending={deleteProject.isPending}
      />
    </>
  );
}
