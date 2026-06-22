import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * The colors preview page renders <AppHeader>, whose <SidebarTrigger> (shown
 * when signed in) calls useSidebar and requires a SidebarProvider ancestor.
 * Since the authenticated chrome moved to app/(platform)/layout.tsx (POP-43),
 * this public dev route provides a bare provider — no <AppSidebar>, so no
 * visible sidebar — to keep the trigger from throwing for signed-in users.
 */
export default function ColorsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
