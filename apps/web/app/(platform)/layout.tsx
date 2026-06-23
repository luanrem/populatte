import { SignedIn } from "@clerk/nextjs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * Authenticated app chrome (sidebar) for every route in the (platform) group:
 * dashboard, projects, mappings, team, billing, onboarding.
 *
 * Relocated here from the root layout so that public routes outside this
 * group — the marketing Home (`/`), `colors`, `extension/connect` — render
 * without the sidebar. The per-page `AppHeader`'s `SidebarTrigger` (gated by
 * `<SignedIn>`) relies on this `SidebarProvider` ancestor.
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
        {children}
      </SidebarProvider>
    </SignedIn>
  );
}
