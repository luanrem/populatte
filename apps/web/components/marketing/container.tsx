import { type ElementType, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ContainerProps {
  children: ReactNode;
  /** Element to render as. Defaults to `div`. */
  as?: ElementType;
  className?: string;
}

/**
 * Home content scaffold: centered column capped at `--container-max` (1200px)
 * with the design's lateral padding (56px on desktop, reduced to 24px on
 * narrow screens). Every marketing section composes its content inside a
 * `Container` so the breakpoint contract stays in one place.
 *
 * Responsive contract for sections built on top of this:
 * - lateral padding: `px-6` (24px) on mobile → `md:px-14` (56px) from `md`.
 * - multi-column grids (2/3/4 cols) should collapse to a single column below
 *   `md`; the hero's 60px h1 should scale down on small screens.
 * - the FAQ section narrows the column further (`max-width: 780px`) on its own.
 */
export function Container({ children, as: Tag = "div", className }: ContainerProps) {
  return (
    <Tag
      className={cn("mx-auto w-full px-6 md:px-14", className)}
      style={{ maxWidth: "var(--container-max)" }}
    >
      {children}
    </Tag>
  );
}
