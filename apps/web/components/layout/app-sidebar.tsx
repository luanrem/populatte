"use client"

import {
  LayoutDashboard,
  FolderKanban,
  Map,
  Users,
  CreditCard,
  GraduationCap,
  Palette,
  LogOut,
} from "lucide-react"
import { useUser, useClerk } from "@clerk/nextjs"
import Image from "next/image"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Projetos",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Mapeamentos",
    url: "/mappings",
    icon: Map,
  },
  {
    title: "Equipe",
    url: "/team",
    icon: Users,
  },
  {
    title: "Assinatura",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "Tutorial",
    url: "/onboarding",
    icon: GraduationCap,
  },
  {
    title: "Cores",
    url: "/colors",
    icon: Palette,
  },
]

export function AppSidebar() {
  const { user } = useUser()
  const { signOut } = useClerk()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold flex items-center gap-2 mb-4">
            <span className="text-2xl">🎨</span>
            <span>Populatte</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="py-3">
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-base">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex flex-col gap-3 p-3">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                    {user.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt={user.fullName || "User"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {user.firstName?.[0] || user.emailAddresses[0].emailAddress[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate">
                      {user.fullName || user.firstName || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.emailAddresses[0]?.emailAddress}
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                <SidebarMenuButton
                  onClick={() => signOut()}
                  className="w-full justify-start"
                  tooltip="Sair"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
