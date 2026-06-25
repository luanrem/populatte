import * as React from "react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import type { StatusBadgeStatus } from "@/components/ui/status-badge"

/**
 * Maps a fill-lifecycle status to the bar fill color. When nothing has been
 * imported yet (total === 0) the bar is always neutral. Full literal classes
 * are returned so Tailwind's scanner can pick them up.
 *   done                 -> --success
 *   ready / archived     -> mocha-300 (neutral, inactive)
 *   total === 0          -> mocha-300 (awaiting import)
 *   otherwise (filling…) -> gold-500
 */
function resolveFillClass(status: StatusBadgeStatus, total: number): string {
  if (total === 0) return "[&_[data-slot=progress-indicator]]:bg-mocha-300"
  if (status === "done") return "[&_[data-slot=progress-indicator]]:bg-success"
  if (status === "ready" || status === "archived")
    return "[&_[data-slot=progress-indicator]]:bg-mocha-300"
  return "[&_[data-slot=progress-indicator]]:bg-gold-500"
}

type ProgressMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Number of records already filled. */
  filled: number
  /** Total number of records; 0 means nothing imported yet. */
  total: number
  /** Lifecycle status that drives the fill color. */
  status?: StatusBadgeStatus
}

function ProgressMeter({
  className,
  filled,
  total,
  status = "pending",
  ...props
}: ProgressMeterProps) {
  const hasData = total > 0
  const percent = hasData ? Math.round((filled / total) * 100) : 0
  const label = hasData ? `${filled} de ${total} preenchidos` : "Aguardando importação"
  const value = hasData ? `${percent}%` : "—"
  const fillClass = resolveFillClass(status, total)

  return (
    <div
      data-slot="progress-meter"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <Progress
        value={percent}
        aria-label={label}
        className={cn("h-[7px] bg-mocha-100", fillClass)}
      />
    </div>
  )
}

export { ProgressMeter }
export type { ProgressMeterProps }
