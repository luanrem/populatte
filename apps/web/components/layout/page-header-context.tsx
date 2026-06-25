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
 * Activates the global header search input for the page that supplies it. The
 * mere presence of this object turns the search on; the live query lives in the
 * provider state (not here), since this override is serialized across the
 * register channel and functions would not survive it.
 */
export interface PageHeaderSearch {
  placeholder?: string;
}

/**
 * Per-page override for the global header. A page supplies just the fields it
 * needs (e.g. a dynamic project detail page overrides only the `title`); the
 * header falls back to `resolvePageMeta(pathname)` for anything omitted.
 */
export interface PageHeaderOverride {
  title?: string;
  breadcrumb?: Crumb[];
  search?: PageHeaderSearch;
}

interface PageHeaderContextValue {
  override: PageHeaderOverride | null;
  register: (override: PageHeaderOverride) => void;
  clear: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
  const [searchQuery, setSearchQuery] = useState("");

  const register = useCallback((next: PageHeaderOverride) => {
    setOverride(next);
    // Drop any stale query when the page does not request search, so it never
    // leaks across routes (e.g. navigating from /projects to a page without it).
    if (next.search == null) setSearchQuery("");
  }, []);
  const clear = useCallback(() => {
    setOverride(null);
    setSearchQuery("");
  }, []);

  const value = useMemo<PageHeaderContextValue>(
    () => ({ override, register, clear, searchQuery, setSearchQuery }),
    [override, register, clear, searchQuery],
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

/**
 * Header-facing control for the search input: lets the header push the (debounced)
 * query into the shared provider state so the active page can read it.
 */
export function usePageHeaderSearchControl(): {
  setSearchQuery: (query: string) => void;
} {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error(
      "usePageHeaderSearchControl must be used within a PageHeaderProvider",
    );
  }
  return { setSearchQuery: ctx.setSearchQuery };
}

/**
 * Page-facing reader: the current (debounced) header search query. Empty string
 * when no page has activated search. Consumption/filtering is up to the page.
 */
export function usePageHeaderSearchQuery(): string {
  return useContext(PageHeaderContext)?.searchQuery ?? "";
}
