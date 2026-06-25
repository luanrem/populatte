import * as React from "react"
import { ExternalLink } from "lucide-react"

import { cn } from "@/lib/utils"

type UrlChipProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Number of target URLs the project points to. */
  count: number
}

function UrlChip({ className, count, ...props }: UrlChipProps) {
  const label = `${count} ${count === 1 ? "URL" : "URLs"}`

  return (
    <span
      data-slot="url-chip"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-border bg-mocha-50 py-1 pr-2 pl-[7px] text-[0.6875rem] font-medium text-muted-foreground whitespace-nowrap [&>svg]:size-3 [&>svg]:pointer-events-none",
        className
      )}
      {...props}
    >
      <ExternalLink aria-hidden="true" />
      {label}
    </span>
  )
}

export { UrlChip }
export type { UrlChipProps }
