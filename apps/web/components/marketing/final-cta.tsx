import { AuthCta } from "@/components/marketing/auth-cta";
import { Container } from "@/components/marketing/container";

/**
 * Final CTA band. A gradient espresso box with two purely decorative layers —
 * a gold radial wash and a giant serif "☕" watermark (both `aria-hidden` and
 * non-interactive, clipped by `overflow: hidden` so they never trigger
 * horizontal scroll). The headline emphasises "horas" in the editorial serif,
 * and the auth-aware CTA cluster is delegated to `AuthCta` (band placement).
 *
 * Decorative `rgba(...)` values are kept literal: they come straight from the
 * design and have no token equivalent with transparency.
 */
export function FinalCta() {
  return (
    <Container as="section" className="pb-20">
      <div
        className="relative overflow-hidden px-6 py-12 text-center md:px-12 md:py-16"
        style={{
          borderRadius: "var(--radius-2xl)",
          background: "linear-gradient(135deg, var(--espresso-800), var(--espresso-950))",
          border: "1px solid var(--border-inverse)",
        }}
      >
        {/* Gold radial wash — decorative. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(500px 300px at 80% 10%, rgba(240,178,33,0.18), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        {/* Oversized coffee watermark — decorative. */}
        <div
          aria-hidden="true"
          className="absolute select-none"
          style={{
            right: 30,
            top: -50,
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 200,
            lineHeight: 1,
            color: "rgba(247,227,189,0.06)",
            pointerEvents: "none",
          }}
        >
          ☕
        </div>

        <h2
          className="relative text-3xl md:text-[44px]"
          style={{
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            color: "var(--latte-50)",
          }}
        >
          Pronto para economizar{" "}
          <em
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontWeight: 500,
              color: "var(--gold-400)",
            }}
          >
            horas
          </em>{" "}
          de trabalho?
        </h2>
        <p
          className="relative"
          style={{
            fontWeight: 400,
            fontSize: 18,
            color: "var(--latte-300)",
            margin: "14px 0 30px",
          }}
        >
          Crie sua conta e prepare o primeiro projeto em poucos minutos.
        </p>
        <AuthCta placement="band" className="relative flex-wrap justify-center" />
      </div>
    </Container>
  );
}
