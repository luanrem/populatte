## Contexto

A Home pública (épico "Home pública (Landing) — Espresso Dark") usa três famílias tipográficas que ainda **não** existem no `apps/web`: **Hanken Grotesk** (UI/corpo), **Newsreader** (serif editorial dos destaques em itálico dourado) e **JetBrains Mono** (dados/valores monoespaçados do hero mock). Hoje o `apps/web/app/layout.tsx` carrega apenas **Geist Sans/Mono** via `next/font/google`, expostos como `--font-geist-sans` / `--font-geist-mono` e ligados ao Tailwind v4 em `app/globals.css` (`@theme inline`: `--font-sans: var(--font-geist-sans)`, `--font-mono: var(--font-geist-mono)`). O `app/globals.css` não tem `--font-serif`.

Os tokens do design (`./design/tokens.css`, bloco TYPOGRAPHY) definem os stacks-alvo:
- `--font-sans: 'Hanken Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;`
- `--font-serif: 'Newsreader', ui-serif, Georgia, 'Times New Roman', serif;`
- `--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;`

E o comentário "Webfonts" do `tokens.css` orienta explicitamente: _"In Next.js use next/font/google instead of @import"_, com os pesos: Hanken Grotesk `400,500,600,700,800` + itálico `400,500`; Newsreader roman+itálico `400,500,600` (`opsz 16..72`); JetBrains Mono `400,500,600`.

Além da tipografia, o design referencia o **mark de marca** (`assets/logo-mark.png`) em três pontos do `home-espresso-dark.html` — nav, header do hero mock e footer — sempre dentro de um quadrado tintado `var(--latte-100)`, acompanhado do wordmark textual "Populatte" em Hanken Grotesk. O `apps/web/public/` atual só contém os SVGs default do Next (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`); **não há logo Populatte**, e não há `favicon.ico`/`app/icon.*`/`app/opengraph-image.*`.

Esta sub-issue é **fundação**: entrega tipografia e assets de marca para que todas as seções (`navbar`, `hero-content`, `hero-mock`, `sections-dark`, `sections-light`, `faq-cta-footer`) sejam construídas com fidelidade. **Não estiliza nenhuma seção.**

## Objetivo

Carregar as 3 famílias do design via `next/font/google` no `apps/web/app/layout.tsx`, expor cada uma como uma CSS var de fonte com nome próprio, ligá-las ao `@theme` do Tailwind v4 como `--font-sans` / `--font-serif` / `--font-mono` (com `fallback` equivalente aos stacks de `tokens.css`), remover o Geist, trazer o asset de marca para `apps/web/public/` e fornecer um componente `Logo` reutilizável em `components/marketing/`.

## Escopo

**Inclui:**
- Carregar via `next/font/google` em `app/layout.tsx`:
  - **Hanken Grotesk** — pesos `400, 500, 600, 700, 800` + itálico `400, 500`.
  - **Newsreader** — roman + itálico `400, 500, 600`, eixo óptico (`opsz`).
  - **JetBrains Mono** — pesos `400, 500, 600`.
- Configurar cada `next/font` com `display: "swap"`, `subsets: ["latin", "latin-ext"]` (latin-ext para a acentuação PT-BR — ex. "ç", "ã", "õ"), `fallback` com o stack correspondente de `tokens.css`, e uma `variable` com **nome próprio** (ex. `--font-hanken`, `--font-newsreader`, `--font-jetbrains-mono`) — **não** reusar `--font-sans`/`--font-serif`/`--font-mono` como nome da var do `next/font`, pois esses nomes são os tokens públicos do Tailwind e haveria auto-referência no `@theme`.
- Wire no `@theme inline` de `app/globals.css`: `--font-sans: var(--font-hanken)`, `--font-serif: var(--font-newsreader)`, `--font-mono: var(--font-jetbrains-mono)` (Tailwind v4 passa a expor `font-sans` / `font-serif` / `font-mono`).
- **Remover o Geist:** apagar os imports `Geist`/`Geist_Mono` e as instâncias `geistSans`/`geistMono`; remover `--font-geist-sans`/`--font-geist-mono` do `@theme`; atualizar o `className` do `<body>`.
- Trazer o asset de marca para `apps/web/public/brand/logo-mark.png` (obrigatório) e, se disponível, `apps/web/public/brand/logo-full.svg`.
- Criar componente `Logo` reutilizável em `apps/web/components/marketing/logo.tsx` (mark via `next/image` dentro do quadrado tintado `var(--latte-100)` + wordmark "Populatte" em Hanken Grotesk peso 800), com props para tamanho e para exibir/ocultar o wordmark.
- Definir `favicon`/`icon` e `metadata.icons`/`openGraph` **se trivial** (a partir do mark), sem bloquear a entrega.

**Não inclui:**
- Estilização de qualquer seção da Home (nav, hero, cards, FAQ, footer) — pertence às sub-issues de seção (`navbar`, `hero-content`, `hero-mock`, `sections-dark`, `sections-light`, `faq-cta-footer`).
- Adoção da paleta/tokens de cor e o mapeamento das vars semânticas do shadcn — pertence à sub-issue `tokens`. Aqui só se tocam as vars de **fonte** do `@theme`.
- Substituição de `app/page.tsx`, criação do layout de marketing, lock do Espresso Dark, metadata/SEO completa e CTAs auth-aware (Clerk) — pertencem à sub-issue `shell`.
- Animações do hero mock (`popfill`/`popwash`/`popchk`/`popspin`/`popfloat`) — pertencem a `hero-mock`.
- Imagem OG completa/elaborada e menu mobile da nav — fora desta fundação.

## Referência de design

Fonte: `./design/tokens.css` (stacks, pesos e raios) + `./design/home-espresso-dark.html` (uso real do mark e do wordmark).

- **Famílias e pesos** (de `tokens.css`, comentário "Webfonts"):
  - Hanken Grotesk: `400,500,600,700,800` + itálico `400,500`.
  - Newsreader: roman + itálico `400,500,600` (`opsz 16..72`).
  - JetBrains Mono: `400,500,600`.
- **Stacks/fallback alvo** (de `tokens.css`): conforme citados no Contexto.
- **Onde cada família aparece no design** (para validar o carregamento):
  - `--font-sans` (Hanken Grotesk): `body`, nav, wordmark (`font:800 19px/1 'Hanken Grotesk';letter-spacing:-0.02em;color:var(--latte-50)`), CTAs, labels, eyebrows, h1/h2/h3.
  - `--font-serif` (Newsreader): destaques em itálico dourado — hero `<em style="font-family:'Newsreader',serif;font-style:italic;font-weight:500;color:var(--gold-400)">Tome um café</em>`, os 4 segmentos da faixa de prova social (`font-style:italic;font-size:20px;color:var(--latte-300)`), o `<em>` "horas" do CTA band e o watermark "☕" (`font-size:200px;color:rgba(247,227,189,0.06)`).
  - `--font-mono` (JetBrains Mono): valores do hero mock (`font:500 12px 'JetBrains Mono'`, ex. "12.345.678/0001-90"), o número "142h" do badge flutuante (`font:800 22px/1 'JetBrains Mono'`) e os números "01/02/03" de "Como funciona" (`font:800 12px 'JetBrains Mono';color:var(--gold-400)`).
- **Mark de marca** (3 usos no HTML): `<img src="assets/logo-mark.png" alt="Populatte">` dentro de um `<span>` quadrado de fundo `var(--latte-100)`, `border-radius:10px` (= `var(--radius-md)`), com o wordmark textual "Populatte" ao lado. **Dimensões exatas (quadrado / altura da imagem / peso+tamanho do wordmark):**
  - Nav: quadrado **36px**, imagem `height:25px`, `box-shadow:0 1px 3px rgba(0,0,0,0.35)`, wordmark `800 19px/1`, `color:var(--latte-50)`, `letter-spacing:-0.02em`.
  - Hero mock (header): quadrado **28px** (radius 8 = `var(--radius-sm)`), imagem `height:20px`, wordmark **`700 14px`** (peso 700, não 800).
  - Footer: quadrado **30px** (radius 9), imagem `height:21px`, wordmark `800 17px`.
- Pesos de tokens para referência: `--weight-regular 400`, `--weight-medium 500`, `--weight-semibold 600`, `--weight-bold 700`, `--weight-extra 800`. Raios: `--radius-sm 8px`, `--radius-md 10px`.

## Arquivos afetados / criados

- `apps/web/app/layout.tsx` — **editar:** trocar imports/instâncias de `next/font/google` (Geist → Hanken Grotesk + Newsreader + JetBrains Mono), ajustar `className` do `<body>`, ajustar `metadata` (favicon/og se trivial).
- `apps/web/app/globals.css` — **editar:** no `@theme inline`, definir `--font-sans: var(--font-hanken)`, `--font-serif: var(--font-newsreader)`, `--font-mono: var(--font-jetbrains-mono)`; remover `--font-geist-sans`/`--font-geist-mono`.
- `apps/web/public/brand/logo-mark.png` — **criar** (asset trazido do projeto de design).
- `apps/web/public/brand/logo-full.svg` — **criar** somente se o asset estiver disponível e for útil (ver Riscos).
- `apps/web/components/marketing/logo.tsx` — **criar:** componente `Logo` (mark + wordmark), em `components/marketing/` conforme convenção (primitivos só em `components/ui/`).
- `apps/web/app/icon.png` (ou `app/favicon.ico` / `app/opengraph-image.*`) — **criar/atualizar** apenas se trivial.

## Passos de implementação

1. Confirmar/obter os assets de marca do projeto de design. **Atenção:** `assets/logo-mark.png` e `assets/logo-full.svg` **não estão** em `.planning/home-landing/design/` (lá só há `home-espresso-dark.html` e `tokens.css`) nem em `apps/web/public/` — exportar do projeto **Populatte Design** (claude.ai/design) antes de prosseguir.
2. Copiar os assets para `apps/web/public/brand/` (`logo-mark.png` obrigatório; `logo-full.svg` se disponível).
3. Em `app/layout.tsx`, importar de `next/font/google`: `Hanken_Grotesk`, `Newsreader`, `JetBrains_Mono`. Configurar cada instância:
   - `Hanken_Grotesk`: `weight: ["400","500","600","700","800"]`, `style: ["normal","italic"]` (a família só fornece itálico em 400/500 — limitar os estilos se necessário), `subsets: ["latin","latin-ext"]`, `display: "swap"`, `variable: "--font-hanken"`, `fallback` com o stack sans de `tokens.css`.
   - `Newsreader`: `weight: ["400","500","600"]`, `style: ["normal","italic"]`, `axes: ["opsz"]` (eixo óptico do design), `subsets: ["latin","latin-ext"]`, `display: "swap"`, `variable: "--font-newsreader"`, `fallback` com o stack serif de `tokens.css`.
   - `JetBrains_Mono`: `weight: ["400","500","600"]`, `subsets: ["latin","latin-ext"]`, `display: "swap"`, `variable: "--font-jetbrains-mono"`, `fallback` com o stack mono de `tokens.css`.
4. Remover os imports/instâncias `Geist`/`Geist_Mono`; aplicar `${hankenGrotesk.variable} ${newsreader.variable} ${jetBrainsMono.variable} antialiased` no `className` do `<body>`.
5. Em `app/globals.css`, no `@theme inline`: substituir `--font-sans: var(--font-geist-sans)` por `--font-sans: var(--font-hanken)`, `--font-mono: var(--font-geist-mono)` por `--font-mono: var(--font-jetbrains-mono)`, e **adicionar** `--font-serif: var(--font-newsreader)`. Garantir que não restem referências a `--font-geist-*`.
6. Criar `components/marketing/logo.tsx`: server component, `Logo` renderiza o mark via `next/image` (`width`/`height` explícitos) dentro de um quadrado de fundo `var(--latte-100)` e radius `var(--radius-md)` (ou `var(--radius-sm)` no tamanho menor, conforme design), e o wordmark "Populatte" em Hanken Grotesk peso 800, `letter-spacing:-0.02em`. Props sugeridas: `size` (mapeia para os 3 quadrados do design — 28/30/36px — com a imagem proporcional) e `showWordmark?: boolean`. `className` opcional para o container. `alt` do `next/image` = `"Populatte"`.
7. Se trivial, gerar `app/icon.png`/`favicon` e `metadata.icons`/`openGraph` a partir do mark; caso contrário, deixar como follow-up sem bloquear.
8. Validar visualmente: as 3 famílias resolvem (sem FOUT/fallback travado), acentuação PT-BR correta (ex. "Configuração", "Razão Social", "Município", "Dúvidas"), o `Logo` renderiza idêntico ao design nos 3 tamanhos, e o dashboard existente (rotas autenticadas via Clerk) continua legível após a saída do Geist.

## Critérios de aceite

- [ ] Hanken Grotesk, Newsreader e JetBrains Mono carregam via `next/font/google` em `app/layout.tsx`, sem `@import` nem `<link>` de Google Fonts no CSS/HTML.
- [ ] Os pesos/estilos batem com o design: Hanken `400/500/600/700/800` + itálico `400/500`; Newsreader roman+itálico `400/500/600` com `opsz`; JetBrains Mono `400/500/600`.
- [ ] Cada `next/font` usa `variable` com nome próprio (`--font-hanken`/`--font-newsreader`/`--font-jetbrains-mono`), `display: "swap"`, `subsets` incluindo `"latin-ext"` e `fallback` equivalente ao stack de `tokens.css`.
- [ ] `app/globals.css` (`@theme inline`) expõe `font-sans` (Hanken Grotesk), `font-serif` (Newsreader, recém-adicionado) e `font-mono` (JetBrains Mono), mapeando para as vars do `next/font` sem auto-referência.
- [ ] Geist removido: sem `Geist`/`Geist_Mono` no layout e sem `--font-geist-*` no `globals.css`; `className` do `<body>` referencia apenas as novas vars.
- [ ] `apps/web/public/brand/logo-mark.png` existe; `logo-full.svg` presente apenas se disponível/útil.
- [ ] Componente `Logo` em `components/marketing/logo.tsx` renderiza o mark (quadrado `var(--latte-100)`, radius `var(--radius-md)`/`var(--radius-sm)`) + wordmark "Populatte" em Hanken Grotesk 800 com `letter-spacing:-0.02em`, e suporta os 3 tamanhos do design (28/30/36px) e ocultar o wordmark via prop.
- [ ] O mark exposto via `next/image` tem `alt` significativo (`"Populatte"`) e `width`/`height` explícitos (sem CLS); quando o wordmark visível já nomeia a marca, considerar `alt=""` para evitar leitura duplicada por leitores de tela.
- [ ] Texto com acentuação PT-BR (ex. "Configuração", "Razão Social", "Dúvidas") renderiza corretamente nas 3 famílias, sem caracteres de fallback/tofu.
- [ ] O contraste do wordmark `var(--latte-50)` sobre fundo escuro (`--espresso-950`) permanece legível; o quadrado `var(--latte-100)` mantém o mark visível (validado visualmente nos 3 contextos).
- [ ] Favicon/og atualizados se triviais; caso contrário, registrados como follow-up sem bloquear.
- [ ] `npm run build --filter=@populatte/web` e `npm run type-check --filter=@populatte/web` passam; smoke visual do dashboard existente confirma legibilidade após a troca do Geist.

## Dependências

- **Depende de:** nenhuma sub-issue.
- **Habilita:** `shell`, `navbar`, `hero-content`, `hero-mock`, `sections-dark`, `sections-light`, `faq-cta-footer` (todas usam estas famílias e/ou o `Logo`). Junto com `tokens`, é fundação que bloqueia o restante do épico.
- Bibliotecas: usa apenas `next/font/google` e `next/image` (Next 16, já presente); nenhuma lib nova. Sem sobreposição com `tokens` (que cuida das vars de cor e do mapeamento shadcn) — aqui só se tocam as vars de fonte do `@theme`.

## Riscos & observações

- **Assets de marca ausentes localmente:** `logo-mark.png` (e `logo-full.svg`) não existem no repositório nem em `.planning/home-landing/design/` — é preciso exportá-los do projeto Populatte Design (claude.ai/design) antes de implementar. Sem o `logo-mark.png`, o `Logo` e a nav/hero-mock/footer ficam bloqueados.
- **`logo-full.svg` provavelmente desnecessário:** o HTML do design usa exclusivamente `logo-mark.png` + wordmark **textual**; o `logo-full.svg` não aparece no markup. Trazê-lo apenas se for útil; o componente `Logo` deve cobrir o uso real (mark + wordmark de texto).
- **Auto-referência no `@theme`:** o draft inicial planejava `variable: "--font-sans"` no `next/font` e `--font-sans: var(--font-sans)` no `@theme` — isso se auto-referencia. Por isso a var do `next/font` recebe nome próprio (`--font-hanken` etc.) e o `@theme` mapeia os tokens públicos para ela.
- **Remoção do Geist re-skinna o app inteiro:** todas as telas autenticadas passam a usar Hanken Grotesk/JetBrains Mono (métrica/altura de fonte mudam) → exige smoke test visual do dashboard. Alinhado à decisão de adoção global dos tokens.
- **`opsz` do Newsreader e bundle:** garantir o eixo óptico via `axes: ["opsz"]` para o itálico editorial ficar fiel ("Tome um café", "horas"); conferir o tamanho do bundle das fontes (variável vs. estática).
- **Peso do wordmark varia por contexto:** nav/footer usam 800, o header do hero-mock usa **700** — a prop de tamanho/contexto do `Logo` deve permitir esse ajuste (ou o consumidor sobrescreve), validado nas sub-issues de seção.
- **Esta sub-issue não estiliza seções:** qualquer uso visual de família/logo nas seções é validado nas respectivas sub-issues; aqui só se garante carregamento, vars, assets e o componente `Logo`.
- **Decisões respeitadas:** Home sempre Espresso Dark e desacoplada do toggle next-themes (a tipografia é neutra ao tema); tokens adotados globalmente (vars de fonte ligadas ao `@theme`); CTAs auth-aware (Clerk) e substituição de `app/page.tsx` ficam fora desta fundação (sub-issue `shell`).