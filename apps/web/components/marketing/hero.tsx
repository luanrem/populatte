import { type ReactNode } from "react";

import { Coffee, ShieldCheck } from "lucide-react";

import { AuthCta } from "@/components/marketing/auth-cta";
import { Container } from "@/components/marketing/container";

/** Decorative radial wash — gold (top-right) + green (bottom-left), brand
 * colors at design opacities. Both gradients live in a single `background`. */
const RADIAL_BACKGROUND =
  "radial-gradient(720px 460px at 76% 22%, rgba(240,178,33,0.16), transparent 60%)," +
  "radial-gradient(620px 420px at 12% 90%, rgba(91,168,79,0.10), transparent 60%)";

interface HeroProps {
  /** Right-column slot for the animated form-fill mock (sub-issue hero-mock).
   * The cell is always rendered to keep the 2-column grid intact when empty. */
  mockSlot?: ReactNode;
}

/**
 * Hero — first fold of the public Home (Espresso Dark).
 *
 * `<header>` with `position:relative; overflow:hidden` holding one decorative
 * radial layer behind a 2-column grid. The left column carries the value
 * message (badge, serif headline, subcopy, CTAs, trust line); the right column
 * exposes a slot for `hero-mock`. The auth-aware CTA pair is the shared
 * `AuthCta` (`placement="hero"`) — no Clerk logic is duplicated here.
 *
 * Server Component; inherits the locked Espresso Dark from the shell (no
 * `dark:` styles, never observes next-themes).
 */
export function Hero({ mockSlot }: HeroProps) {
  return (
    <header className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: RADIAL_BACKGROUND }}
      />

      <Container className="relative grid grid-cols-1 items-center gap-[52px] pt-20 pb-[72px] md:grid-cols-[1.02fr_0.98fr]">
        <div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-[14px] py-[6px] text-xs font-semibold text-gold-400"
            style={{
              background: "rgba(240,178,33,0.12)",
              border: "1px solid rgba(240,178,33,0.30)",
            }}
          >
            <Coffee aria-hidden="true" className="size-[15px]" />
            Do Excel para a Web, num gole de café
          </span>

          <h1 className="mt-6 text-[38px] font-extrabold leading-[1.02] tracking-[-0.035em] text-latte-50 md:text-[60px]">
            Pare de digitar formulários.
            <br />
            <em className="font-serif font-medium text-gold-400">Tome um café</em> enquanto o
            Populatte preenche.
          </h1>

          <p className="mt-6 mb-8 max-w-[32em] text-[19px] leading-[1.55] text-latte-300">
            Importe sua planilha do Excel uma vez, vincule cada coluna a um campo com a extensão e
            preencha milhares de formulários no navegador. Você dirige, a extensão preenche.
          </p>

          <AuthCta placement="hero" className="mt-8" />

          <div className="mt-[18px] flex items-center gap-2 text-[13px] font-medium text-mocha-400">
            <ShieldCheck aria-hidden="true" className="size-[15px]" />
            Sem cartão de crédito · Conforme a LGPD · Configuração em 2 minutos
          </div>
        </div>

        <div>{mockSlot}</div>
      </Container>
    </header>
  );
}
