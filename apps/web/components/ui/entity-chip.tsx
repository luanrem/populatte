import * as React from "react"

import { cn } from "@/lib/utils"

type EntityChipProps = React.ComponentProps<"span"> & {
  /** Entity name to display (e.g. "Mineração", "Empresas"). */
  label: string
}

function EntityChip({ className, label, ...props }: EntityChipProps) {
  return (
    <span
      data-slot="entity-chip"
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full bg-espresso-100 px-[9px] py-1 text-[0.6875rem] font-medium text-espresso-700 whitespace-nowrap",
        className
      )}
      {...props}
    >
      {label}
    </span>
  )
}

export { EntityChip }
export type { EntityChipProps }
