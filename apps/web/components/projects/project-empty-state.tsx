"use client";

import { FolderKanban, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ProjectEmptyStateProps {
  onCreateClick: () => void;
}

export function ProjectEmptyState({ onCreateClick }: ProjectEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <div className="flex max-w-sm flex-col items-center space-y-6 text-center">
        <div className="rounded-full bg-muted p-5">
          <FolderKanban className="size-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Nenhum projeto ainda
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie seu primeiro projeto para começar a automatizar o
            preenchimento de formulários com dados do Excel.
          </p>
        </div>
        <Button onClick={onCreateClick}>
          <Plus />
          Criar primeiro projeto
        </Button>
      </div>
    </div>
  );
}
