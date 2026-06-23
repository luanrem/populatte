"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Bell, Plus, Search } from "lucide-react";

import { resolvePageMeta } from "@/lib/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePageHeaderOverride } from "@/components/layout/page-header-context";

interface AppHeaderProps {
  /**
   * @deprecated Transitional: legacy pages pass a static title until
   * shell-integration (POP-52) mounts the global header and migrates pages to
   * `usePageHeader`. Used as a fallback when no context override is present.
   */
  title?: React.ReactNode;
  /**
   * @deprecated Transitional: legacy per-page actions, rendered before the
   * global actions until the pages are migrated.
   */
  children?: React.ReactNode;
}

/**
 * Global app header (60px): breadcrumb + title derived from the route
 * (`resolvePageMeta`) with per-page override via `usePageHeader`, plus the
 * search / notifications / "Novo projeto" actions — disabled with an
 * "em construção" tooltip until their backends exist.
 */
export function AppHeader({ title, children }: AppHeaderProps) {
  const pathname = usePathname();
  const override = usePageHeaderOverride();
  const meta = resolvePageMeta(pathname);

  const breadcrumb = override?.breadcrumb ?? meta.breadcrumb;
  const resolvedTitle = override?.title ?? title ?? meta.title;

  return (
    <header className="sticky top-0 z-30 flex h-[60px] flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-7 backdrop-blur-[8px]">
      <div className="flex items-center gap-3">
        <SignedIn>
          <SidebarTrigger className="md:hidden" />
        </SignedIn>
        <div className="flex flex-col gap-px">
          <Breadcrumb>
            <BreadcrumbList className="gap-1.5 text-xs font-medium text-muted-foreground sm:gap-1.5">
              {breadcrumb.map((crumb, index) => {
                const isLast = index === breadcrumb.length - 1;
                return (
                  <Fragment key={`${crumb.label}-${index}`}>
                    <BreadcrumbItem>
                      {crumb.href && !isLast ? (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="font-medium text-muted-foreground">
                          {crumb.label}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast && (
                      <BreadcrumbSeparator className="[&>svg]:size-[13px]" />
                    )}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <span className="text-xl font-bold leading-none tracking-[-0.02em] text-foreground">
            {resolvedTitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {children}

        {/* Search — disabled until the search backend exists. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="hidden sm:inline-flex">
              <span className="flex h-[38px] w-[248px] items-center gap-2 rounded-[10px] border border-input bg-card px-3">
                <Search className="size-4 text-mocha-400" aria-hidden="true" />
                <input
                  disabled
                  aria-label="Buscar projetos, planilhas"
                  placeholder="Buscar projetos, planilhas…"
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-mocha-400 disabled:cursor-not-allowed"
                />
                <kbd className="rounded-[5px] border border-border bg-mocha-50 px-1.5 py-px font-mono text-[11px] font-semibold text-mocha-400">
                  /
                </kbd>
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent>Busca em construção</TooltipContent>
        </Tooltip>

        {/* Notifications — disabled until the notifications backend exists. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                type="button"
                variant="outline"
                disabled
                aria-label="Notificações"
                className="relative size-[38px] rounded-[10px] border-input bg-card p-0"
              >
                <Bell className="size-[18px] text-mocha-500" aria-hidden="true" />
                <span className="absolute right-[9px] top-2 size-[7px] rounded-full border-[1.5px] border-card bg-gold-500" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Notificações em construção</TooltipContent>
        </Tooltip>

        {/* New project — disabled until project creation is wired up. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                type="button"
                disabled
                aria-label="Novo projeto"
                className="h-[38px] gap-2 rounded-[10px] px-4 text-sm font-semibold"
              >
                <Plus className="size-4" aria-hidden="true" />
                Novo projeto
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Em construção</TooltipContent>
        </Tooltip>

        <SignedOut>
          <SignInButton />
        </SignedOut>
      </div>
    </header>
  );
}
