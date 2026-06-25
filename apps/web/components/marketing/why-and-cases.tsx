import {
  Calculator,
  Clock,
  Landmark,
  Lock,
  MousePointerClick,
  Scale,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/marketing/container";

interface Benefit {
  Icon: LucideIcon;
  title: string;
  body: string;
}

const BENEFITS: readonly Benefit[] = [
  {
    Icon: Clock,
    title: "~95% menos tempo",
    body: "O que levava noites agora leva minutos.",
  },
  {
    Icon: Target,
    title: "Zero erro de digitação",
    body: "O valor da planilha entra exatamente como está.",
  },
  {
    Icon: Lock,
    title: "Seus dados, seu navegador",
    body: "Nada de credenciais no nosso servidor. Conforme a LGPD.",
  },
  {
    Icon: MousePointerClick,
    title: "Onde você já trabalha",
    body: "Portais do governo, sistemas internos — sem integração.",
  },
];

const USE_CASES: readonly Benefit[] = [
  {
    Icon: Calculator,
    title: "Contabilidade",
    body: "Obrigações acessórias e cadastros em portais fiscais, em massa.",
  },
  {
    Icon: Scale,
    title: "Jurídico",
    body: "Peticionamento e cadastros processuais repetitivos.",
  },
  {
    Icon: Users,
    title: "RH & Dep. pessoal",
    body: "Admissões, eSocial e cadastros de colaboradores.",
  },
  {
    Icon: Landmark,
    title: "BPO financeiro",
    body: "Cadastros bancários e lançamentos para múltiplos clientes.",
  },
];

/** Caps eyebrow tracking — `--tracking-caps` (0.08em) is not a global token
 * yet (that belongs to the `tokens` foundation), so the literal is inlined
 * here, matching the sibling `how-it-works.tsx`. */
const CAPS_TRACKING = "0.08em";

/**
 * "Por que Populatte" + "Casos de uso" — the single intentional LIGHT band.
 * Owns the `#casos` anchor on its inner block.
 *
 * The light band uses brand tokens (`--latte-50` bg, `--text-body` fg) so it
 * stays light regardless of the app theme — never the shadcn
 * `--background`/`--foreground` aliases. Every text/surface element sets its
 * color explicitly so nothing leaks the light foreground from the dark page
 * scope. Presentational only; the card icons are decorative (`aria-hidden`).
 *
 * Secondary copy uses `--text-muted`, which clears WCAG AA on
 * `--latte-50`/`--surface-card` after the token was darkened to `--mocha-600`.
 */
export function WhyAndCases() {
  return (
    <section className="bg-latte-50" style={{ color: "var(--text-body)" }}>
      <Container className="py-[88px]">
        {/* Block A — "Por que Populatte" */}
        <div className="mb-[72px] grid grid-cols-1 items-center gap-12 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div
              className="uppercase"
              style={{
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: CAPS_TRACKING,
                color: "var(--espresso-500)",
                marginBottom: 12,
              }}
            >
              Por que Populatte
            </div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: 36,
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
                color: "var(--text-strong)",
              }}
            >
              Um copiloto, não um robô que você precisa vigiar.
            </h2>
            <p
              style={{
                fontWeight: 400,
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--text-muted)",
                marginTop: 14,
              }}
            >
              Os dados ficam no seu navegador. A extensão só preenche o que você
              mapeou — e você confere antes de enviar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BENEFITS.map(({ Icon, title, body }) => (
              <BenefitCard key={title} Icon={Icon} title={title} body={body} />
            ))}
          </div>
        </div>

        {/* Block B — "Casos de uso" */}
        <div id="casos">
          <div
            className="uppercase"
            style={{
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: CAPS_TRACKING,
              color: "var(--espresso-500)",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            Casos de uso
          </div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 34,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "var(--text-strong)",
              textAlign: "center",
              marginBottom: 40,
            }}
          >
            Feito para quem preenche em lote.
          </h2>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map(({ Icon, title, body }) => (
              <UseCaseCard key={title} Icon={Icon} title={title} body={body} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function BenefitCard({ Icon, title, body }: Benefit) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 22,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <Icon
        aria-hidden="true"
        style={{ width: 22, height: 22, color: "var(--espresso-600)" }}
      />
      <h3 style={{ fontWeight: 700, fontSize: 16, color: "var(--text-strong)", marginTop: 12 }}>
        {title}
      </h3>
      <p
        style={{
          fontWeight: 400,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--text-muted)",
          marginTop: 4,
        }}
      >
        {body}
      </p>
    </div>
  );
}

function UseCaseCard({ Icon, title, body }: Benefit) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 24,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="grid place-items-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius-md)",
          background: "var(--latte-100)",
          marginBottom: 14,
        }}
      >
        <Icon
          aria-hidden="true"
          style={{ width: 22, height: 22, color: "var(--espresso-600)" }}
        />
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 17, color: "var(--text-strong)" }}>{title}</h3>
      <p
        style={{
          fontWeight: 400,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--text-muted)",
          marginTop: 6,
        }}
      >
        {body}
      </p>
    </div>
  );
}
