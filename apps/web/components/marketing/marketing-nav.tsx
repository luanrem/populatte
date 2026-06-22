import { type ReactNode } from "react";

import Link from "next/link";

import { Container } from "@/components/marketing/container";
import { Logo } from "@/components/marketing/logo";
import { MarketingNavMobile } from "@/components/marketing/marketing-nav-mobile";

/**
 * Sticky marketing navbar (NAV section of home-espresso-dark.html).
 *
 * Always Espresso Dark — no `next-themes`/`useTheme`. The auth-aware CTAs arrive
 * through the `actions` slot (injected by the shell), so this component stays
 * decoupled from Clerk. From `md` the brand lockup, anchor links and CTA slot
 * sit in one row; below `md` the links/CTAs collapse into the mobile menu.
 */
export const NAV_LINKS = [
  { href: "#como", label: "Como funciona" },
  { href: "#casos", label: "Casos de uso" },
  { href: "#faq", label: "Dúvidas" },
] as const;

interface MarketingNavProps {
  /** Auth-aware CTA cluster, rendered by the shell so the nav stays Clerk-free. */
  actions: ReactNode;
}

/** Gold focus ring on the Espresso Dark surface (mirrors auth-cta.tsx). */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-950";

export function MarketingNav({ actions }: MarketingNavProps) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-border-inverse backdrop-blur-[10px]"
      style={{ background: "color-mix(in oklab, var(--espresso-950) 82%, transparent)" }}
    >
      <Container className="flex h-[74px] items-center gap-7">
        <Link href="/" aria-label="Populatte — início" className={`rounded-md ${FOCUS_RING}`}>
          <Logo size={36} />
        </Link>

        <nav
          className="ml-[14px] hidden items-center gap-6 text-sm font-medium md:flex"
          style={{ color: "var(--latte-300)" }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md whitespace-nowrap transition-colors hover:text-latte-50 motion-reduce:transition-none ${FOCUS_RING}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">{actions}</div>

        <MarketingNavMobile className="ml-auto md:hidden" links={NAV_LINKS} actions={actions} />
      </Container>
    </header>
  );
}
