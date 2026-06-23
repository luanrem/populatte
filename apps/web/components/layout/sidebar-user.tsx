"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

/** Up to two uppercase initials from the user's name (e-mail as fallback). */
function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

/**
 * Sidebar user footer — the account row with avatar, name/e-mail and a "Pro"
 * badge (Clerk-backed). The row is a menu trigger; sign-out lives in an
 * accessible dropdown so the action survives even though the design shows no
 * explicit button.
 */
export function SidebarUser() {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  const name = user.fullName ?? user.firstName ?? "Usuário";
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";
  const initials = initialsFrom(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menu da conta"
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-hidden transition-colors hover:bg-mocha-50 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-9 shrink-0 select-none items-center justify-center rounded-full bg-gold-200 text-sm font-bold text-espresso-700">
            {initials}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-semibold text-foreground">
            {name}
          </span>
          <span className="truncate text-xs text-muted-foreground">{email}</span>
        </span>
        <Badge className="shrink-0 border-transparent bg-gold-200 text-espresso-700 group-data-[collapsible=icon]:hidden">
          Pro
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="text-mocha-500" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
