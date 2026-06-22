## Contexto

Este é o primeiro de dois tickets de **fundação** (junto com `typo-assets`) do épico "Home pública (Landing) — Espresso Dark". Toda a Home e o re-skin do dashboard dependem dele.

O design (`./design/home-espresso-dark.html` + `./design/tokens.css`) é construído sobre o **Populatte Design System**: ramps cruas (espresso/latte/gold/green/terra/mocha) + âncoras de marca + aliases semânticos (`--surface-*`, `--text-*`, `--border-*`, `--primary*`, `--accent*`, status, `--chart-*`), escalas de raio/espaço/tipografia, sombras quentes espresso-tinted, focus ring gold e tokens de motion. Hoje o `apps/web/app/globals.css` usa a paleta OKLCH genérica padrão do shadcn (base "slate"), que não tem nenhuma dessas variáveis.

Pela **decisão 3** (travada em 2026-06-21), os tokens Populatte são **adotados globalmente já** — não ficam isolados na Home. Eles substituem a paleta OKLCH e remapeiam as variáveis semânticas do shadcn (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--ring`, `--sidebar-*`, `--chart-*`) tanto em `:root` (claro) quanto em `.dark` (escuro). Como o dashboard atual (telas de dashboard, projects, mappings) consome essas variáveis via shadcn/ui, este ticket **re-skinna o dashboard** — por isso exige smoke test visual.

> Observação sobre a Home: a Home será **sempre Espresso Dark e desacoplada do toggle** `next-themes` (decisão 2). Mas isso é responsabilidade do ticket `shell` (lock do tema na rota). Aqui apenas garantimos que os tokens existam e que o tema escuro (`.dark`) do dashboard fique coerente.

> Observação sobre fontes: a Home usa `'Hanken Grotesk'` (UI/body), `'Newsreader'` (serif editorial) e `'JetBrains Mono'` (dados). Carregar essas famílias via `next/font` e remapear `--font-sans/serif/mono` é responsabilidade do ticket `typo-assets`. **Este ticket NÃO mexe em fontes** — o `@theme inline` atual referencia `--font-geist-sans`/`--font-geist-mono` e deve permanecer assim até `typo-assets`.

## Objetivo

Introduzir **todos** os tokens não-tipográficos do Populatte Design System em `apps/web/app/globals.css` e remapear as variáveis semânticas do shadcn para esses tokens em `:root` e `.dark`, de forma que: (a) a paleta Populatte fique disponível globalmente como CSS custom properties para todos os tickets seguintes; (b) o dashboard existente passe a renderizar com a identidade Populatte sem regressões de contraste/legibilidade.

## Escopo

**Inclui:**
- Adicionar as **ramps cruas** em `:root`: `--espresso-50..950`, `--latte-50..300`, `--gold-200..700`, `--green-100..700`, `--terra-100..700`, `--mocha-0..900`, além das âncoras de marca (`--brand-espresso`, `--brand-cream`, `--brand-gold`, `--brand-green`). Valores hex exatos conforme `./design/tokens.css` (não cores OKLCH equivalentes — copiar os hex).
- Adicionar os **aliases semânticos do design system**: superfícies (`--surface-page`, `--surface-card`, `--surface-raised`, `--surface-sunken`, `--surface-muted`, `--surface-inverse`, `--surface-accent`), texto (`--text-strong`, `--text-body`, `--text-muted`, `--text-subtle`, `--text-on-dark`, `--text-on-brand`, `--text-link`), bordas (`--border-subtle`, `--border-default`, `--border-strong`, `--border-inverse`), primário (`--primary`/`--primary-hover`/`--primary-active`/`--primary-foreground`/`--primary-soft`/`--primary-soft-text`), accent gold (`--accent`/`--accent-hover`/`--accent-foreground`/`--accent-soft`/`--accent-soft-text`), status (`--success*`, `--warning*`, `--danger*`, `--info*`, `--neutral-status`, `--neutral-soft`) e data-viz (`--chart-1..5`). Valores exatos (incluindo as definições `var(...)`) conforme `./design/tokens.css`.

  > Atenção a colisões de nomes: o design system define `--primary`, `--accent`, `--ring`, `--chart-1..5` com os mesmos nomes que o shadcn já usa em `:root`/`.dark`, e define `--radius-sm/md/lg/xl` com os mesmos nomes que o `@theme inline` atual deriva de `--radius`. Resolver no passo de implementação (ver Passos 2, 3 e 6) — não declarar dois conjuntos divergentes do mesmo nome no mesmo escopo.
- Adicionar a **escala de raios** do design: `--radius-xs:6px`, `--radius-sm:8px`, `--radius-md:10px`, `--radius-lg:14px`, `--radius-xl:18px`, `--radius-2xl:24px`, `--radius-full:9999px`. **Atenção:** isso colide com os `--radius-sm/md/lg/xl` derivados de `--radius:0.65rem` no `@theme inline` atual. Decidir conscientemente: adotar os valores fixos do design e remover/ajustar a derivação por `--radius` no `@theme inline`, garantindo que os componentes shadcn (que usam `rounded-md`/`rounded-lg` etc.) continuem coerentes. Manter `--radius-full:9999px` (usado nas pills da nav e badges).
- Adicionar **sombras quentes** espresso-tinted (`--shadow-xs` … `--shadow-xl`, base `rgba(45,15,6,...)`), **focus ring gold** (`--ring-width:3px`, `--ring-color: color-mix(in oklab, var(--gold-500) 55%, transparent)`) e **motion** (`--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-in-out`, `--duration-fast/base/slow`).
- Adicionar a **escala de espaçamento** (`--space-1..24`), os tokens de **container/layout** (`--container-max:1200px`) e a **escala numérica de tipografia** que NÃO depende de fontes (`--text-xs..5xl`, `--weight-*`, `--leading-*`, `--tracking-*`) conforme `./design/tokens.css`. Não adicionar `--font-sans/serif/mono` aqui (família de fonte é do ticket `typo-assets`) — apenas a escala/pesos/tracking.
- **Remapear as variáveis semânticas do shadcn** em `:root` (claro) e `.dark` (escuro) para tokens Populatte: `--background`, `--foreground`, `--card` (+`-foreground`), `--popover` (+`-foreground`), `--primary` (+`-foreground`), `--secondary` (+`-foreground`), `--muted` (+`-foreground`), `--accent` (+`-foreground`), `--destructive`, `--border`, `--input`, `--ring`, `--sidebar-*` e `--chart-1..5`. Mapeamento coerente: claro usa superfícies latte/mocha e texto espresso; `.dark` usa espresso profundo (`--espresso-950`/`--espresso-900`) com texto latte (`--latte-50`/`--latte-200`), garantindo contraste para o dashboard escuro.
- Manter e atualizar o bloco `@theme inline` do Tailwind v4 (que já existe e mapeia `--color-*` → variáveis shadcn). Decidir se ramps cruas adicionais serão expostas como utilitários via `@theme` ou consumidas apenas como `var(...)`.
- **Smoke test visual** das telas existentes (dashboard, projects, mappings) em claro e escuro, com ajustes de contraste onde necessário.
- **Decisão documentada sobre os `@keyframes` globais** (`popfill`, `popwash`, `popchk`, `popspin`, `popfloat`): este ticket **não** os declara em `globals.css`. Eles pertencem ao ticket `hero-mock` (co-localizados com o componente do mock), pois são específicos da animação do hero e não fazem parte da fundação de tokens. Registrar essa decisão no ticket `hero-mock`.

**Não inclui:**
- Não configura fontes (`next/font`) nem declara `--font-sans/serif/mono` com as famílias Hanken/Newsreader/JetBrains (ticket `typo-assets`).
- Não cria nenhum componente de página nem de marketing (`components/marketing/`).
- Não altera `app/page.tsx`, `app/layout.tsx`, navbar ou seções (ficam em `shell` e nos tickets de seção).
- Não traz assets de logo (`logo-mark.png`/`logo-full.svg`) para `public/` (ticket `typo-assets`).
- Não declara os `@keyframes` da animação do hero (ticket `hero-mock`).
- Não faz o lock de tema Espresso Dark na rota da Home (ticket `shell`).
- Não adiciona o componente `accordion` do shadcn (ticket `faq-cta-footer`).

## Referência de design

- **Fonte:** `./design/tokens.css` (source of truth para todos os valores) e `./design/home-espresso-dark.html` (uso real dos tokens).
- **Ramps de marca:** espresso ancorado em `--espresso-900: #2d0f06` (brand espresso); fundo global da Home `--espresso-950: #1c0a03` (texto base `--latte-200`, conforme `body` do HTML); creme `--latte-200: #f7e3bd` (brand cream/foam); gold `--gold-500: #f0b221` (brand gold); verde `--green-500: #5ba84f` (brand green / sucesso).
- **Neutros quentes:** a ramp `--mocha-*` é o cinza marrom-tintado (`--mocha-0:#ffffff` até `--mocha-900:#211a13`) — **nunca usar cinza frio puro**.
- **Superfícies do design:** card claro do hero usa `--surface-card` (= `--mocha-0`/branco) com borda `--border-subtle`; faixa clara usa `background:var(--latte-50)` e `color:var(--text-body)`; seções escuras (cards "Como funciona", itens do FAQ) usam `var(--espresso-900)` com borda `--border-inverse`.
- **`--border-inverse`:** `color-mix(in oklab, var(--latte-50) 16%, transparent)` — borda em fundo escuro (nav, faixa de segmentos, cards escuros, footer).
- **Status (ciclo de preenchimento Populatte):** `--success` verde = "Concluído" (ex.: `--success-soft` no quadrado do ícone das linhas preenchidas do mock); `--warning` gold = "Preenchendo / em progresso"; `--danger` terracotta = "Erro"; `--neutral-status` = "Pendente".
- **Sombras:** quentes, base `rgba(45,15,6,...)` — ex.: `--shadow-lg` (badge flutuante "142h economizadas este mês"), `--shadow-xs`/`--shadow-sm` (cards da faixa clara).
- **Ring:** focus em gold via `--ring-color` (55% de `--gold-500`) e `--ring-width: 3px`; no design o "wash" do mock usa `box-shadow:0 0 0 3px var(--ring-color)`.
- **Motion:** `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` (curva usada nas animações `popwash`/`popfill`/`popchk` do mock); durações `--duration-fast:120ms`/`--duration-base:180ms`/`--duration-slow:260ms`.
- **Data-viz:** sequência café-forward `--chart-1: var(--espresso-900)`, `--chart-2: var(--gold-500)`, `--chart-3: var(--green-500)`, `--chart-4: var(--espresso-400)`, `--chart-5: var(--latte-300)`.
- **Layout:** conteúdo `max-width:1200px` (= `--container-max`), padding lateral `56px`; a nav de marketing tem `height:74px` (o token `--header-height:60px` do design é só para app, não para a Home — não confundir).
- **Raios na prática:** pills da nav/badges usam `999px`/`--radius-full`; botões/inputs `--radius-md`(10px); cards `--radius-lg`(14px)/16px/`--radius-xl`(18px); blocos hero/CTA `--radius-2xl`(24px).

## Arquivos afetados / criados

- **Editado:** `apps/web/app/globals.css` — adição das ramps cruas + aliases semânticos + escalas (raio/espaço/tipografia numérica) + sombras/ring/motion; remapeamento de `:root` e `.dark` para tokens Populatte; reconciliação do bloco `@theme inline` (em especial os `--radius-*`). Preservar `@import "tailwindcss"`, `@import "tw-animate-css"`, `@custom-variant dark` e o `@layer base` existentes.
- **Referência (não editar):** `apps/web/app/colors/page.tsx` (rota dev de preview de cores) pode ser usada para validar visualmente as ramps e aliases.
- **Smoke test (não editar):** telas do dashboard, `projects` e `mappings` sob `apps/web/app/...`.

## Passos de implementação

1. Copiar as **ramps cruas** e as **âncoras de marca** de `./design/tokens.css` para o `:root` de `apps/web/app/globals.css`, preservando os valores hex exatos.
2. Adicionar os **aliases semânticos do design system** (surface/text/border/status/data-viz) e as escalas (raio/espaço/tipografia numérica/sombras/ring/motion) no `:root`. Para os nomes que colidem com o shadcn (`--primary`, `--accent`, `--ring`, `--chart-*`): adotar **uma única fonte de verdade por escopo** — recomendação: definir as ramps + um conjunto canônico de aliases, e fazer as linhas do shadcn apontarem para tokens Populatte (`--primary: var(--espresso-900)` etc.), evitando duas declarações divergentes do mesmo nome.
3. **Remapear `:root` (tema claro)** das variáveis do shadcn para tokens Populatte: `--background → var(--surface-page)`, `--foreground → var(--text-strong)` (e textos secundários via `--text-body`/`--text-muted`), `--card → var(--surface-card)` (+`-foreground` espresso), `--popover` análogo a card, `--primary → var(--espresso-900)` + `--primary-foreground → var(--latte-50)`, `--secondary`/`--muted`/`--accent` para superfícies mocha/latte com foregrounds legíveis, `--destructive → var(--terra-500)`, `--border → var(--mocha-200)` (ou `--mocha-300`), `--input` análogo, `--ring → var(--gold-500)`, `--sidebar-*` coerentes com superfícies/borda, `--chart-1..5` conforme a sequência data-viz. Substituir todos os valores OKLCH atuais.
4. **Remapear `.dark` (tema escuro do dashboard)** para a paleta espresso: `--background → var(--espresso-950)`, `--foreground → var(--latte-50)`, `--card → var(--espresso-900)` (+ foreground latte), `--popover` análogo, `--primary`/`--accent`/`--ring` em gold/espresso, `--border`/`--input → var(--border-inverse)` ou equivalente, `--sidebar-*` e `--chart-*` ajustados para fundo escuro. Garantir contraste AA (texto normal ≥ 4.5:1) do texto sobre superfícies escuras.
5. **Remapear `--destructive-foreground`/foregrounds de status** se algum componente shadcn instalado os consumir; verificar via grep nos componentes de `apps/web/components/ui/` quais variáveis são realmente referenciadas, para não deixar nenhuma sem mapeamento.
6. **Reconciliar os `--radius-*` no `@theme inline`:** hoje ele deriva `--radius-sm/md/lg/xl` de `--radius: 0.65rem`. Adotar a escala fixa do design (`--radius-sm:8px` … `--radius-2xl:24px`, `--radius-full:9999px`) como fonte de verdade e ajustar/remover a derivação por `--radius`, garantindo que os utilitários `rounded-*` dos componentes shadcn produzam os raios da identidade Populatte. Não introduzir `--font-*` aqui (fontes são do ticket `typo-assets`).
7. Atualizar o restante do bloco `@theme inline`: manter os mapeamentos `--color-*` (que já referenciam as variáveis semânticas do shadcn, agora apontando para Populatte) e decidir se ramps cruas extras precisam virar utilitários Tailwind ou se serão consumidas só via `var(...)`.
8. Rodar `npm run dev --filter=@populatte/web` e fazer **smoke test visual** do dashboard, `projects` e `mappings` em modo claro e escuro (toggle). Verificar headers, sidebar, cards, tabelas, botões, inputs, badges, focus ring e raios. Ajustar mapeamentos onde o contraste cair ou cores ficarem incoerentes com a identidade café.
9. Conferir `npm run lint --filter=@populatte/web` e `npm run type-check` (mudança é CSS, mas garantir que o pipeline não quebrou). Registrar no ticket `hero-mock` a decisão de que os `@keyframes` ficam lá, não em `globals.css`.

## Critérios de aceite

- [ ] Todas as ramps cruas do design (`--espresso-50..950`, `--latte-50..300`, `--gold-200..700`, `--green-100..700`, `--terra-100..700`, `--mocha-0..900`) e as âncoras de marca (`--brand-espresso/cream/gold/green`) estão definidas em `apps/web/app/globals.css` com os valores hex exatos de `./design/tokens.css`.
- [ ] Todos os aliases semânticos (surface/text/border/primary/accent/status/chart) estão definidos conforme `./design/tokens.css`, incluindo `--border-inverse` com `color-mix(in oklab, var(--latte-50) 16%, transparent)`.
- [ ] As escalas estão definidas: raios (`--radius-xs..2xl` + `--radius-full`), espaço (`--space-1..24`), tipografia numérica (`--text-xs..5xl`, `--weight-*`, `--leading-*`, `--tracking-*`), `--container-max:1200px`, sombras (`--shadow-xs..xl`), ring (`--ring-color`, `--ring-width:3px`) e motion (`--ease-out`/`--ease-in-out`, `--duration-fast/base/slow`).
- [ ] **Nenhuma** família de fonte (`--font-sans/serif/mono` com Hanken/Newsreader/JetBrains) foi introduzida neste ticket; o `@theme inline` continua referenciando `--font-geist-sans`/`--font-geist-mono`.
- [ ] As variáveis do shadcn em `:root` (claro) estão remapeadas para tokens Populatte (`--background`, `--foreground`, `--card`+fg, `--popover`+fg, `--primary`+fg, `--secondary`+fg, `--muted`+fg, `--accent`+fg, `--destructive`, `--border`, `--input`, `--ring`, `--sidebar-*`, `--chart-1..5`) — sem sobrar nenhum valor OKLCH genérico.
- [ ] As mesmas variáveis em `.dark` estão remapeadas para a paleta espresso (fundo `--espresso-950`, texto `--latte-50`, card `--espresso-900`, etc.), com o tema escuro do dashboard coerente.
- [ ] As colisões de nome (`--primary`, `--accent`, `--ring`, `--chart-*` e os `--radius-sm/md/lg/xl`) foram resolvidas de forma consciente, sem declarações divergentes do mesmo token no mesmo escopo; os utilitários do shadcn (`bg-primary`, `rounded-md`, etc.) resolvem para cores/raios Populatte.
- [ ] O bloco `@theme inline` continua válido, expõe as cores semânticas e o build do Tailwind v4 compila sem erro.
- [ ] `color-mix(in oklab, ...)` (usado em `--border-inverse` e `--ring-color`) renderiza como esperado no smoke test.
- [ ] Smoke test visual concluído: dashboard, `projects` e `mappings` renderizam com a identidade Populatte em claro e escuro, sem texto ilegível, sem contraste quebrado (texto normal ≥ 4.5:1) e sem cinza frio puro.
- [ ] Focus ring visível e em gold (`--ring`/`--ring-color`) ao navegar por teclado nos componentes interativos do dashboard.
- [ ] `npm run lint --filter=@populatte/web` e `npm run type-check` passam.
- [ ] A decisão sobre os `@keyframes` (`popfill`, `popwash`, `popchk`, `popspin`, `popfloat` ficam no ticket `hero-mock`, não em `globals.css`) está documentada neste corpo e refletida no ticket `hero-mock`.
- [ ] Nenhum componente de página/marketing foi criado neste ticket; `app/page.tsx`, `app/layout.tsx` e `public/` não foram alterados.

## Dependências

- Nenhuma. Este é um ticket de fundação (junto com `typo-assets`) e **bloqueia** todos os demais tickets do épico (`shell`, `navbar`, `hero-content`, `hero-mock`, `sections-dark`, `sections-light`, `faq-cta-footer`, `a11y-qa`).

## Riscos & observações

- **Re-skin do dashboard:** mexer em `:root`/`.dark` afeta todas as telas existentes que consomem variáveis shadcn. Risco principal é regressão de contraste/legibilidade — mitigado pelo smoke test obrigatório (Passo 8). Se alguma tela precisar de ajuste fino além do mapeamento de tokens, abrir follow-up em vez de inflar este ticket.
- **Colisão `--radius-*`:** o `@theme inline` atual deriva `--radius-sm/md/lg/xl` de `--radius: 0.65rem`, e o design system usa os mesmos nomes com valores px fixos. Definir uma única fonte de verdade é obrigatório, senão `rounded-md`/`rounded-lg` dos componentes shadcn ficarão dependentes de ordem de declaração.
- **Colisão de nomes de cor shadcn × design system:** `--primary`, `--accent`, `--ring` e `--chart-1..5` existem nos dois mundos — mesma exigência de fonte de verdade única por escopo.
- **`color-mix(in oklab, ...)`:** já suportado pelos navegadores-alvo modernos e pelo Tailwind v4; ainda assim verificar no smoke test que `--border-inverse` e `--ring-color` renderizam corretamente (são muito usados no design).
- **Fontes fora de escopo:** o `@theme inline` atual referencia `--font-geist-*`; não trocar por Hanken/Newsreader/JetBrains aqui — isso é do ticket `typo-assets`. Evitar acoplar os dois tickets. Adicionar apenas a escala numérica de tipografia (tamanhos/pesos/leading/tracking), que não depende de família de fonte.
- **`tw-animate-css`:** o `globals.css` já importa `tw-animate-css`; não removê-lo — alguns componentes shadcn dependem dele.
- **Tema da Home:** este ticket não força Espresso Dark na rota da Home; apenas garante tokens + `.dark` coerente. O lock de tema é do `shell` (decisão 2).