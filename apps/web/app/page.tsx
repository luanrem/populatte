import { type Metadata } from "next";

import { AuthCta } from "@/components/marketing/auth-cta";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HeroMock } from "@/components/marketing/hero-mock";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SegmentsBand } from "@/components/marketing/segments-band";
import { WhyAndCases } from "@/components/marketing/why-and-cases";

const TITLE = "Populatte — Do Excel para a Web, num gole de café";
const DESCRIPTION =
  "Importe sua planilha do Excel uma vez, vincule cada coluna a um campo com a extensão e preencha milhares de formulários no navegador.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "pt_BR",
  },
};

/**
 * Public marketing Home — locked to Espresso Dark.
 *
 * The root wrapper fixes the brand background/foreground tokens (not the
 * shadcn `--background`/`--foreground` aliases that flip with `.dark`), so the
 * Home renders identically regardless of the app theme. The single light band
 * lives inside `WhyAndCases`. Smooth anchor scrolling is scoped to this page
 * via `.home-root` in globals.css. Section bodies arrive from their own
 * sub-issues; this shell only composes them in order. The page content sits in
 * a `<main>` landmark between the navbar (`banner`) and the `<footer>`.
 */
export default function HomePage() {
  return (
    <div
      className="home-root font-sans"
      style={{
        background: "var(--espresso-950)",
        color: "var(--latte-200)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <MarketingNav actions={<AuthCta placement="nav" />} />
      <main>
        <Hero mockSlot={<HeroMock />} />
        <SegmentsBand />
        <HowItWorks />
        <WhyAndCases />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
