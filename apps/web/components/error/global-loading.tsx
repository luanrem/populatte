/**
 * Global Loading Indicator
 *
 * Component that displays a progress bar at the top of the viewport
 * whenever TanStack Query is actively fetching data.
 */

'use client';

import { useIsFetching } from '@tanstack/react-query';

/**
 * Global loading indicator component.
 *
 * Displays a thin animated progress bar at the top of the viewport
 * whenever any TanStack Query request is in progress. Disappears when
 * no requests are active.
 *
 * This provides visual feedback to users that data is being loaded
 * without requiring loading states in every component.
 *
 * @example
 * ```tsx
 * // In root layout
 * <QueryProvider>
 *   <GlobalLoadingIndicator />
 *   <RestOfApp />
 * </QueryProvider>
 * ```
 */
export function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();

  if (isFetching === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-primary/20">
      <div className="h-full bg-primary animate-pulse w-full" />
    </div>
  );
}
