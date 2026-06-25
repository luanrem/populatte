"use client";

import {
  Archive,
  FolderKanban,
  Plus,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectEmptyStateVariant = "no-projects" | "no-results" | "no-archived";

interface ProjectEmptyStateProps {
  variant?: ProjectEmptyStateVariant;
  /** Current search term, shown in the "no-results" body. */
  query?: string;
  onCreateClick?: () => void;
  onClearSearch?: () => void;
  onViewActive?: () => void;
}

export function ProjectEmptyState({
  variant = "no-projects",
  query = "",
  onCreateClick,
  onClearSearch,
  onViewActive,
}: ProjectEmptyStateProps) {
  const content = resolveContent(variant, query, {
    onCreateClick,
    onClearSearch,
    onViewActive,
  });
  const Icon = content.icon;
  const ActionIcon = content.actionIcon;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-14 text-center">
      <div className="mb-[18px] grid size-16 place-items-center rounded-full border border-border bg-mocha-50">
        <Icon className="size-7 text-mocha-400" />
      </div>
      <h3 className="mb-1.5 text-lg font-bold text-foreground">
        {content.title}
      </h3>
      <p className="mb-5 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
        {content.body}
      </p>
      <Button onClick={content.onAction}>
        <ActionIcon />
        {content.actionLabel}
      </Button>
    </div>
  );
}

function resolveContent(
  variant: ProjectEmptyStateVariant,
  query: string,
  callbacks: {
    onCreateClick?: () => void;
    onClearSearch?: () => void;
    onViewActive?: () => void;
  }
): {
  icon: LucideIcon;
  title: string;
  body: string;
  actionIcon: LucideIcon;
  actionLabel: string;
  onAction: (() => void) | undefined;
} {
  switch (variant) {
    case "no-results":
      return {
        icon: SearchX,
        title: "Nenhum projeto encontrado",
        body: `Nada corresponde a “${query.trim()}”. Tente outro termo ou limpe a busca.`,
        actionIcon: X,
        actionLabel: "Limpar busca",
        onAction: callbacks.onClearSearch,
      };
    case "no-archived":
      return {
        icon: Archive,
        title: "Nenhum projeto arquivado",
        body: "Projetos arquivados saem da lista de ativos, mas continuam acessíveis aqui.",
        actionIcon: FolderKanban,
        actionLabel: "Ver ativos",
        onAction: callbacks.onViewActive,
      };
    case "no-projects":
    default:
      return {
        icon: FolderKanban,
        title: "Nenhum projeto ainda",
        body: "Crie seu primeiro projeto para começar a automatizar o preenchimento de formulários com dados do Excel.",
        actionIcon: Plus,
        actionLabel: "Criar primeiro projeto",
        onAction: callbacks.onCreateClick,
      };
  }
}
