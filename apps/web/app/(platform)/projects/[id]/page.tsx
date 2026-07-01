"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { usePageHeader } from "@/components/layout/page-header-context";
import { BatchGrid } from "@/components/projects/batch-grid";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { MappingsList } from "@/components/projects/mappings-list";
import { ProjectConfigBand } from "@/components/projects/project-config-band";
import { ProjectDetailHeader } from "@/components/projects/project-detail-header";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { UploadBatchModal } from "@/components/projects/upload-batch-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreateProjectRequest } from "@/lib/api/schemas/project.schema";
import { ApiError } from "@/lib/api/types";
import { useBatches } from "@/lib/query/hooks/use-batches";
import {
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/lib/query/hooks/use-projects";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    error: projectErrorData,
  } = useProject(id);
  const { data: batches, isLoading: batchesLoading } = useBatches(id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Drive the global header title with the project name; the breadcrumb stays
  // route-derived (Acme › Workspace › Projetos). Called unconditionally — falls
  // back to a generic label until the project loads.
  usePageHeader({ title: project?.name ?? "Projeto" });

  // The config band teaches the setup flow and disappears once the project has
  // at least one import. It is gated on `!batchesLoading` so it never flashes
  // in before we know whether imports exist.
  const hasBatches = (batches?.total ?? 0) > 0;
  const bandVisible = !batchesLoading && !hasBatches;

  const handleUpdate = (data: CreateProjectRequest) => {
    updateProject.mutate(
      { id, data },
      {
        onSuccess: () => {
          setFormOpen(false);
          toast.success("Projeto atualizado");
        },
        onError: () => {
          toast.error("Erro ao atualizar o projeto");
        },
      },
    );
  };

  const handleDeleteConfirm = async () => {
    await deleteProject.mutateAsync(id);
    toast.success("Projeto excluído");
    router.push("/projects");
  };

  // Handle error toasts
  useEffect(() => {
    if (
      projectError &&
      projectErrorData instanceof ApiError &&
      projectErrorData.status !== 404
    ) {
      toast.error("Erro ao carregar o projeto");
    }
  }, [projectError, projectErrorData]);

  // Loading state
  if (projectLoading) {
    return (
      <div className="mx-auto max-w-[1060px] px-7 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Error state - 404
  if (
    projectError &&
    projectErrorData instanceof ApiError &&
    projectErrorData.status === 404
  ) {
    return (
      <div className="mx-auto max-w-[1060px] px-7 py-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Projeto não encontrado
          </h2>
          <p className="text-muted-foreground">
            O projeto que você procura não existe ou foi removido.
          </p>
          <Link href="/projects">
            <Button variant="default">Voltar para projetos</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error state - other errors
  if (projectError) {
    return (
      <div className="mx-auto max-w-[1060px] px-7 py-16">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Algo deu errado
          </h2>
          <p className="text-muted-foreground">Tente novamente mais tarde.</p>
          <Link href="/projects">
            <Button variant="default">Voltar para projetos</Button>
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
      <div className="mx-auto flex max-w-[1060px] flex-col gap-[18px] px-7 py-6">
        <ProjectDetailHeader
          name={project.name}
          targetEntity={project.targetEntity}
          urls={project.urls}
          onNewImport={() => setUploadModalOpen(true)}
          onFill={() => {}}
          onEdit={() => setFormOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
        />

        <ProjectConfigBand currentStep={1} visible={bandVisible} />

        {/* Importações zone */}
        <section>
          <div className="mb-[11px] flex flex-wrap items-baseline gap-2.5">
            <h2 className="text-base font-bold text-foreground">Importações</h2>
            <span className="text-xs text-muted-foreground">
              {hasBatches
                ? "clique para abrir o detalhe (e o Significado dos dados)"
                : "cada planilha vira uma importação"}
            </span>
          </div>
          <BatchGrid
            projectId={id}
            batches={batches}
            isLoading={batchesLoading}
            onUploadClick={() => setUploadModalOpen(true)}
          />
        </section>

        {/* Mapeamentos zone */}
        <section>
          <div className="mb-[11px] flex flex-wrap items-baseline gap-2.5">
            <h2 className="text-base font-bold text-foreground">Mapeamentos</h2>
            <span className="text-xs text-muted-foreground">
              receita reutilizável (feita na extensão)
            </span>
          </div>
          <MappingsList projectId={id} />
        </section>
      </div>

      <UploadBatchModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        projectId={id}
      />

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleUpdate}
        project={project}
        isPending={updateProject.isPending}
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
