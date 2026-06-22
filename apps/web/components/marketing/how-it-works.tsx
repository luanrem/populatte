import { FileSpreadsheet, GitCompareArrows, Zap, type LucideIcon } from "lucide-react";

import { Container } from "@/components/marketing/container";

interface Step {
  number: string;
  Icon: LucideIcon;
  /** Translucent tint over `--espresso-900` — kept literal; the effect depends
   * on the alpha, so it must not be swapped for a solid token. */
  iconTint: string;
  iconColor: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    Icon: FileSpreadsheet,
    iconTint: "rgba(247,227,189,0.08)",
    iconColor: "var(--latte-100)",
    title: "Importe sua planilha",
    description:
      "Suba um Excel (.xlsx). Cada linha vira um registro, cada coluna um campo mapeável.",
  },
  {
    number: "02",
    Icon: GitCompareArrows,
    iconTint: "rgba(240,178,33,0.14)",
    iconColor: "var(--gold-400)",
    title: "Mapeie com a extensão",
    description:
      "Clique numa coluna, clique no campo do site. O vínculo fica salvo para os próximos registros.",
  },
  {
    number: "03",
    Icon: Zap,
    iconTint: "rgba(91,168,79,0.16)",
    iconColor: "var(--green-400)",
    title: "Preencha e valide",
    description:
      "Um clique e o formulário é populado. Você confere, envia e marca como concluído.",
  },
];

/**
 * "Como funciona" — the three-step dark section. Owns the `#como` anchor that
 * the navbar and footer links target. Presentational only, no animation; the
 * 01/02/03 numbers are decorative and the step icons are `aria-hidden`.
 */
export function HowItWorks() {
  return (
    <section id="como">
      <Container className="py-[88px]">
        <div className="mx-auto text-center" style={{ maxWidth: "38em", marginBottom: 48 }}>
          <div
            className="uppercase"
            style={{
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.08em",
              color: "var(--gold-400)",
              marginBottom: 12,
            }}
          >
            Como funciona
          </div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 40,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "var(--latte-50)",
            }}
          >
            Três passos. Nenhuma madrugada digitando.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
          {STEPS.map(({ number, Icon, iconTint, iconColor, title, description }) => (
            <div
              key={number}
              style={{
                background: "var(--espresso-900)",
                border: "1px solid var(--border-inverse)",
                borderRadius: 16,
                padding: 28,
              }}
            >
              <div
                className="font-mono"
                style={{ fontWeight: 800, fontSize: 12, color: "var(--gold-400)" }}
              >
                {number}
              </div>
              <div
                className="grid place-items-center"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  margin: "16px 0",
                  background: iconTint,
                }}
              >
                <Icon aria-hidden="true" style={{ width: 24, height: 24, color: iconColor }} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 22, color: "var(--latte-50)" }}>{title}</h3>
              <p
                style={{
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--latte-300)",
                  marginTop: 8,
                }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
