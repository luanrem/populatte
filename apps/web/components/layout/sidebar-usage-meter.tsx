/**
 * Sidebar usage meter — presentational only.
 *
 * Renders the "fill credits" gauge from the design (label, used/total in a
 * mono face, gold progress bar, renewal/plan footer). All data arrives via
 * props; this component performs no fetching. Wire real billing data by
 * passing it from the consumer.
 */
interface SidebarUsageMeterProps {
  /** Credits consumed in the current cycle. */
  used: number;
  /** Credit allowance for the plan. */
  total: number;
  /** Plan display name (pt-BR), e.g. "Pro". */
  planName: string;
  /** Days until the allowance renews. */
  renewsInDays: number;
  /** Metric label (pt-BR). Defaults to the fill-count metric. */
  label?: string;
}

/** Compact thousands form matching the design ("10k"), pt-BR decimal comma. */
function formatCompact(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  const rounded = Number.isInteger(thousands)
    ? String(thousands)
    : thousands.toFixed(1).replace(".", ",");
  return `${rounded}k`;
}

export function SidebarUsageMeter({
  used,
  total,
  planName,
  renewsInDays,
  label = "Preenchimentos",
}: SidebarUsageMeterProps) {
  const percent =
    total > 0 ? Math.min(100, Math.max(0, Math.round((used / total) * 100))) : 0;

  return (
    <div className="mx-2 mb-1 rounded-lg border border-border bg-latte-50 px-3.5 py-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between text-xs font-semibold text-mocha-800">
        <span>{label}</span>
        <span className="font-mono text-espresso-600">
          {used.toLocaleString("pt-BR")} / {formatCompact(total)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Uso de ${label.toLowerCase()}`}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-mocha-100"
      >
        <div
          className="h-full rounded-full bg-gold-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] font-medium text-muted-foreground">
        Renova em {renewsInDays} dias · Plano {planName}
      </p>
    </div>
  );
}
