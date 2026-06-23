import { SignedIn } from "@clerk/nextjs";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeaderProvider } from "@/components/layout/page-header-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Authenticated app shell for every route in the (platform) group: dashboard,
 * projects, mappings, team, billing, onboarding.
 *
 * Mounts the chrome once — sidebar + global header — so pages render only their
 * own content. The header derives its title/breadcrumb from the route
 * (`resolvePageMeta`); dynamic pages refine it via `usePageHeader`, backed by
 * the `PageHeaderProvider` here.
 *
 * `SidebarInset` already renders the `<main>` landmark, so the content region
 * below the header is a plain `<div>` — no nested `<main>`.
 *
 * Located in this group (not the root layout) so public routes outside it — the
 * marketing Home (`/`), `colors`, `extension/connect` — render without chrome.
 */
export default function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SignedIn>
      <SidebarProvider style={{ "--sidebar-width": "248px" } as React.CSSProperties}>
        <AppSidebar />
        <SidebarInset>
          <PageHeaderProvider>
            <AppHeader />
            <div className="flex-1">{children}</div>
          </PageHeaderProvider>
        </SidebarInset>
      </SidebarProvider>
    </SignedIn>
  );
}
