## Contexto

A Home pública (Landing) do Populatte está sendo reconstruída fiel ao design "Espresso Dark" (`./.planning/home-landing/design/home-espresso-dark.html`), substituindo a `apps/web/app/page.tsx` atual. Decisão travada do produto: a Home é **sempre Espresso Dark** e **desacoplada do toggle claro/escuro** — `next-themes` não a afeta, mesmo que o dashboard continue com light/dark.

Esta sub-issue entrega a **barra de navegação de marketing** (seção `NAV (sticky)` do design): o cabeçalho fixo no topo, com logo + wordmark, links âncora de navegação e um slot para os CTAs. Os CTAs são **auth-aware via Clerk**, mas essa lógica (`SignedIn`/`SignedOut`, `/sign-in`, `/sign-up`, "Ir para o Dashboard") pertence ao `shell` — aqui o navbar apenas **recebe** os CTAs já renderizados como `children`/prop e os posiciona. O navbar **não** instancia Clerk nem `next-themes`.

Depende das fundações `tokens` (variáveis Populatte globais em `globals.css`) e `typo-assets` (fontes via `next/font` + asset `logo-mark` em `public/`).

## Objetivo

Implementar o componente `SiteNav` de marketing fiel ao design: sticky no topo, fundo translúcido espresso + blur, borda inferior sutil, logo-mark + wordmark "Populatte" à esquerda, links âncora ao centro e slot de CTAs à direita. Acima de `md`, layout horizontal idêntico ao design; abaixo de `md`, um menu mobile (não especificado no design — decisão desta issue) via `Sheet` do shadcn acionado por botão hambúrguer. Garantir navegação por teclado, foco visível e respeito a `prefers-reduced-motion`.

## Escopo

**Inclui:**
- Componente `SiteNav` em `apps/web/components/marketing/site-nav.tsx`.
- Container sticky com os valores exatos do design: `position:sticky; top:0; z-index:50`, `height:74px`, `display:flex; align-items:center; gap:28px`, `padding:0 56px`, `border-bottom:1px solid var(--border-inverse)`, `background:color-mix(in oklab, var(--espresso-950) 82%, transparent)`, `backdrop-filter:blur(10px)`.
- Bloco esquerdo (link para `/`): quadrado do logo-mark (`36px`, `border-radius:10px`, `background:var(--latte-100)`, `box-shadow:0 1px 3px rgba(0,0,0,0.35)`, `display:grid; place-items:center`) contendo a imagem `logo-mark` (`height:25px`, `alt="Populatte"`) + wordmark `<b>Populatte</b>` (`font:800 19px/1 'Hanken Grotesk'`, `letter-spacing:-0.02em`, `color:var(--latte-50)`); `gap:11px`.
- Bloco central: nav com os 3 links âncora — "Como funciona" → `#como`, "Casos de uso" → `#casos`, "Dúvidas" → `#faq` — `gap:24px`, `margin-left:14px`, `font:500 14px 'Hanken Grotesk'`, cor base `var(--latte-300)`, hover `var(--latte-50)`.
- Bloco direito: slot/prop (`actions`/`children`) para os CTAs auth-aware vindos do `shell`, alinhado com `margin-left:auto` e `gap:12px`. **Sem mode-toggle.**
- Menu mobile (`< md`): ocultar links/slot centrais e exibir botão hambúrguer (`Button` ghost + ícone lucide `Menu`, com `aria-label`) que abre um `Sheet` (shadcn) contendo os mesmos 3 links âncora e os mesmos CTAs; fechar o `Sheet` ao clicar num link e por `Esc`.
- Acessibilidade: foco visível (ring gold), ordem de tab lógica, `aria-label` no botão hambúrguer, e respeito a `prefers-reduced-motion` na animação de abertura do `Sheet`.

**Não inclui:**
- Implementação dos CTAs auth-aware com Clerk e do link "Ir para o Dashboard" (responsabilidade do `shell`; ver mapa de tickets). O `SiteNav` só expõe o slot e o posiciona; não importa `@clerk/nextjs`.
- Smooth-scroll / scrollspy / highlight do link ativo (apenas `href="#..."` simples).
- Estilização interna dos botões dos CTAs (cores, pill gold, ghost) — eles chegam prontos do `shell`.
- Demais seções da página (hero, sections, faq, cta, footer) — outras sub-issues.
- Qualquer acoplamento ao toggle de tema (`useTheme`/`next-themes`) — o navbar é sempre Espresso Dark.

## Referência de design

Seção **NAV (sticky)** (`home-espresso-dark.html`, bloco `<!-- NAV (sticky) -->`, primeiro `<div>`).

Container sticky:
- `position:sticky; top:0; z-index:50`
- `height:74px`, `display:flex; align-items:center; gap:28px`, `padding:0 56px`
- `border-bottom:1px solid var(--border-inverse)`
- `background:color-mix(in oklab, var(--espresso-950) 82%, transparent)`
- `backdrop-filter:blur(10px)`

Logo (esquerda): `<span>` quadrado `width/height:36px`, `border-radius:10px`, `background:var(--latte-100)`, `box-shadow:0 1px 3px rgba(0,0,0,0.35)`, `display:grid; place-items:center`; dentro `<img src="logo-mark" alt="Populatte" style="height:25px;display:block">`. `gap:11px` até o wordmark `<b>` `font:800 19px/1 'Hanken Grotesk'`, `letter-spacing:-0.02em`, `color:var(--latte-50)`, texto **"Populatte"**.

Links (centro): grupo `display:flex; gap:24px; margin-left:14px`, `font:500 14px 'Hanken Grotesk'`, cor base `var(--latte-300)`. Cada `<a>` com `style-hover="color:var(--latte-50)"`. Copy e href literais:
- "Como funciona" → `#como`
- "Casos de uso" → `#casos`
- "Dúvidas" → `#faq`

CTAs (direita): wrapper `margin-left:auto; display:flex; align-items:center; gap:12px`. No design são `<a href="/sign-in">` "Entrar" (ghost, hover `background:rgba(247,227,189,0.08)`, cor `var(--latte-100)`) e `<a href="/sign-up">` "Começar grátis" (pill gold `background:var(--gold-500)`, cor `var(--espresso-950)`, hover `var(--gold-600)`). **Nesta issue esses CTAs entram pelo slot, renderizados pelo `shell`** — o navbar só garante o wrapper/posicionamento. Não duplicar as classes dos botões aqui.

Foco/ring: usar o token de anel `var(--ring)` (= `var(--gold-500)`) / `var(--ring-color)` (`color-mix(in oklab, var(--gold-500) 55%, transparent)`).

Ícones lucide: apenas `Menu` (hambúrguer mobile, decisão desta issue). O design não usa ícone nos links nem no wordmark do nav.

Mobile: o design **não** define menu mobile. Decisão desta issue: `Sheet` (shadcn) acionado por hambúrguer abaixo de `md`, mantendo Espresso Dark e a mesma copy/hrefs do desktop.

## Arquivos afetados / criados

- **Criar:** `apps/web/components/marketing/site-nav.tsx` (novo diretório `components/marketing/`, ainda inexistente). Como o `Sheet` exige interatividade no cliente, o `SiteNav` deve ser um Client Component (`"use client"`) ou isolar a parte do `Sheet`/hambúrguer num subcomponente cliente (ex.: `apps/web/components/marketing/site-nav-mobile.tsx`) consumido por um `SiteNav` server-side. Definir conforme a forma mais simples; ambos os arquivos vivem em `components/marketing/`.
- **Reutilizar (já instalados em `components/ui/`, NÃO recriar):** `@/components/ui/sheet` e `@/components/ui/button`. Confirmado: `apps/web/components/ui/sheet.tsx` e `apps/web/components/ui/button.tsx` existem.
- **Consumir tokens** definidos por `tokens` em `apps/web/app/globals.css`: `var(--espresso-950)`, `var(--latte-100)`, `var(--latte-50)`, `var(--latte-300)`, `var(--border-inverse)`, `var(--gold-500)`, `var(--ring)`/`var(--ring-color)`. (Hoje esses tokens ainda não existem em `globals.css` — daí a dependência de `tokens`.)
- **Consumir asset** `logo-mark` trazido por `typo-assets` para `apps/web/public/` (ex.: `apps/web/public/logo-mark.png`). Hoje `public/` só tem SVGs default do Next.
- Montagem final (passar CTAs auth-aware) ocorre no `shell` — fora desta issue, mas a API de props (`actions`/`children`) deve ser compatível.

## Passos de implementação

1. Criar `apps/web/components/marketing/site-nav.tsx` com a estrutura flex de 3 blocos (esquerda / centro / direita), aplicando os valores exatos do container sticky (`height:74px`, `z-index:50`, blur, `color-mix`, borda `var(--border-inverse)`). Cores via tokens, nunca hex cru — exceto os literais que já vêm do design (`rgba(247,227,189,0.08)`, `rgba(0,0,0,0.35)`, o `color-mix(...)` e o `82%`).
2. Bloco esquerdo: quadrado do logo-mark (`var(--latte-100)`, radius `10px`, sombra) com a imagem renderizada via `next/image` (ou `<img>` estático), `alt="Populatte"`, altura `25px`; wordmark "Populatte" em Hanken Grotesk `800/19px`, `var(--latte-50)`. Envolver logo+wordmark num `<Link href="/">`.
3. Bloco central: nav com os 3 links âncora (copy e hrefs literais), `var(--latte-300)` com hover `var(--latte-50)` via classes Tailwind, `gap:24px`.
4. Definir a API de props do slot de CTAs: aceitar `children` (ou prop `actions: React.ReactNode`) renderizada no bloco direito com `margin-left:auto` e `gap:12px`. NÃO incluir mode-toggle nem lógica Clerk.
5. Menu mobile: abaixo de `md` (Tailwind `md:` para alternar visibilidade), ocultar links/slot centrais e exibir `Button` ghost com ícone lucide `Menu` e `aria-label` (ex.: "Abrir menu"). Ao acionar, abrir `Sheet` contendo os 3 links âncora e o mesmo slot de CTAs. Fechar o `Sheet` ao navegar para uma âncora (controlar estado `open` e setar `false` no `onClick` dos links).
6. Responsividade: o design usa `padding:0 56px` — em telas estreitas reduzir o padding lateral (ex.: para o token de espaçamento equivalente a `16px`–`24px`) para evitar overflow horizontal, preservando `height:74px` e o alinhamento dos blocos. Garantir que nada estoura abaixo de ~360px.
7. Sobrescrever o tema do `Sheet`: o `Sheet` shadcn usa variáveis semânticas (`bg-background`, `text-foreground`) que, fora do contexto Espresso Dark da Home, renderizariam claro. Forçar o esquema escuro da Home no conteúdo do `Sheet` (fundo `var(--espresso-950)`/`var(--espresso-900)`, texto `var(--latte-50)`/`var(--latte-300)`, borda `var(--border-inverse)`).
8. Acessibilidade e motion: foco visível com ring gold (`var(--ring)`/`var(--ring-color)`), ordem de tab correta, `aria-label`/`aria-expanded` no hambúrguer, fechamento por `Esc` (nativo do `Sheet`). Sob `@media (prefers-reduced-motion: reduce)`, neutralizar a animação de slide do `Sheet` (abrir/fechar sem transição perceptível) e quaisquer transições de hover.
9. Garantir que o componente NÃO importa `next-themes`/`useTheme` e renderiza sempre em Espresso Dark.

## Critérios de aceite

- [ ] `apps/web/components/marketing/site-nav.tsx` existe e exporta `SiteNav`; nenhum componente novo foi criado em `components/ui/` (apenas `Sheet`/`Button` shadcn já instalados são reutilizados).
- [ ] O nav é sticky (`top:0`, `z-index:50`), `height:74px`, com `backdrop-filter:blur(10px)` e `background:color-mix(in oklab, var(--espresso-950) 82%, transparent)`; borda inferior usa `var(--border-inverse)`.
- [ ] Logo-mark renderiza em quadrado `var(--latte-100)` de `36px` com `border-radius:10px` e sombra; a imagem usa `alt="Populatte"`; wordmark "Populatte" em `800/19px` Hanken Grotesk na cor `var(--latte-50)`; logo+wordmark linkam para `/`.
- [ ] Os três links âncora aparecem com a copy literal "Como funciona", "Casos de uso", "Dúvidas" apontando para `#como`, `#casos`, `#faq`; cor base `var(--latte-300)` e hover `var(--latte-50)`.
- [ ] O bloco direito renderiza os CTAs recebidos via slot/props (`actions`/`children`) alinhado à direita (`margin-left:auto`, `gap:12px`); o navbar NÃO importa `@clerk/nextjs` e NÃO há mode-toggle.
- [ ] Acima de `md`, links e slot de CTAs são visíveis em linha; abaixo de `md`, eles dão lugar a um botão hambúrguer (lucide `Menu`, com `aria-label`) que abre um `Sheet` (shadcn) com os mesmos links âncora e os mesmos CTAs; o `Sheet` fecha ao clicar num link e por `Esc`.
- [ ] O conteúdo do `Sheet` mobile respeita o esquema Espresso Dark (não renderiza em fundo claro), com cores via tokens.
- [ ] Toda a navegação é operável por teclado (Tab/Shift+Tab/Enter), com foco visível usando ring gold (`var(--ring)`/`var(--ring-color)`) e contraste suficiente sobre o fundo escuro.
- [ ] Sob `prefers-reduced-motion: reduce`, a animação de abertura/fechamento do `Sheet` e as transições de hover são suprimidas.
- [ ] Em larguras de ~360px a ~768px o navbar não causa overflow horizontal (padding lateral reduzido vs. os `56px` do desktop), mantendo `height:74px`.
- [ ] O componente não importa nem reage a `next-themes`; permanece Espresso Dark independentemente do toggle do dashboard.
- [ ] Cores citadas usam tokens Populatte (sem hex cru no componente), exceto os literais que já vêm do design (`color-mix(...)`, `rgba(247,227,189,0.08)`, `rgba(0,0,0,0.35)`).
- [ ] `npm run lint --filter=@populatte/web` e `npm run type-check` passam para os arquivos criados.

## Dependências

- **Depende de:** `tokens` (variáveis Populatte em `globals.css` — hoje ainda ausentes) e `typo-assets` (fonte Hanken Grotesk via `next/font` + asset `logo-mark` em `public/`).
- **Consumido por:** `shell` (monta o `SiteNav` e passa os CTAs auth-aware via Clerk + link "Ir para o Dashboard") e validado por `a11y-qa`.
- Primitivos `Sheet` e `Button` do shadcn já estão em `apps/web/components/ui/` (confirmado) — não precisam de `pnpm dlx shadcn add`.

## Riscos & observações

- **Slot de CTAs vs. `shell`:** os CTAs (incluindo a alternância `SignedIn`/`SignedOut` e "Ir para o Dashboard") são montados pelo `shell`. Evitar duplicar essa lógica ou as classes dos botões aqui para não acoplar o componente de marketing ao Clerk — o navbar só posiciona o slot. A copy/hrefs de referência ("Entrar"/`/sign-in`, "Começar grátis"/`/sign-up`) servem só para dimensionar o slot.
- **Menu mobile é decisão de implementação** (ausente no design): manter a art direction Espresso Dark dentro do `Sheet` e a mesma copy/hrefs dos links desktop. Como o `Sheet` shadcn herda variáveis semânticas claras, é preciso sobrescrever explicitamente para o esquema escuro.
- **`backdrop-filter:blur` + `color-mix(in oklab, ...)`:** confirmar suporte nos browsers-alvo; o fundo translúcido só "funciona" com conteúdo rolando por baixo do nav sticky. Avaliar fallback de `background` opaco (`var(--espresso-950)`) caso `backdrop-filter` não seja suportado.
- **Ring de foco:** `--ring` mapeia para `var(--gold-500)`; garantir contraste do anel sobre o fundo escuro (usar `var(--ring-color)` quando precisar de halo translúcido).
- **Client vs. Server Component:** o `Sheet` precisa de estado/interatividade; isolar a parte interativa em um subcomponente `"use client"` mantém o restante do `SiteNav` server-side, se preferível.
- **`next/image` para o logo-mark:** se o asset vier como PNG, definir `width`/`height` para evitar layout shift; alternativamente usar `<img>` estático para um ativo tão pequeno.