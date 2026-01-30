"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectGrid } from "@/components/projects/project-grid";
import type {
  CreateProjectRequest,
  ProjectSummaryResponse,
} from "@/lib/api/schemas/project.schema";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/lib/query/hooks/use-projects";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<ProjectSummaryResponse | null>(null);

  function handleOpenCreate() {
    setSelectedProject(null);
    setFormOpen(true);
  }

  function handleEdit(project: ProjectSummaryResponse) {
    setSelectedProject(project);
    setFormOpen(true);
  }

  function handleDelete(project: ProjectSummaryResponse) {
    setSelectedProject(project);
    setDeleteOpen(true);
  }

  function handleToggleArchive(project: ProjectSummaryResponse) {
    const newStatus = project.status === "archived" ? "active" : "archived";
    updateProject.mutate(
      { id: project.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success(
            newStatus === "archived"
              ? "Projeto arquivado"
              : "Projeto desarquivado",
          );
        },
        onError: () => {
          toast.error("Erro ao atualizar o projeto");
        },
      },
    );
  }

  function handleFormSubmit(data: CreateProjectRequest) {
    if (selectedProject) {
      updateProject.mutate(
        { id: selectedProject.id, data },
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
    } else {
      createProject.mutate(data, {
        onSuccess: () => {
          setFormOpen(false);
          toast.success("Projeto criado");
        },
        onError: () => {
          toast.error("Erro ao criar o projeto");
        },
      });
    }
  }

  function handleDeleteConfirm() {
    if (!selectedProject) return;
    deleteProject.mutate(selectedProject.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedProject(null);
        toast.success("Projeto excluído");
      },
      onError: () => {
        toast.error("Erro ao excluir o projeto");
      },
    });
  }

  return (
    <main className="w-full">
      <AppHeader title="Projetos">
        <Button onClick={handleOpenCreate} size="sm">
          <Plus />
          Novo Projeto
        </Button>
      </AppHeader>

      <ProjectGrid
        projects={projects}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleArchive={handleToggleArchive}
        onCreateClick={handleOpenCreate}
      />

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        project={selectedProject}
        isPending={createProject.isPending || updateProject.isPending}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        project={selectedProject}
        isPending={deleteProject.isPending}
      />
    </main>
  );
}
