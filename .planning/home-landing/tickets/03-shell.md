## Contexto

A `apps/web/app/page.tsx` atual é uma landing simples (hero + features + benefits + CTA + footer) com copy antiga; usa `AppHeader`, `Button` do shadcn e classes utilitárias genéricas, e já trata auth com Clerk (`SignedIn`/`SignedOut` + `SignInButton`/`SignUpButton`/`Link` para `/dashboard`). O épico "Home pública (Landing) — Espresso Dark" substitui essa página por uma landing de marketing fiel ao design em `.planning/home-landing/design/home-espresso-dark.html`, com art direction fixa em **Espresso Dark**.

Esta sub-issue é o **esqueleto** (shell) da Home: a rota `app/page.tsx`, a composição/ordem das seções, o lock visual Espresso Dark, a lógica de CTAs auth-aware (Clerk), o `metadata`/SEO da rota e o scaffolding de container/responsividade que as demais seções seguem. As seções em si (navbar, hero, segmentos, como-funciona, por-que+casos, faq+cta+footer) são entregues por sub-issues paralelas e apenas **montadas** aqui.

Decisões travadas relevantes (REFERENCE.md):
1. **Home SEMPRE Espresso Dark e desacoplada do toggle `next-themes`.** A Home não segue claro/escuro; a única faixa clara (seção "Por que + Casos", `background: var(--latte-50)`) é intencional do design, não o modo claro.
2. **Tokens Populatte adotados globalmente** (`var(--espresso-*)`, `--latte-*`, `--gold-*`, etc.) — entregues na sub-issue `tokens`, consumidos aqui.
3. **CTAs auth-aware via Clerk** (deslogado → "Entrar"/"Começar grátis"; logado → "Ir para o Dashboard").

**Achados do código atual (relevantes ao lock do chrome):**
- O `apps/web/app/layout.tsx` envolve os filhos de `<SignedIn>` com `<SidebarProvider><AppSidebar />{children}</SidebarProvider>`. Logo, um usuário **logado** que abrir `/` hoje recebe a **sidebar** do dashboard vazando sobre a Home. Esse é o vazamento real a corrigir.
- O `AppHeader` **não** está no root layout: é incluído **por página** (`app/(platform)/*/page.tsx`, `app/colors/page.tsx` e a `page.tsx` atual). Portanto, basta a nova `page.tsx` não importar `AppHeader` para que ele não apareça na Home (não há header herdado de layout). A correção de layout é necessária apenas pela **sidebar**.
- O route group `app/(platform)/` existe (`dashboard`, `projects`, `mappings`, `team`, `billing`, `onboarding`) mas **não possui `layout.tsx`** — o que torna limpo mover o chrome autenticado para um novo `app/(platform)/layout.tsx`.
- O `middleware.ts` já marca `/` como rota pública (`isPublicRoute` inclui `"/"`); a Home não deve passar a ser protegida.

## Objetivo

Entregar a rota raiz da Home pública que: (a) renderiza as seções de marketing na ordem correta a partir de `components/marketing/`; (b) força o visual Espresso Dark independentemente do tema ativo do `next-themes`; (c) centraliza a lógica auth-aware dos CTAs com Clerk e a distribui para nav/hero/cta-band; (d) define `metadata`/SEO da rota; (e) impede que a **sidebar** do app autenticado apareça na Home; (f) habilita smooth-scroll para as âncoras `#como`, `#casos`, `#faq` respeitando `prefers-reduced-motion`; (g) define o container de conteúdo (`max-width: var(--container-max)` = 1200px, padding lateral `56px`) e o scaffolding de responsividade.

## Escopo

**Inclui:**
- Reescrever `apps/web/app/page.tsx` como o shell da Home, importando e compondo as seções de `components/marketing/`. Remover o `AppHeader` e toda a copy/estrutura legada.
- Lock Espresso Dark: o wrapper raiz da Home fixa `background: var(--espresso-950)`, `color: var(--latte-200)`, `width: 100%`, `overflow: hidden` (espelha o `<div data-screen-label>` do design); base tipográfica `var(--font-sans)` (Hanken Grotesk, vinda de `typo-assets`) com `-webkit-font-smoothing: antialiased`. As seções usam tokens de **marca** explícitos (`--espresso-*`/`--latte-*`/`--gold-*`), **não** os aliases semânticos do shadcn (`--background`/`--foreground`) que mudam com `.dark`. O shell não aplica nem remove a classe `.dark`.
- Ordem das seções (espelhando o HTML): `marketing-nav` → `hero` (conteúdo + mock) → `segments` → `how-it-works` (`id="como"`) → `why-and-cases` (faixa clara, `id="casos"` no bloco interno) → `faq` (`id="faq"`) → `final-cta` → `marketing-footer`.
- Componente/utilitário compartilhado de CTA auth-aware (`auth-cta.tsx`) usando Clerk `<SignedOut>`/`<SignedIn>`, consumido por nav, hero e CTA band, com `next/link` (`Link`) e os destinos do design.
- `metadata` (App Router) da rota: `title`, `description`, `openGraph` em PT-BR.
- Mover o chrome autenticado (`<SignedIn>` + `<SidebarProvider>` + `<AppSidebar />`) do `app/layout.tsx` para um novo `app/(platform)/layout.tsx`, deixando o `RootLayout` apenas com `ClerkProvider`/`ThemeProvider`/`QueryProvider`/`GlobalLoadingIndicator`/`Toaster` + `children` puros. Garantir que rotas fora de `(platform)` (Home `/`, `colors`, `extension/connect`) sigam sem sidebar e que `(platform)/*` siga com sidebar.
- Smooth-scroll para âncoras escopado ao container da Home, com fallback para `prefers-reduced-motion: reduce`.
- Container de conteúdo (`max-width: var(--container-max)`, padding lateral `56px`) e o contrato de breakpoints documentado para as seções.

**Não inclui:**
- Implementação visual interna de cada seção (markup/copy/animações/ícones lucide) — entregues por `navbar`, `hero-content`, `hero-mock`, `sections-dark`, `sections-light`, `faq-cta-footer`.
- Definição dos tokens/paleta em `globals.css` e mapeamento dos aliases shadcn (`tokens`).
- Fontes via `next/font` (Hanken Grotesk / Newsreader / JetBrains Mono) e assets de marca/logo (`typo-assets`).
- A11y completo, `prefers-reduced-motion` das animações do mock e QA responsivo final (`a11y-qa`).
- Migração visual/smoke test do dashboard re-skinnado (`tokens`); aqui só se garante que mover o chrome para `(platform)/layout.tsx` não regride a sidebar.

## Referência de design

Responsabilidade desta sub-issue: **estrutura global + composição + auth + SEO** (o wrapper `<div data-screen-label="Home — Espresso Dark" style="width:100%;overflow:hidden">` e a ordem das seções no `home-espresso-dark.html`).

Valores-chave de layout (do HTML/tokens):
- Container de conteúdo: `max-width: 1200px` (`var(--container-max)`), `margin: 0 auto`, padding lateral `56px`. A seção FAQ usa `max-width: 780px` (responsabilidade da seção `faq-cta-footer`, não do shell).
- Fundo global `var(--espresso-950)`; texto base `var(--latte-200)`; `font-family` base Hanken Grotesk (`var(--font-sans)`); `-webkit-font-smoothing: antialiased`.
- Reset assumido pelas seções (a confirmar no `tokens`/`globals.css` ou escopado): `h1,h2,h3,p { margin: 0 }`, `a { text-decoration: none; color: inherit }`.

Âncoras (ids exatos do HTML):
- "Como funciona" → `id="como"` (na `<section>` escura).
- "Casos de uso" → `id="casos"` (no `<div>` interno da faixa clara).
- "Dúvidas frequentes" → `id="faq"` (a label do link na nav é apenas "Dúvidas").

CTAs — copy literal e destinos do design (para o `auth-cta`):
- Nav: "Entrar" → `/sign-in`; "Começar grátis" → `/sign-up`.
- Hero: "Começar gratuitamente" → `/sign-up`; "Entrar" → `/sign-in`.
- CTA band: "Começar agora — é grátis" → `/sign-up`; "Já tenho conta" → `/sign-in`.
- Estado logado (decisão 3): substituir o CTA primário por "Ir para o Dashboard" → `/dashboard`.

Estilos das CTAs (referência para o componente compartilhado, valores exatos do HTML):
- Pill gold: `background: var(--gold-500)`, texto `var(--espresso-950)`, hover `var(--gold-600)`; o primário do hero/cta usa altura 54px, `border-radius: 12px`; o da nav usa altura 40px, `border-radius: 10px`.
- Outline (ghost escuro): `border: 1px solid var(--border-inverse)`, texto `var(--latte-100)`, hover `background: rgba(247,227,189,0.08)`.

## Arquivos afetados / criados

- `apps/web/app/page.tsx` — **reescrito**: shell da Home (Server Component), compõe as seções e exporta `metadata`. Sem `AppHeader`.
- `apps/web/app/layout.tsx` — **editado**: remover `<SignedIn><SidebarProvider><AppSidebar />…</SignedIn>` e o `<SignedOut>`; renderizar `children` diretamente sob os providers globais.
- `apps/web/app/(platform)/layout.tsx` — **criado**: passa a hospedar `<SignedIn><SidebarProvider><AppSidebar />{children}</SidebarProvider></SignedIn>` (chrome do app autenticado).
- `apps/web/components/marketing/marketing-home.tsx` — **criado** (opcional): wrapper de composição/lock Espresso Dark, para manter `page.tsx` enxuto.
- `apps/web/components/marketing/auth-cta.tsx` — **criado**: CTA auth-aware compartilhado (Clerk `SignedIn`/`SignedOut`), reutilizado por nav/hero/cta-band.
- Imports das seções (entregues por outras sub-issues), todas em `apps/web/components/marketing/`: `marketing-nav.tsx`, `hero.tsx` (`hero-content` + `hero-mock`), `segments.tsx`, `how-it-works.tsx`, `why-and-cases.tsx`, `faq.tsx`, `final-cta.tsx`, `marketing-footer.tsx`. (Os nomes exatos são alinhados com as sub-issues de seção; o shell apenas importa e ordena.)

Observação: nenhum primitivo novo em `components/ui/` (exclusivo do shadcn). Componentes de marketing ficam em `components/marketing/`. Identificadores e caminhos em inglês.

## Passos de implementação

1. **Mover o chrome autenticado para o route group.** Criar `app/(platform)/layout.tsx` contendo `<SignedIn><SidebarProvider><AppSidebar />{children}</SidebarProvider></SignedIn>` (e o `<SignedOut>` correspondente, se for preciso manter o redirecionamento/estado deslogado para rotas internas). Em `app/layout.tsx`, remover esse bloco e renderizar apenas `ClerkProvider` → `ThemeProvider` → `QueryProvider` → `GlobalLoadingIndicator` + `{children}` + `Toaster`. Resultado: a Home (`/`) e demais rotas fora de `(platform)` recebem `children` puros, sem sidebar.
2. **Criar `components/marketing/auth-cta.tsx`** expondo os CTAs via `<SignedOut>` (Entrar → `/sign-in`; Começar grátis → `/sign-up`) e `<SignedIn>` (Ir para o Dashboard → `/dashboard`), com `next/link`. Aceitar props (`variant`/`size`/`placement` ou similar) para servir nav (40px) e hero/cta-band (54px) com o mesmo critério de auth e a copy literal por contexto.
3. **Compor o shell** em `app/page.tsx` (ou `marketing-home.tsx`): wrapper raiz que fixa `background: var(--espresso-950)`, `color: var(--latte-200)`, `width: 100%`, `overflow: hidden` e a base tipográfica `var(--font-sans)`. Renderizar as seções na ordem definida, injetando o `auth-cta` (ou suas props) em `marketing-nav`, `hero` e `final-cta`.
4. **Garantir o lock independente do tema.** Documentar a convenção para as sub-issues de seção: usar tokens de **marca** explícitos (não `--background`/`--foreground`). O shell nunca aplica `.dark`; o lock é dado pelos tokens fixos no wrapper + tokens de marca nas seções. A faixa clara (`var(--latte-50)`/`var(--text-body)`) deve permanecer clara em qualquer tema.
5. **Metadata/SEO.** Exportar `export const metadata: Metadata` em `page.tsx` com `title` (ex.: "Populatte — Do Excel para a Web, num gole de café"), `description` em PT-BR (resumo do produto, ex.: "Importe sua planilha do Excel uma vez, vincule cada coluna a um campo com a extensão e preencha milhares de formulários no navegador.") e `openGraph` (`title`, `description`, `type: "website"`, `locale: "pt_BR"`; `images` somente se houver OG asset disponível de `typo-assets`/`public/`).
6. **Smooth-scroll para âncoras.** Habilitar `scroll-behavior: smooth` **escopado ao container da Home** (não global, para não afetar o dashboard), com `@media (prefers-reduced-motion: reduce)` desativando o scroll animado. Confirmar que os links `#como`, `#casos`, `#faq` da nav apontam para os ids existentes nas seções.
7. **Scaffolding de container/responsividade.** Definir o helper/convenção de container (`max-width: var(--container-max)`, padding lateral `56px`) e os breakpoints que as seções seguem (grids 2/3/4 colunas → 1 coluna no mobile; padding lateral reduzido em telas estreitas; o `font-size` do `h1` 60px do hero deve poder reduzir). Deixar o contrato documentado/comentado para as sub-issues de seção consumirem.
8. **Smoke check de não-regressão.** Validar manualmente que as rotas de `(platform)` (`dashboard`, `projects`, `mappings`, `team`, `billing`, `onboarding`) continuam com sidebar após o move; e que `/`, `colors` e `extension/connect` não renderizam sidebar.

## Critérios de aceite

- [ ] `apps/web/app/page.tsx` renderiza a Home compondo as seções de `components/marketing/` na ordem: nav, hero, segmentos, como-funciona, por-que+casos (faixa clara), faq, cta, footer.
- [ ] O wrapper raiz da Home fixa `background: var(--espresso-950)` e `color: var(--latte-200)` (com `width: 100%; overflow: hidden`) e as seções usam tokens de marca — alternar o tema do app entre claro/escuro **não altera** o visual da Home (sem dependência de `.dark`).
- [ ] A faixa "Por que + Casos" permanece clara (`var(--latte-50)`) em qualquer estado de tema.
- [ ] Usuário **deslogado** vê, via Clerk `<SignedOut>`, os CTAs "Entrar" (`/sign-in`) e "Começar grátis"/"Começar gratuitamente" (`/sign-up`) na nav, hero e CTA band, com a copy literal do design.
- [ ] Usuário **logado** vê, via Clerk `<SignedIn>`, o CTA primário substituído por "Ir para o Dashboard" → `/dashboard` (nav, hero e CTA band).
- [ ] A Home **não** renderiza a sidebar (`AppSidebar`) nem o `AppHeader` em nenhum estado de auth (verificado logado e deslogado).
- [ ] Existe `app/(platform)/layout.tsx` hospedando o chrome autenticado; as rotas `dashboard`, `projects`, `mappings`, `team`, `billing`, `onboarding` continuam exibindo a sidebar (sem regressão).
- [ ] As rotas públicas fora de `(platform)` (`/`, `colors`, `extension/connect`) não exibem a sidebar.
- [ ] A rota `/` continua pública no `middleware.ts` (não passa a ser protegida).
- [ ] `metadata` da rota define `title`, `description` e `openGraph` em PT-BR (com `locale: "pt_BR"`).
- [ ] Os links âncora `#como`, `#casos`, `#faq` rolam suavemente até as seções correspondentes; com `prefers-reduced-motion: reduce`, o scroll não é animado; o `scroll-behavior: smooth` está escopado à Home (não afeta o dashboard).
- [ ] O conteúdo respeita `max-width: 1200px` (`var(--container-max)`) e padding lateral `56px`; o scaffolding de breakpoints está definido e documentado para as seções consumirem.
- [ ] Sem novos primitivos em `components/ui/`; componentes de marketing ficam em `components/marketing/`; identificadores/caminhos em inglês.
- [ ] `npm run lint --filter=@populatte/web` e `npm run type-check --filter=@populatte/web` passam.

## Dependências

- Depende de `tokens` (variáveis Populatte em `globals.css`, incluindo `--espresso-*`, `--latte-*`, `--gold-*`, `--border-inverse`, `--container-max`, e os aliases semânticos mapeados).
- Depende de `typo-assets` (fontes via `next/font` expostas em `var(--font-sans)`/`--font-serif`/`--font-mono`, e logo de marca em `public/`).
- Bloqueia a montagem final das seções: `navbar`, `hero-content`, `hero-mock`, `sections-dark`, `sections-light`, `faq-cta-footer` são compostas por este shell.
- `a11y-qa` depende deste shell (entre as demais seções) para o QA final.

## Riscos & observações

- **Vazamento da sidebar (corrigido pelo move):** hoje só a **sidebar** (`SidebarProvider`/`AppSidebar`) vaza para a Home via `<SignedIn>` no root layout; o `AppHeader` é per-page, então não há header herdado. Mover o chrome para `app/(platform)/layout.tsx` é a abordagem limpa (o route group ainda não tem layout), mas exige smoke test em todas as rotas de `(platform)`. Caso o `<SignedOut>` do root layout tivesse efeito (redirecionar/exibir algo) para rotas internas, replicar esse comportamento no novo layout.
- **Acoplamento com o toggle de tema (decisão 1):** usar aliases semânticos do shadcn (`--background`/`--foreground`) nas seções quebraria o lock no modo claro; por isso a convenção é tokens de marca explícitos. Documentar para `navbar`/`hero-*`/`sections-*`/`faq-cta-footer` e validar especialmente a faixa clara.
- **Smooth-scroll global vs. escopado:** aplicar `scroll-behavior: smooth` globalmente afetaria o dashboard; preferir escopar ao container da Home.
- **OpenGraph image:** depende de um asset OG vindo de `typo-assets`/`public/`. Se ausente no momento, definir `openGraph` sem `images` e deixar follow-up para `typo-assets`/`a11y-qa`.
- **Fronteira Server/Client:** `page.tsx` pode ser Server Component; `auth-cta` com Clerk `SignedIn`/`SignedOut` funciona em Server Components no Next.js. Confinar `"use client"` às seções interativas (menu mobile da navbar em `navbar`; accordion do FAQ em `faq-cta-footer`; mock animado em `hero-mock`) sem forçar a Home inteira a ser client.
- **Foco/contraste das CTAs:** o `auth-cta` deve preservar foco visível (o design system define `--ring`/`--ring-color` gold) e o contraste do texto sobre o pill gold (`var(--espresso-950)` sobre `var(--gold-500)`); a verificação completa de a11y é responsabilidade de `a11y-qa`, mas o componente compartilhado não deve introduzir regressões de foco.
- **Não introduzir libs novas:** usar apenas shadcn, `lucide-react`, `next/font`, Clerk e `next-themes` já presentes.