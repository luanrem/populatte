"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Crumb } from "@/lib/navigation";

/**
 * Per-page override for the global header. A page supplies just the fields it
 * needs (e.g. a dynamic project detail page overrides only the `title`); the
 * header falls back to `resolvePageMeta(pathname)` for anything omitted.
 */
export interface PageHeaderOverride {
  title?: string;
  breadcrumb?: Crumb[];
}

interface PageHeaderContextValue {
  override: PageHeaderOverride | null;
  register: (override: PageHeaderOverride) => void;
  clear: () => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

/**
 * Holds the current header override. Mounted once in the platform layout
 * (shell-integration) so any descendant page can override the route-derived
 * title/breadcrumb.
 */
export function PageHeaderProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [override, setOverride] = useState<PageHeaderOverride | null>(null);

  const register = useCallback(
    (next: PageHeaderOverride) => setOverride(next),
    [],
  );
  const clear = useCallback(() => setOverride(null), []);

  const value = useMemo<PageHeaderContextValue>(
    () => ({ override, register, clear }),
    [override, register, clear],
  );

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}

/**
 * Page-facing hook: registers a header override for as long as the page is
 * mounted and clears it on unmount. Idempotent across re-renders — the effect
 * only re-runs when the serialized override actually changes.
 */
export function usePageHeader(override: PageHeaderOverride): void {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider");
  }

  const { register, clear } = ctx;
  // Serialize so the effect depends on a stable primitive rather than the
  // object/array identity callers recreate on every render.
  const serialized = JSON.stringify(override);

  useEffect(() => {
    register(JSON.parse(serialized) as PageHeaderOverride);
    return () => clear();
  }, [register, clear, serialized]);
}

/**
 * Header-facing reader: returns the active override, or `null` when there is
 * none (including when rendered without a provider during the transition to
 * the global shell).
 */
export function usePageHeaderOverride(): PageHeaderOverride | null {
  return useContext(PageHeaderContext)?.override ?? null;
}
