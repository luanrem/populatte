import * as React from "react"

import { cn } from "@/lib/utils"

type ProjectsIntroProps = React.ComponentProps<"div"> & {
  /** Number of active (non-archived) projects. */
  activeCount: number
  /** Number of archived projects. */
  archivedCount: number
}

/**
 * Intro row shown above the projects grid: section heading + a subcopy that
 * surfaces the active / archived counts. Purely presentational — counts arrive
 * via props. Colors come from café tokens only.
 */
function ProjectsIntro({
  className,
  activeCount,
  archivedCount,
  ...props
}: ProjectsIntroProps) {
  return (
    <div
      className={cn("flex flex-wrap items-end justify-between gap-3", className)}
      {...props}
    >
      <div>
        <h2 className="text-[1.625rem] font-extrabold tracking-[-0.02em] text-foreground">
          Seus projetos
        </h2>
        <p className="mt-[3px] text-[0.9375rem] text-muted-foreground">
          Agrupe importações de planilha e mapeamentos por destino.{" "}
          <b className="font-bold text-espresso-700">{activeCount} ativos</b> ·{" "}
          {archivedCount} arquivados.
        </p>
      </div>
    </div>
  )
}

export { ProjectsIntro }
export type { ProjectsIntroProps }
