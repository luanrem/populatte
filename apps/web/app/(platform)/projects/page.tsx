"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  usePageHeader,
  usePageHeaderSearchClear,
  usePageHeaderSearchQuery,
} from "@/components/layout/page-header-context";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectGrid } from "@/components/projects/project-grid";
import { ProjectsIntro } from "@/components/projects/projects-intro";
import {
  ProjectsToolbar,
  type FilterCounts,
  type ProjectFilter,
} from "@/components/projects/projects-toolbar";
import type { ProjectEmptyStateVariant } from "@/components/projects/project-empty-state";
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
  // Activate the global header search for this route (POP-58) and read its
  // debounced query; `clearSearch` resets both the query and the header input.
  usePageHeader({ search: { placeholder: "Buscar projetos…" } });
  const searchQuery = usePageHeaderSearchQuery();
  const clearSearch = usePageHeaderSearchClear();

  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<ProjectSummaryResponse | null>(null);

  // Counts span the full set; the tabs filter, then the header search narrows.
  const allProjects = projects ?? [];
  const activeCount = allProjects.filter((p) => p.status === "active").length;
  const counts: FilterCounts = {
    all: allProjects.length,
    active: activeCount,
    archived: allProjects.length - activeCount,
  };

  const query = searchQuery.trim().toLowerCase();
  const tabFiltered = allProjects.filter((project) => {
    if (filter === "active") return project.status === "active";
    if (filter === "archived") return project.status === "archived";
    return true;
  });
  const displayed = query
    ? tabFiltered.filter((project) =>
        [
          project.name,
          project.description ?? "",
          project.targetEntity ?? "",
        ].some((field) => field.toLowerCase().includes(query)),
      )
    : tabFiltered;

  const emptyVariant: ProjectEmptyStateVariant = query
    ? "no-results"
    : filter === "archived"
      ? "no-archived"
      : "no-projects";
  // The "create" tile only makes sense alongside results, off-search, and
  // outside the Archived tab (where new projects never land).
  const showTile = displayed.length > 0 && query === "" && filter !== "archived";

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
    <>
      <div className="px-7 pb-8 pt-[26px]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
          <ProjectsIntro
            activeCount={counts.active}
            archivedCount={counts.archived}
          />

          <ProjectsToolbar
            value={filter}
            counts={counts}
            resultCount={displayed.length}
            onChange={setFilter}
          />

          <ProjectGrid
            projects={displayed}
            isLoading={isLoading}
            emptyVariant={emptyVariant}
            query={searchQuery}
            showTile={showTile}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleArchive={handleToggleArchive}
            onCreateClick={handleOpenCreate}
            onClearSearch={clearSearch}
            onViewActive={() => setFilter("active")}
          />
        </div>
      </div>

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
    </>
  );
}
