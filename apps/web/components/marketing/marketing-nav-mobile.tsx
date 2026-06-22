"use client";

import { type ReactNode, useState } from "react";

import { Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Gold focus ring on the Espresso Dark surface (mirrors auth-cta.tsx). */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-950";

interface MarketingNavMobileProps {
  links: readonly { href: string; label: string }[];
  /** Same auth-aware CTA cluster shown on desktop, rendered inside the sheet. */
  actions: ReactNode;
  className?: string;
}

/**
 * Mobile navigation (below `md`) — not in the design, decided for this issue.
 * A hamburger opens a shadcn `Sheet` forced to the Home's Espresso Dark scheme
 * (the primitive defaults to the light `bg-background`). It holds the same
 * anchor links (closing on click; `Esc` closes natively) and the same CTAs.
 * Slide/hover motion is suppressed under `prefers-reduced-motion`.
 */
export function MarketingNavMobile({ links, actions, className }: MarketingNavMobileProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menu"
            aria-expanded={open}
            className={cn(
              "text-latte-100 hover:bg-[rgba(247,227,189,0.08)] hover:text-latte-50",
              FOCUS_RING,
            )}
          >
            <Menu aria-hidden="true" className="size-6" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="gap-0 border-border-inverse p-0 motion-reduce:animate-none motion-reduce:transition-none"
          style={{ background: "var(--espresso-950)", color: "var(--latte-200)" }}
        >
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <SheetDescription className="sr-only">
            Links da página e acesso à sua conta.
          </SheetDescription>

          <nav
            className="flex flex-col gap-1 px-6 pt-16 pb-6 text-base font-medium"
            style={{ color: "var(--latte-300)" }}
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md py-3 transition-colors hover:text-latte-50 motion-reduce:transition-none",
                  FOCUS_RING,
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t border-border-inverse px-6 py-6 [&>div]:flex-col [&>div]:items-stretch [&_a]:w-full">
            {actions}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
