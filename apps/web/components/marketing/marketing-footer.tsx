import Link from "next/link";

import { Container } from "@/components/marketing/container";
import { Logo } from "@/components/marketing/logo";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

// TODO: replace placeholder "#" links once About/Contact/Blog/Privacy/Terms pages exist.
const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Produto",
    links: [
      { label: "Como funciona", href: "#como" },
      { label: "Casos de uso", href: "#casos" },
      { label: "Dúvidas", href: "#faq" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre", href: "#" },
      { label: "Contato", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidade (LGPD)", href: "#" },
      { label: "Termos", href: "#" },
    ],
  },
];

const LINK_FOCUS_RING =
  "rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-950";

/**
 * Marketing footer: a 4-column grid (brand + Produto/Empresa/Legal) over a
 * copyright bar. The brand lockup reuses the shared `Logo`. Columns collapse
 * to two on narrow screens. Espresso Dark only — no `.dark` dependency.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-border-inverse">
      <Container className="grid grid-cols-2 gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Link
            href="/"
            aria-label="Populatte — início"
            className={`inline-flex ${LINK_FOCUS_RING}`}
          >
            <Logo size={30} wordmarkSize={17} />
          </Link>
          <p
            className="mt-3"
            style={{
              fontWeight: 400,
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--mocha-400)",
              maxWidth: "26em",
            }}
          >
            Do Excel para a Web, num gole de café. Preenchimento de formulários automatizado, seguro
            e validado.
          </p>
        </div>

        {FOOTER_COLUMNS.map(({ title, links }) => (
          <div key={title}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "var(--latte-100)",
                marginBottom: 12,
              }}
            >
              {title}
            </div>
            <div className="flex flex-col gap-[9px]">
              {links.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className={`w-fit transition-colors hover:text-[var(--latte-100)] ${LINK_FOCUS_RING}`}
                  style={{ fontWeight: 400, fontSize: 13, color: "var(--mocha-400)" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </Container>

      <div className="border-t border-border-inverse">
        <Container className="py-[18px]">
          <p style={{ fontWeight: 400, fontSize: 12, color: "var(--mocha-500)" }}>
            © 2026 Populatte · Transformando Excel em automação, um formulário por vez.
          </p>
        </Container>
      </div>
    </footer>
  );
}
