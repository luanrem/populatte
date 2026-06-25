"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/** Project state filter applied to the projects grid. */
type ProjectFilter = "all" | "active" | "archived"

/** Per-filter project counts (mono badges on each tab). */
type FilterCounts = Record<ProjectFilter, number>

const FILTER_TABS: { value: ProjectFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "archived", label: "Arquivados" },
]

type FilterTabsProps = {
  value: ProjectFilter
  counts: FilterCounts
  onChange: (filter: ProjectFilter) => void
  className?: string
}

/**
 * Segmented filter tabs (Todos / Ativos / Arquivados), each with a mono count.
 * Active tab is filled espresso-900 / latte-50. Built on the shadcn ToggleGroup
 * primitive; the empty-string deselect is guarded so a filter is always active.
 */
function FilterTabs({ value, counts, onChange, className }: FilterTabsProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as ProjectFilter)
      }}
      spacing={2}
      aria-label="Filtrar projetos por estado"
      className={cn(
        "gap-0.5 rounded-[10px] border border-border bg-card p-[3px]",
        className
      )}
    >
      {FILTER_TABS.map((tab) => (
        <ToggleGroupItem
          key={tab.value}
          value={tab.value}
          className="h-[34px] gap-[7px] rounded-md bg-transparent px-3.5 text-[0.8125rem] font-semibold text-mocha-800 hover:bg-mocha-50 hover:text-mocha-800 data-[state=on]:bg-espresso-900 data-[state=on]:text-latte-50 data-[state=on]:hover:bg-espresso-900 data-[state=on]:hover:text-latte-50"
        >
          {tab.label}
          <span className="font-mono opacity-75">{counts[tab.value]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

type ResultCountProps = {
  count: number
  className?: string
}

/** Right-aligned result label, pluralized ("1 projeto" / "N projetos"). */
function ResultCount({ count, className }: ResultCountProps) {
  const label = count === 1 ? "1 projeto" : `${count} projetos`

  return (
    <span
      className={cn(
        "text-[0.8125rem] font-medium text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  )
}

type ProjectsToolbarProps = {
  value: ProjectFilter
  counts: FilterCounts
  resultCount: number
  onChange: (filter: ProjectFilter) => void
  className?: string
}

/**
 * Projects toolbar: filter tabs on the left, result label on the right.
 * Presentational — state and counts are owned by the caller.
 */
function ProjectsToolbar({
  value,
  counts,
  resultCount,
  onChange,
  className,
}: ProjectsToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <FilterTabs value={value} counts={counts} onChange={onChange} />
      <ResultCount count={resultCount} />
    </div>
  )
}

export { FilterTabs, ResultCount, ProjectsToolbar }
export type {
  ProjectFilter,
  FilterCounts,
  FilterTabsProps,
  ResultCountProps,
  ProjectsToolbarProps,
}
