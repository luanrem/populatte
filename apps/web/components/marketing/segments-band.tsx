import { Container } from "@/components/marketing/container";

/**
 * Social-proof segment strip on the Espresso Dark home: the eyebrow plus the
 * four audience segments Populatte is built for, set in Newsreader italic.
 * Presentational only — wraps and centers via `flex-wrap`, no animation.
 */
const SEGMENTS = [
  "Contabilidades",
  "Escritórios jurídicos",
  "RH & Dep. pessoal",
  "BPO financeiro",
] as const;

export function SegmentsBand() {
  return (
    <section className="border-y border-border-inverse">
      <Container className="flex flex-wrap items-center justify-center gap-[30px] py-[22px]">
        <span
          className="uppercase"
          style={{
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "0.05em",
            color: "var(--mocha-400)",
          }}
        >
          Confiado por equipes em
        </span>

        {SEGMENTS.map((segment) => (
          <span
            key={segment}
            className="font-serif italic"
            style={{ fontSize: 20, color: "var(--latte-300)" }}
          >
            {segment}
          </span>
        ))}
      </Container>
    </section>
  );
}
