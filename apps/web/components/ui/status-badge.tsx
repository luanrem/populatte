import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Statuses of the Populatte form-fill lifecycle, plus the archived variant.
 * Colors come exclusively from the café status tokens (-soft / -text pairs);
 * never hardcode hex. See globals.css.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] whitespace-nowrap [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      status: {
        filling: "bg-warning-soft text-warning-text",
        done: "bg-success-soft text-success-text",
        ready: "bg-pending-soft text-pending",
        pending: "bg-pending-soft text-pending",
        archived: "bg-mocha-100 text-mocha-600",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

export type StatusBadgeStatus = NonNullable<
  VariantProps<typeof statusBadgeVariants>["status"]
>

const STATUS_LABELS: Record<StatusBadgeStatus, string> = {
  filling: "Preenchendo",
  done: "Concluído",
  ready: "Pronto",
  pending: "Configurando",
  archived: "Arquivado",
}

function StatusBadge({
  className,
  status = "pending",
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants>) {
  const resolvedStatus: StatusBadgeStatus = status ?? "pending"

  return (
    <span
      data-slot="status-badge"
      data-status={resolvedStatus}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {children ?? STATUS_LABELS[resolvedStatus]}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants, STATUS_LABELS }
