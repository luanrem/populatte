/**
 * Route metadata helpers — pure derivations from the current pathname.
 *
 * Consumed by the sidebar (active state) and the header (title + breadcrumb).
 * For dynamic segments these return a generic, overridable title; the header's
 * `usePageHeader` context (separate ticket) supplies the real detail name.
 */
import { NAV_GROUPS } from "./nav-config";

/**
 * Root workspace label shown in the breadcrumb. Placeholder until a
 * multi-workspace backend exists.
 */
export const WORKSPACE_LABEL = "Acme Contabilidade";

export interface Crumb {
  label: string;
  /** When set, the crumb links somewhere; the last crumb is usually plain text. */
  href?: string;
}

export interface PageMeta {
  title: string;
  breadcrumb: Crumb[];
}

/**
 * Whether `href` is the active nav target for `pathname`: exact match or a
 * parent prefix of a sub-route (e.g. `/projects/123` activates `/projects`).
 */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Derives title + breadcrumb for a pathname by matching it against the nav
 * config. Exact matches use the item label as the title; sub-routes fall back
 * to a generic (parent) title that the page can override.
 */
export function resolvePageMeta(pathname: string): PageMeta {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((navItem) => isActive(pathname, navItem.href));
    if (!item) continue;

    const base: Crumb[] = [{ label: WORKSPACE_LABEL }, { label: group.label }];

    if (pathname === item.href) {
      return { title: item.label, breadcrumb: base };
    }

    // Dynamic / sub-route: generic title, overridable via usePageHeader.
    return {
      title: item.label,
      breadcrumb: [...base, { label: item.label, href: item.href }],
    };
  }

  return { title: "Populatte", breadcrumb: [{ label: WORKSPACE_LABEL }] };
}
