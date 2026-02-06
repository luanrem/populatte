/**
 * Compact connection status indicator
 *
 * Shows colored dot with "Connected" text in header.
 * Optimized for Side Panel 320px width.
 */
export function ConnectedIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-xs text-green-700">Connected</span>
    </div>
  );
}
