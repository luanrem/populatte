"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarUsageMeter } from "@/components/layout/sidebar-usage-meter";
import { SidebarUser } from "@/components/layout/sidebar-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_GROUPS, isActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Intrinsic pixel size of public/brand/logo-mark.png (prevents CLS). */
const MARK_INTRINSIC = { width: 217, height: 256 } as const;

/**
 * Placeholder usage data until billing is wired. Passed as props to keep
 * SidebarUsageMeter purely presentational; swap for real data later.
 */
const USAGE_PLACEHOLDER = {
  used: 8412,
  total: 10000,
  planName: "Pro",
  renewsInDays: 11,
} as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 py-1.5"
        >
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={MARK_INTRINSIC.width}
            height={MARK_INTRINSIC.height}
            className="h-[34px] w-auto shrink-0"
          />
          <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
              Populatte
            </span>
            <span className="mt-0.5 font-serif text-xs italic text-espresso-500">
              num gole de café
            </span>
          </span>
        </Link>
      </SidebarHeader>

      {/* The content region holds only the primary navigation, so expose it as
          a navigation landmark (assistive tech can jump straight to the menu). */}
      <SidebarContent role="navigation" aria-label="Navegação principal">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mocha-400">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "h-auto gap-2.5 px-3 py-2.5 font-medium text-mocha-800",
                          "hover:bg-mocha-50 hover:text-mocha-800",
                          "data-[active=true]:bg-latte-100 data-[active=true]:font-semibold data-[active=true]:text-espresso-900",
                          "[&>svg]:size-[18px]",
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon
                            className={
                              active ? "text-espresso-700" : "text-mocha-500"
                            }
                          />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarUsageMeter {...USAGE_PLACEHOLDER} />
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
