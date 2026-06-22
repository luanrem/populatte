## Resumo

Landing page **pública** de marketing que **substitui a `apps/web/app/page.tsx` atual**, implementada com fidelidade ao design **Espresso Dark** (projeto Populatte Design). É a porta de entrada do produto: apresenta a proposta de valor ("Do Excel para a Web, num gole de café"), os passos de uso, benefícios, casos de uso, FAQ e CTAs de cadastro/login. A art direction é fixa em tema escuro espresso, com uma única faixa clara intencional, e os CTAs são auth-aware via Clerk (deslogado → Entrar/Começar grátis; logado → Ir para o Dashboard).

Este é o épico guarda-chuva: agrupa 10 sub-issues que vão da fundação (tokens + tipografia/assets) ao shell, às seções e ao QA final.

## Contexto & problema

- A `apps/web/app/page.tsx` atual já é uma landing simples (hero + features + benefits + CTA + footer), mas com copy e visual genéricos, sem identidade de marca Populatte.
- Existe um design fiel e aprovado (Espresso Dark) no projeto de design, com markup, tokens, copy e animações definidos. Falta traduzir esse design para a stack real do `apps/web` (Next.js App Router + Tailwind v4 CSS-first + shadcn/ui).
- A paleta atual do `globals.css` é OKLCH genérica (base "slate") e não reflete a marca. Adotar os tokens Populatte globalmente resolve a Home **e** re-skinna o dashboard — o que precisa ser feito com cuidado durante o piloto.
- Faltam fontes de marca (Hanken Grotesk, Newsreader, JetBrains Mono), o componente `accordion` do shadcn (para o FAQ) e os assets de logo no `public/`.

## Decisões travadas

1. **Projeto Linear = Piloto RAL.** O épico e todas as 10 sub-issues ficam no time Populatte (key POP), projeto Piloto RAL — escopo único de planejamento do piloto.
2. **Tema da Home sempre Espresso Dark.** A Home NÃO segue o toggle claro/escuro (next-themes). A faixa clara da seção "Por que + Casos de uso" é parte do design, não o modo claro do tema — evita que o usuário "quebre" a art direction trocando de tema.
3. **Tokens adotados globalmente já.** Os tokens Populatte (ramps espresso/latte/gold/green/mocha/terra + aliases semânticos + raios/sombras/ring/motion) substituem a paleta OKLCH genérica em `globals.css` e mapeiam as variáveis semânticas do shadcn (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--ring`, `--sidebar-*`, `--chart-*`) — fonte única de verdade de cor para Home e dashboard.
4. **CTAs auth-aware (Clerk).** Logado: "Entrar/Começar grátis" viram "Ir para o Dashboard"; deslogado: Entrar (`/sign-in`) e Começar grátis (`/sign-up`) — mantém o comportamento atual da page.tsx e não cria fricção para quem já tem conta.

## Design system & fonte

- **Fonte do design (source of truth visual):** https://claude.ai/design/p/1a97966a-4217-4773-a3f6-94e730d7b31c?file=Populatte+Home+-+Espresso+Dark.dc.html
- **Artefatos locais** (versionados em `.planning/home-landing/`):
  - `.planning/home-landing/REFERENCE.md` — breakdown por seção, decisões e template das sub-issues
  - `.planning/home-landing/design/home-espresso-dark.html` — markup/inline-styles/copy exatos do alvo
  - `.planning/home-landing/design/tokens.css` — tokens do design system (cores, tipografia, espaçamento, elevação)
- **Tokens Populatte:** ramps `espresso-*`, `latte-*`, `gold-*`, `green-*`, `mocha-*`, `terra-*` + aliases semânticos (`--surface-card`, `--border-subtle`, `--border-inverse`, `--text-strong`, `--text-body`, `--text-muted`, `--success-soft`, `--ring-color`) + raios/sombras (`--shadow-xs/sm/lg`) e motion. Referenciar sempre via token (`var(--gold-500)`, `var(--espresso-950)`), nunca hex cru.
- **Fontes (via `next/font`):** **Hanken Grotesk** (sans, corpo e títulos), **Newsreader** (serif itálico para os `<em>` de destaque e eyebrows itálicos), **JetBrains Mono** (valores monoespaçados do mock e numeração "01/02/03"). Substituem/coexistem com a Geist atual conforme necessário.
- **Ícones:** `lucide-react` (já instalado) — todos os ícones do design existem: coffee, zap, log-in, shield-check, loader, building-2, hash, mail, map-pin, check, check-check, file-spreadsheet, git-compare-arrows, clock, target, lock, mouse-pointer-click, calculator, scale, users, landmark, chevron-down, arrow-right.

## Abordagem técnica

- **Next.js App Router:** a Home vive em `apps/web/app/page.tsx` (substitui a atual). Composição via componentes de marketing; metadata/SEO no arquivo de rota.
- **Tailwind v4 CSS-first:** sem `tailwind.config`; tokens e keyframes declarados em `app/globals.css` (`@import "tailwindcss"` + `@theme inline` + `@keyframes`). PostCSS com `@tailwindcss/postcss`.
- **shadcn/ui como blocos primitivos:** reusar Button, Sheet (menu mobile), Accordion (FAQ — **precisa ser adicionado**, não existe ainda). Primitivos só em `components/ui/`; **componentes de marketing em `apps/web/components/marketing/`** (novo diretório). Identificadores/código em inglês, copy/UI em PT-BR.
- **Lock Espresso Dark via tokens de marca:** a Home não reage ao next-themes — o tema escuro é garantido por tokens/estilo de marca no shell de marketing (independente do `.dark` global), e a faixa clara é uma cor de seção explícita.
- **Clerk auth-aware:** `SignedIn`/`SignedOut` (ou equivalente) para alternar os CTAs entre Dashboard e Entrar/Começar grátis, preservando o comportamento atual.
- **Animações:** keyframes do design (`popfill`, `popwash`, `popchk`, `popspin`, `popfloat`) declarados em CSS; **todas** degradam com `@media (prefers-reduced-motion: reduce)` (estado final preenchido, sem loop).
- **Restrição:** não introduzir libs novas além do que já existe (shadcn, lucide-react, next/font, Clerk, next-themes).

## Sub-issues (ordem e dependências)

**Fase 1 — Fundação (paralelizável, bloqueia todo o resto):**
1. **[tokens]** Fundação: tokens/paleta Populatte globais (globals.css + Tailwind v4) — depende de: —
2. **[typo-assets]** Fundação: tipografia (next/font) + assets de marca (logo) — depende de: —

**Fase 2 — Shell (depende da fundação; é onde tudo é montado):**
3. **[shell]** Shell da Home: rota, layout marketing (lock Espresso Dark), metadata/SEO, CTAs auth-aware, composição — depende de: tokens, typo-assets

**Fase 3 — Seções (todas dependem só da fundação; podem ser construídas em paralelo como componentes em `components/marketing/` e plugadas pelo shell):**
4. **[navbar]** Navbar marketing: sticky + blur + responsivo (menu mobile) — depende de: tokens, typo-assets
5. **[hero-content]** Hero: conteúdo (badge, headline serif, subcopy, CTAs, trust line) + fundo radial — depende de: tokens, typo-assets
6. **[hero-mock]** Hero: mock animado de preenchimento + badge flutuante (prefers-reduced-motion) — depende de: tokens, typo-assets
7. **[sections-dark]** Seções escuras: faixa de segmentos + "Como funciona" (3 passos) — depende de: tokens, typo-assets
8. **[sections-light]** Faixa clara: "Por que Populatte" (benefícios) + "Casos de uso" — depende de: tokens, typo-assets
9. **[faq-cta-footer]** FAQ (accordion) + CTA final + Footer — depende de: tokens, typo-assets

**Fase 4 — QA final (depende de tudo):**
10. **[a11y-qa]** A11y, prefers-reduced-motion e QA responsivo final — depende de: shell, navbar, hero-content, hero-mock, sections-dark, sections-light, faq-cta-footer

**Ordem recomendada de execução:**
- Comece **tokens** e **typo-assets** em paralelo — são a base de tudo e não dependem de nada.
- Em seguida, **shell** pode subir em paralelo às seções: o shell define a rota/layout/metadata/auth e vai integrando os componentes à medida que ficam prontos (placeholders no início).
- As 6 sub-issues de seção (**navbar**, **hero-content**, **hero-mock**, **sections-dark**, **sections-light**, **faq-cta-footer**) são independentes entre si e podem ser tocadas por pessoas diferentes simultaneamente. Atenção: **faq-cta-footer** exige adicionar o componente `accordion` do shadcn.
- **a11y-qa** é a porteira final — só roda quando shell + todas as seções estão integrados.

## Definition of Done do épico

- [ ] **Paridade visual** com o design Espresso Dark em **3 breakpoints** (mobile, tablet, desktop): layout, cores (via tokens), tipografia, espaçamentos e copy literal conferem com `home-espresso-dark.html`.
- [ ] **Dashboard existente sem regressão visual** após a adoção global dos tokens Populatte — smoke test visual das telas atuais (login, dashboard, telas do piloto) confirma que nada quebrou no re-skin.
- [ ] **Acessibilidade AA:** contraste suficiente nas faixas escura e clara, navegação por teclado (nav, accordion, CTAs), foco visível, `alt`/labels corretos, hierarquia semântica de headings.
- [ ] **`prefers-reduced-motion`:** todas as animações (popfill, popwash, popchk, popspin, popfloat) degradam para estado final estático, sem loop.
- [ ] **CTAs auth-aware corretos:** deslogado → Entrar (`/sign-in`) + Começar grátis (`/sign-up`); logado → Ir para o Dashboard, em todos os pontos (navbar, hero, CTA band).
- [ ] **Qualidade:** `npm run lint` e `npm run type-check` verdes no `apps/web`.
- [ ] Componentes de marketing em `apps/web/components/marketing/`; `components/ui/` permanece exclusivo do shadcn.

## Riscos

- **Principal — adoção global de tokens re-skinna o dashboard durante o piloto:** mapear as variáveis semânticas do shadcn para os tokens Populatte muda a aparência de TODAS as telas existentes, não só da Home. Como há um piloto RAL em produção, é preciso smoke test visual das telas atuais (e idealmente validação com o usuário do piloto) antes de considerar concluído. Mitigação: tratar `tokens` como sub-issue de fundação com critério de aceite explícito de "dashboard sem regressão", e validar light/dark do dashboard junto.
- **Lock de tema vs. next-themes:** garantir Espresso Dark na Home sem interferir no toggle global do dashboard — risco de a Home herdar `.dark`/light indevidamente ou de o lock vazar para outras rotas. Mitigação: isolar o tema no layout/shell de marketing.
- **Fontes via next/font:** três famílias novas (Hanken Grotesk, Newsreader, JetBrains Mono) podem afetar peso de bundle e FOUT/CLS — atenção a `display: swap` e subsetting.
- **Adicionar `accordion` do shadcn:** o FAQ depende de um componente ainda não instalado; precisa entrar antes de `faq-cta-footer`.