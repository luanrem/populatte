"use client";

import { MoreVertical, Pencil, Plus, Trash2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityChip } from "@/components/ui/entity-chip";
import { ProgressMeter } from "@/components/ui/progress-meter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UrlChip } from "@/components/ui/url-chip";

/** Individual project URL — subset of what comes from the API. */
export interface ProjectUrl {
  url: string;
  isPrimary: boolean;
  label?: string;
}

export interface ProjectDetailHeaderProps {
  /** Project display name. */
  name: string;
  /** Optional target entity (e.g. "Mineração", "Empresas"). */
  targetEntity: string | null;
  /** URLs this project targets — used to compute the URL count badge. */
  urls: ProjectUrl[];
  /** Records already filled (placeholder, default 0). */
  filled?: number;
  /** Total records (placeholder, default 0). */
  total?: number;
  /** Callback when "Nova importação" is clicked. */
  onNewImport: () => void;
  /** Callback when "Preencher" is clicked (disabled placeholder). */
  onFill: () => void;
  /** Callback when kebab → "Editar" is clicked. */
  onEdit: () => void;
  /** Callback when kebab → "Excluir" is clicked. */
  onDelete: () => void;
}

export function ProjectDetailHeader({
  name,
  targetEntity,
  urls,
  filled = 0,
  total = 0,
  onNewImport,
  onFill,
  onEdit,
  onDelete,
}: ProjectDetailHeaderProps) {
  const urlCount = urls.length;
  const hasEntity = typeof targetEntity === "string" && targetEntity.length > 0;
  const hasUrls = urlCount > 0;

  return (
    <div className="flex items-start justify-between gap-5 flex-wrap">
      {/* --- Identity (left) --- */}
      <div className="min-w-0">
        <h1 className="text-[27px] font-extrabold leading-[1.1] text-foreground tracking-[-0.02em]">
          {name}
        </h1>

        <div className="flex items-center gap-2 mt-[11px] flex-wrap">
          {hasEntity && <EntityChip label={targetEntity as string} />}
          {hasUrls && <UrlChip count={urlCount} />}
          <ProgressMeter filled={filled} total={total} />
        </div>
      </div>

      {/* --- Actions (right) --- */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Kebab */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Mais opções"
            >
              <MoreVertical className="text-mocha-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Nova importação (outline) */}
        <Button variant="outline" size="lg" onClick={onNewImport}>
          <Plus className="text-mocha-500" />
          Nova importação
        </Button>

        {/* Preencher (gold, placeholder — action fires but is a no-op until extension is ready) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className="bg-gold-500 text-espresso-950 hover:bg-gold-600 font-bold shadow-sm border-0"
              aria-label="Preencher"
              onClick={onFill}
            >
              <Zap />
              Preencher
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Abra a extensão para preencher
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}