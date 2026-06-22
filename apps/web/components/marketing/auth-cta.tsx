import { type CSSProperties, type ReactNode } from "react";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight, LogIn, Zap } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Where the CTA pair is rendered. Drives sizing and copy:
 * - `nav`  — compact pill pair (40px / radius 10) in the sticky navbar.
 * - `hero` — large pair (54px / radius 12) under the headline.
 * - `band` — large pair in the final CTA band.
 */
export type AuthCtaPlacement = "nav" | "hero" | "band";

interface PlacementSize {
  height: number;
  radius: number;
  padX: number;
  fontSize: number;
  fontWeight: number;
  gap: number;
  iconSize: number;
}

/** Exact dimensions from home-espresso-dark.html, per placement. */
const SIZE: Record<AuthCtaPlacement, PlacementSize> = {
  nav: { height: 40, radius: 10, padX: 18, fontSize: 14, fontWeight: 600, gap: 7, iconSize: 0 },
  hero: { height: 54, radius: 12, padX: 28, fontSize: 16, fontWeight: 700, gap: 9, iconSize: 19 },
  band: { height: 54, radius: 12, padX: 28, fontSize: 16, fontWeight: 700, gap: 9, iconSize: 18 },
};

/** Gold primary glow used by the hero/band primary CTA. */
const GOLD_SHADOW = "0 12px 34px rgba(240,178,33,0.28)";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-950";

interface CtaLinkProps {
  href: string;
  label: string;
  size: PlacementSize;
  variant: "gold" | "outline";
  icon?: ReactNode;
  withShadow?: boolean;
}

function CtaLink({ href, label, size, variant, icon, withShadow }: CtaLinkProps) {
  const style: CSSProperties = {
    height: size.height,
    borderRadius: size.radius,
    padding: `0 ${size.padX}px`,
    fontSize: size.fontSize,
    fontWeight: size.fontWeight,
    lineHeight: 1,
    gap: icon ? size.gap : undefined,
    ...(withShadow ? { boxShadow: GOLD_SHADOW } : {}),
  };

  return (
    <Link
      href={href}
      style={style}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-colors",
        FOCUS_RING,
        variant === "gold"
          ? "bg-gold-500 text-espresso-950 hover:bg-gold-600"
          : "border border-border-inverse text-latte-100 hover:bg-[rgba(247,227,189,0.08)]",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

interface AuthCtaProps {
  placement: AuthCtaPlacement;
  /** Extra classes for the flex wrapper (e.g. `justify-center` in the band). */
  className?: string;
}

/**
 * Auth-aware CTA pair shared by the navbar, hero and final CTA band.
 *
 * Signed out → the design's "Entrar" / "Começar grátis" pair (copy varies by
 * placement). Signed in → the primary is replaced by a single
 * "Ir para o Dashboard" pill (the secondary is dropped, as it is meaningless
 * once authenticated). Works as a Server Component — Clerk's `<SignedIn>` /
 * `<SignedOut>` resolve auth state on the server.
 */
export function AuthCta({ placement, className }: AuthCtaProps) {
  const size = SIZE[placement];
  const icon = (Comp: typeof Zap) =>
    size.iconSize > 0 ? (
      <Comp aria-hidden="true" style={{ width: size.iconSize, height: size.iconSize }} />
    ) : undefined;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <SignedOut>
        {placement === "nav" && (
          <>
            <CtaLink href="/sign-in" label="Entrar" size={size} variant="outline" />
            <CtaLink href="/sign-up" label="Começar grátis" size={size} variant="gold" />
          </>
        )}
        {placement === "hero" && (
          <>
            <CtaLink
              href="/sign-up"
              label="Começar gratuitamente"
              size={size}
              variant="gold"
              icon={icon(Zap)}
              withShadow
            />
            <CtaLink
              href="/sign-in"
              label="Entrar"
              size={size}
              variant="outline"
              icon={icon(LogIn)}
            />
          </>
        )}
        {placement === "band" && (
          <>
            <CtaLink
              href="/sign-up"
              label="Começar agora — é grátis"
              size={size}
              variant="gold"
              icon={icon(ArrowRight)}
            />
            <CtaLink href="/sign-in" label="Já tenho conta" size={size} variant="outline" />
          </>
        )}
      </SignedOut>

      <SignedIn>
        <CtaLink
          href="/dashboard"
          label="Ir para o Dashboard"
          size={size}
          variant="gold"
          icon={placement === "nav" ? undefined : icon(ArrowRight)}
          withShadow={placement === "hero"}
        />
      </SignedIn>
    </div>
  );
}
