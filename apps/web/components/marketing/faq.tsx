import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** The four FAQ entries, copy verbatim from home-espresso-dark.html. */
const faqItems: { question: string; answer: string }[] = [
  {
    question: "Preciso instalar uma extensão?",
    answer:
      "Sim. O preenchimento acontece no seu navegador, pela extensão do Populatte — é assim que mantemos seus dados fora do nosso servidor. Instala em menos de um minuto.",
  },
  {
    question: "Quais formatos de planilha são aceitos?",
    answer:
      "Hoje o Populatte trabalha com arquivos Excel (.xlsx). Cada linha vira um registro e cada coluna, um campo mapeável.",
  },
  {
    question: "O Populatte preenche sozinho, sem mim?",
    answer:
      "Ele é um copiloto: você abre o site, escolhe o registro e dispara o preenchimento a partir do mapa que ensinou. Você confere antes de enviar.",
  },
  {
    question: "Meus dados ficam guardados em algum servidor?",
    answer:
      "Os dados sensíveis são tratados localmente, no navegador, durante o preenchimento. Não pedimos nem guardamos as credenciais dos portais. Tudo conforme a LGPD.",
  },
];

/**
 * FAQ (dark). Owns the `#faq` anchor. The column narrows to 780px (its own
 * responsibility). Built on the shadcn Accordion, restyled here for the
 * Espresso Dark theme — isolated cards (`--espresso-900` / `--border-inverse`
 * / radius 14px) with a 12px gap and a chevron that rotates 180° on open. The
 * restyle lives in this file, never in the `components/ui/accordion.tsx`
 * primitive, so the dashboard's own accordions keep the default theme.
 */
export function Faq() {
  return (
    <section id="faq" className="px-6 py-20 md:px-14">
      <div className="mx-auto w-full" style={{ maxWidth: 780 }}>
        <div className="text-center" style={{ marginBottom: 36 }}>
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
            Dúvidas frequentes
          </div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 36,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "var(--latte-50)",
            }}
          >
            Antes de começar
          </h2>
        </div>

        <Accordion type="single" collapsible className="flex flex-col gap-3">
          {faqItems.map(({ question, answer }, index) => (
            <AccordionItem
              key={question}
              value={`faq-${index}`}
              className="rounded-[var(--radius-lg)] border border-[var(--border-inverse)] bg-[var(--espresso-900)] last:border-b"
            >
              <AccordionTrigger className="items-center px-5 py-[18px] text-base font-bold text-[var(--latte-50)] hover:no-underline focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-espresso-950 [&>svg]:translate-y-0 [&>svg]:text-[var(--mocha-400)]">
                {question}
              </AccordionTrigger>
              <AccordionContent className="px-5 pt-0 pb-[18px] text-sm leading-[1.6] text-[var(--latte-300)]">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
