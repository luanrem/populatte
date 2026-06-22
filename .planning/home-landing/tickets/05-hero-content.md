## Contexto

Esta sub-issue faz parte do épico **Home pública (Landing) — Espresso Dark**, que substitui a `apps/web/app/page.tsx` atual por uma landing de marketing fiel ao design Populatte. A Home é **sempre Espresso Dark** e desacoplada do toggle claro/escuro (next-themes): a art direction é fixa e o lock do tema é responsabilidade do `shell` — este componente apenas herda o contexto escuro, sem forçar nem observar o tema.

O **HERO** é a primeira dobra: um `<header>` com grid de 2 colunas onde a coluna esquerda concentra a mensagem de valor (badge, headline, subcopy, CTAs e linha de confiança) e a coluna direita recebe o slot do mock animado (entregue na sub-issue `hero-mock`). Esta sub-issue cobre **a coluna de conteúdo + o contêiner/fundo radial do hero**; o conteúdo do mock fica fora de escopo.

As fundações `tokens` (paleta/aliases em `globals.css` + mapeamento shadcn) e `typo-assets` (fontes via `next/font` — Hanken Grotesk, Newsreader, JetBrains Mono — e logo) precisam estar prontas, pois o hero depende dos tokens semânticos e das famílias tipográficas (`var(--font-sans)`, `var(--font-serif)`).

## Objetivo

Entregar o componente de marketing do hero (contêiner + fundo radial + coluna de conteúdo) fiel ao design `home-espresso-dark.html` (bloco `<!-- HERO -->`), com CTAs auth-aware (Clerk) e layout responsivo. A coluna direita deve expor um **slot** para o mock, mantendo o grid e o fundo definidos aqui como contêiner do hero, de modo que `hero-mock` possa ser desenvolvido em paralelo.

## Escopo

**Inclui:**
- Componente `apps/web/components/marketing/hero.tsx` com o `<header>` do hero: contêiner posicionado, camada de fundo radial, grid de 2 colunas e a coluna de conteúdo (esquerda).
- Fundo: **uma única camada absoluta** (`position:absolute; inset:0; pointer-events:none`) com dois `radial-gradient` sobrepostos na propriedade `background`.
- Badge pill com ícone lucide `coffee` e a copy `"Do Excel para a Web, num gole de café"`.
- Headline `h1` em Hanken Grotesk com `<br>` após "formulários." e `<em>` serif itálico (Newsreader) em destaque gold.
- Parágrafo de subcopy.
- Dois CTAs auth-aware (deslogado: "Começar gratuitamente" / "Entrar"; logado: colapsam para um único "Ir para Dashboard").
- Trust line com ícone `shield-check`.
- Slot/prop para a coluna direita receber o mock (`hero-mock`).
- Comportamento responsivo (empilhar colunas e reduzir o `h1` em telas `< md`).

**Não inclui:**
- O mock animado de preenchimento e o badge flutuante "142h" (sub-issue `hero-mock`), além dos keyframes (`popwash`, `popfill`, `popchk`, `popspin`, `popfloat`).
- Definição global de tokens e mapeamento shadcn (sub-issue `tokens`).
- Carregamento de fontes e assets de marca (sub-issue `typo-assets`).
- Navbar, demais seções e composição/lock de tema da página (`navbar`, `sections-dark`, `sections-light`, `faq-cta-footer`, `shell`).
- Metadata/SEO e a montagem em `app/page.tsx` (responsabilidade do `shell`).

## Referência de design

Fonte: `.planning/home-landing/design/home-espresso-dark.html` (linhas 64–77, bloco `<!-- HERO -->`, coluna esquerda) e `.planning/home-landing/design/tokens.css`.

**Contêiner / fundo (`<header>`):**
- `position: relative; overflow: hidden`.
- **Uma** camada de fundo absoluta (`position:absolute; inset:0; pointer-events:none`) com os dois gradientes em um único `background`:
  - gold: `radial-gradient(720px 460px at 76% 22%, rgba(240,178,33,0.16), transparent 60%)`
  - green: `radial-gradient(620px 420px at 12% 90%, rgba(91,168,79,0.10), transparent 60%)`
  - Os `rgba` são as cores de marca `--gold-500` (`#f0b221`) e `--green-500` (`#5ba84f`) com opacidade; replicar os valores do design (não há token de opacidade dedicado).
- Wrapper de conteúdo: `position:relative; max-width:1200px` (`var(--container-max)`); `margin:0 auto`; `padding:80px 56px 72px`; `display:grid`; `grid-template-columns:1.02fr 0.98fr`; `gap:52px`; `align-items:center`.

**Badge pill (coluna esquerda):**
- `display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:999px` (`var(--radius-full)`).
- `background: rgba(240,178,33,0.12)`; `border: 1px solid rgba(240,178,33,0.30)` (gold de marca com opacidade).
- Tipografia `font:600 12px 'Hanken Grotesk'`; cor do texto `var(--gold-400)`.
- Ícone lucide `coffee` (`15x15`).
- Copy literal: `"Do Excel para a Web, num gole de café"`.

**Headline `h1`:**
- `font: 800 60px/1.02 'Hanken Grotesk'`; `letter-spacing: -0.035em`; `color: var(--latte-50)`; `margin: 24px 0 0`.
- `<em>` em Newsreader serif itálico, `font-weight: 500`, `color: var(--gold-400)`.
- Texto exato (com `<br>` após "formulários."): `"Pare de digitar formulários."` + quebra + `"Tome um café"` (dentro do `<em>`) + `" enquanto o Populatte preenche."`.

**Parágrafo (subcopy):**
- `font: 400 19px/1.55 'Hanken Grotesk'`; `color: var(--latte-300)`; `margin: 24px 0 32px`; `max-width: 32em`.
- Texto exato: `"Importe sua planilha do Excel uma vez, vincule cada coluna a um campo com a extensão e preencha milhares de formulários no navegador. Você dirige, a extensão preenche."`

**CTAs (auth-aware):**
- Contêiner: `display:flex; gap:12px; align-items:center`.
- Primário "Começar gratuitamente": `href="/sign-up"`; `height:54px; padding:0 28px; border-radius:12px` (valor cru do design — fica entre `--radius-md` 10px e `--radius-lg` 14px; não mapeia em token exato); `background: var(--gold-500)`; texto `var(--espresso-950)`; `font: 700 16px 'Hanken Grotesk'`; `gap:9px`; `box-shadow: 0 12px 34px rgba(240,178,33,0.28)`; hover `background: var(--gold-600)`; ícone lucide `zap` (`19x19`).
- Secundário "Entrar": `href="/sign-in"`; `height:54px; padding:0 24px; border-radius:12px`; `background:transparent`; `border: 1px solid var(--border-inverse)`; texto `var(--latte-100)`; `font: 600 16px 'Hanken Grotesk'`; `gap:9px`; hover `background: rgba(247,227,189,0.08)` (`--latte-200` com opacidade); ícone lucide `log-in` (`18x18`).
- Quando logado (Clerk): ambos colapsam para um único "Ir para Dashboard" → `/dashboard` (mesmo comportamento da `page.tsx` atual).

**Trust line:**
- `display:flex; align-items:center; gap:8px; margin-top:18px; font: 500 13px 'Hanken Grotesk'`; `color: var(--mocha-400)`.
- Ícone lucide `shield-check` (`15x15`).
- Copy literal: `"Sem cartão de crédito · Conforme a LGPD · Configuração em 2 minutos"` (separador `·` U+00B7).

**Ícones lucide usados:** `coffee`, `zap`, `log-in`, `shield-check` — importados de `lucide-react` como `Coffee`, `Zap`, `LogIn`, `ShieldCheck`.

## Arquivos afetados / criados

- **Criar:** `apps/web/components/marketing/hero.tsx` — componente do hero (contêiner + fundo + coluna de conteúdo + slot do mock).
- **Não criar nada em** `apps/web/components/ui/` (reservado a primitivos shadcn).
- A integração na página é responsabilidade do `shell` (`apps/web/app/page.tsx`), fora do escopo aqui; o `hero.tsx` deve expor uma API (prop/slot) que o shell consome.
- Estado atual confirmado: a `page.tsx` atual importa `SignInButton`, `SignUpButton`, `SignedIn`, `SignedOut` de `@clerk/nextjs` (modo `redirect`) e usa `<Link href="/dashboard">` com o rótulo "Ir para Dashboard" quando logado — reaproveitar esse padrão.

## Passos de implementação

1. Criar `apps/web/components/marketing/hero.tsx` exportando um componente `Hero` (Server Component por padrão; isolar apenas a parte interativa do Clerk em client boundary, se necessário).
2. Renderizar o `<header>` com `position:relative; overflow:hidden` e **uma** camada de fundo absoluta (`pointer-events:none`) com os dois `radial-gradient` no mesmo `background`, usando os valores `rgba` do design.
3. Montar o wrapper de conteúdo com `position:relative` (acima da camada de fundo no stacking), `max-width: var(--container-max)`, `padding: 80px 56px 72px`, `display:grid`, `grid-template-columns:1.02fr 0.98fr`, `gap:52px`, `align-items:center`.
4. Construir a coluna esquerda: badge pill (ícone `Coffee` + copy), `h1` com `<br>` e `<em>` serif itálico gold, parágrafo de subcopy, contêiner de CTAs e trust line — respeitando margens/tamanhos do design e citando cores via tokens (`var(--gold-400)`, `var(--latte-50)`, `var(--latte-300)`, `var(--mocha-400)`).
5. Implementar os CTAs auth-aware com os primitivos do Clerk já usados na `page.tsx` (`SignedOut` → "Começar gratuitamente" `/sign-up` + "Entrar" `/sign-in`; `SignedIn` → único "Ir para Dashboard" para `/dashboard`). Não duplicar a lógica de auth: se o `shell`/`navbar` centralizar os CTAs, receber por prop; caso contrário, manter inline reusando o mesmo padrão.
6. Aplicar o `box-shadow` do CTA primário (`0 12px 34px rgba(240,178,33,0.28)`) e os estados hover (primário `--gold-600`; secundário `rgba(247,227,189,0.08)`).
7. Expor a coluna direita como **slot** (prop `mockSlot?: React.ReactNode`, ou `children`) para receber o componente de `hero-mock`; manter o grid intacto mesmo com o slot vazio (renderizar a célula direita mesmo sem conteúdo).
8. Adicionar responsividade: abaixo de `md`, mudar para `grid-template-columns:1fr` (empilhar, conteúdo acima do mock), reduzir o `h1` (ex.: ~36–40px) preservando `letter-spacing:-0.035em`, e reduzir o padding lateral (`56px` → ex.: `24px`) para evitar overflow.
9. Garantir foco visível e contraste nos CTAs: o fundo decorativo não pode capturar cliques/foco (conteúdo em `position:relative` acima da camada `pointer-events:none`); manter `:focus-visible` herdado do `--ring`/shadcn ou explícito.
10. Não impor tema próprio: o hero herda o Espresso Dark do shell (decisão: Home desacoplada do toggle); usar Tailwind v4 (utilitárias + `var(--token)`); nunca hex cru no código.

## Critérios de aceite

- [ ] Existe `apps/web/components/marketing/hero.tsx`; nenhum arquivo novo foi criado em `components/ui/`.
- [ ] O fundo do hero é **uma** camada absoluta com os dois `radial-gradient` (gold em `76% 22%`, green em `12% 90%`) no mesmo `background`, com `pointer-events:none` (não captura cliques nem foco).
- [ ] Grid de 2 colunas `1.02fr 0.98fr`, `gap:52px`, padding `80px 56px 72px`, `max-width:1200px` (`var(--container-max)`) centralizado, `align-items:center`.
- [ ] Badge pill renderiza o ícone `coffee` e a copy exata `"Do Excel para a Web, num gole de café"`, fundo `rgba(240,178,33,0.12)`, borda `rgba(240,178,33,0.30)`, texto `var(--gold-400)`, `border-radius` full.
- [ ] `h1` 800/60px, `letter-spacing -0.035em`, cor `var(--latte-50)`, com `<br>` após "formulários."; o trecho `"Tome um café"` está em Newsreader itálico peso `500` cor `var(--gold-400)`; o texto completo é `"Pare de digitar formulários. Tome um café enquanto o Populatte preenche."`.
- [ ] Parágrafo 19px/1.55, cor `var(--latte-300)`, `max-width:32em`, com o texto literal do design.
- [ ] CTA primário "Começar gratuitamente" (`/sign-up`) usa `var(--gold-500)`, texto `var(--espresso-950)`, ícone `zap`, `box-shadow: 0 12px 34px rgba(240,178,33,0.28)`; hover vira `var(--gold-600)`.
- [ ] CTA secundário "Entrar" (`/sign-in`) é outline com `border: 1px solid var(--border-inverse)`, texto `var(--latte-100)`, ícone `log-in`; hover `rgba(247,227,189,0.08)`.
- [ ] CTAs são auth-aware (Clerk): deslogado mostra os dois botões (`/sign-up`, `/sign-in`); logado mostra um único "Ir para Dashboard" para `/dashboard`.
- [ ] Trust line com ícone `shield-check` e copy exata `"Sem cartão de crédito · Conforme a LGPD · Configuração em 2 minutos"` na cor `var(--mocha-400)`.
- [ ] A coluna direita expõe um slot funcional que aceita o conteúdo do `hero-mock` sem quebrar o grid, e renderiza corretamente quando o slot está vazio.
- [ ] Em telas `< md`, as colunas empilham (`grid-template-columns:1fr`), o `h1` é reduzido (preservando `letter-spacing:-0.035em`) e o padding lateral encolhe, sem overflow horizontal nem texto cortado.
- [ ] Foco visível (`:focus-visible`) nos dois CTAs; a camada de fundo decorativa não interfere em foco/clique.
- [ ] Nenhum valor de cor em hex cru no código do componente — cores vêm de tokens (`var(--...)`) ou dos `rgba` de marca definidos no design (gold/green/latte).
- [ ] A Home permanece Espresso Dark independentemente do toggle de tema — o hero não força nem observa o tema (next-themes).
- [ ] Sem novas dependências além de shadcn, `lucide-react`, `next/font` e Clerk.

## Dependências

- `tokens` — tokens/paleta Populatte globais em `globals.css` (cores semânticas e de marca usadas aqui).
- `typo-assets` — fontes via `next/font` (Hanken Grotesk em `var(--font-sans)`, Newsreader em `var(--font-serif)`).
- Integração final feita pelo `shell` (monta `app/page.tsx`, aplica o lock Espresso Dark e passa/consome o slot e os CTAs); o `hero-mock` consome o slot exposto por esta sub-issue.

## Riscos & observações

- **Fronteira dos CTAs auth-aware:** alinhar com `shell`/`navbar` para não duplicar a lógica do Clerk. Confirmado na `page.tsx` atual: primitivos de `@clerk/nextjs` em modo `redirect`, rótulo logado "Ir para Dashboard" → `/dashboard`. Decidir se o hero recebe os CTAs por prop (centralizados no `shell`) ou os compõe inline; documentar a escolha para evitar retrabalho.
- **Server vs Client Component:** `SignedIn`/`SignedOut` impõem um client boundary; manter o restante do hero como Server Component e isolar apenas a parte interativa.
- **Headline responsiva:** o design só especifica 60px no desktop; o valor mobile é decisão de implementação — escolher uma escala legível (ex.: ~36–40px) preservando `letter-spacing:-0.035em` e alinhar com `a11y-qa`.
- **Cores em `rgba` literais:** badge, `box-shadow` e fundo usam `rgba` de marca (gold `--gold-500`, green `--green-500`) e o hover do secundário usa `rgba(247,227,189,...)` = `--latte-200`, com opacidades sem token semântico dedicado; replicar os valores do design.
- **`border-radius:12px` dos CTAs:** valor cru do design entre `--radius-md` (10px) e `--radius-lg` (14px); manter 12px e registrar que não corresponde a um token exato.
- **Slot do mock:** garantir que o hero renderize bem antes de `hero-mock` existir (célula direita vazia/placeholder), para permitir desenvolvimento em paralelo.
- **Stacking/foco:** conteúdo em `position:relative` deve ficar acima da camada de fundo absoluta; o fundo é puramente decorativo (`pointer-events:none`) e não pode interferir na ordem de foco dos CTAs.