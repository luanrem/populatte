/**
 * Navigation config — single source of truth for the app chrome.
 *
 * Pure data (no JSX, no fetch, no UI logic): the sidebar and the header both
 * derive their navigation and route metadata from here, mirroring the design
 * (groups "Workspace" / "Suporte"). Keep `icon` as a lucide component reference
 * so consumers can render it directly.
 */
import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  FolderKanban,
  GitCompareArrows,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Users,
} from "lucide-react";

/** "ready": route is live. "soon": placeholder / disabled (em construção). */
export type NavItemStatus = "ready" | "soon";

export interface NavItem {
  /** Stable identifier (English), independent from the localized label. */
  key: string;
  /** UI copy (pt-BR). */
  label: string;
  href: string;
  icon: LucideIcon;
  status: NavItemStatus;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "workspace",
    label: "Workspace",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, status: "ready" },
      { key: "projects", label: "Projetos", href: "/projects", icon: FolderKanban, status: "ready" },
      { key: "mappings", label: "Mapeamentos", href: "/mappings", icon: GitCompareArrows, status: "ready" },
      { key: "team", label: "Equipe", href: "/team", icon: Users, status: "ready" },
      { key: "billing", label: "Assinatura", href: "/billing", icon: CreditCard, status: "ready" },
    ],
  },
  {
    key: "support",
    label: "Suporte",
    items: [
      { key: "help", label: "Ajuda", href: "/help", icon: LifeBuoy, status: "ready" },
      { key: "settings", label: "Configurações", href: "/settings", icon: Settings, status: "ready" },
    ],
  },
];

/**
 * Valid routes intentionally excluded from the nav menu (still accessible):
 * - /onboarding: reached via the activation checklist.
 * - /colors: dev-only palette route.
 */
export const OFF_MENU_ROUTES = ["/onboarding", "/colors"] as const;

/** Flat list of every nav item, in display order. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
