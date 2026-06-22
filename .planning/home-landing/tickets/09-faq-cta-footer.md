## Contexto

Sub-issue do épico **Home pública (Landing) — Espresso Dark** do app web (`apps/web`, Next.js App Router, Tailwind v4 CSS-first, shadcn/ui new-york, Clerk, next-themes, lucide-react, next/font). A Home é uma landing de marketing pública que substituirá a `apps/web/app/page.tsx` atual (hoje uma landing simples com copy diferente).

Esta issue cobre o **terço final** da página: a seção **FAQ** (`id="faq"`), a **faixa de CTA final** e o **rodapé**. São três componentes de marketing independentes, montados depois pela issue `shell`, que cuida da composição, da ordem das seções, da rota e do lock Espresso Dark do layout.

Decisões travadas do épico aplicáveis aqui:
1. A Home é **sempre Espresso Dark** e **desacoplada** do toggle claro/escuro (next-themes). Estas três seções são todas escuras — usar tokens dark fixos, nunca depender da classe `.dark` nem reagir ao `ModeToggle`. Não há mode-toggle na Home.
2. Os **tokens Populatte** já estão adotados globalmente (issue `tokens`) — consumir as variáveis (`var(--gold-400)`, `var(--espresso-900)`, `var(--border-inverse)`, `var(--radius-lg)`, etc.), nunca hex cru.
3. **CTAs auth-aware via Clerk** — a faixa de CTA usa `SignedIn`/`SignedOut`, igual ao restante da Home e ao padrão já presente na `app/page.tsx` atual (`SignUpButton mode="redirect"` / `SignInButton mode="redirect"`).
4. Esta implementação **substitui** trechos da `app/page.tsx` antiga (a montagem final fica na issue `shell`).

Referência de design (source of truth): `.planning/home-landing/design/home-espresso-dark.html` (seções FAQ linhas 171–183, CTA BAND 185–197, FOOTER 199–211) e `.planning/home-landing/design/tokens.css`.

## Objetivo

Entregar três componentes de marketing reutilizáveis e fiéis ao design — `faq.tsx`, `cta-band.tsx` e `site-footer.tsx` — em `apps/web/components/marketing/`, prontos para serem compostos pela issue `shell`, respeitando tokens, tipografia, copy literal, responsividade e acessibilidade.

## Escopo

**Inclui:**
- `components/marketing/faq.tsx` — seção FAQ (`id="faq"`, `max-width: 780px`) com eyebrow gold, `h2` "Antes de começar" e 4 itens em accordion. Usar o **shadcn Accordion** restilizado para o visual escuro (ver Passos).
- `components/marketing/cta-band.tsx` — faixa de CTA final (caixa com gradiente espresso, overlay radial gold, watermark "☕" decorativo) com headline, parágrafo e CTAs auth-aware.
- `components/marketing/site-footer.tsx` — rodapé com grid de 4 colunas (marca + 3 colunas de links) e barra inferior de copyright.
- Adicionar o componente **shadcn Accordion** ao projeto (não está instalado): `pnpm dlx shadcn@latest add accordion` rodado dentro de `apps/web` (o app tem `pnpm-lock.yaml` próprio e `components.json` style new-york; é o mesmo fluxo do CLAUDE.md).
- Responsividade das três seções (FAQ legível em telas estreitas; CTA com padding/headline adaptados; footer colapsa colunas).
- A11y: estado aberto/fechado do accordion gerenciado pelo Radix (`aria-expanded`); watermark "☕" e overlays decorativos com `aria-hidden`; foco visível nos links/CTAs; respeitar `prefers-reduced-motion` na rotação do chevron e na animação de abrir/fechar.

**Não inclui:**
- Composição final / ordem das seções na página, rota, `metadata`/SEO e o lock Espresso Dark do layout de marketing (issue `shell`).
- Implementação dos tokens em `globals.css` (issue `tokens`) e configuração de `next/font` + assets de logo (issue `typo-assets`) — consumidos aqui, não criados.
- Navbar, hero e seções intermediárias claras/escuras (issues `navbar`, `hero-content`, `hero-mock`, `sections-dark`, `sections-light`).
- Páginas reais de Sobre/Contato/Blog/Privacidade/Termos — os links são **placeholders** (`href="#"`).

## Referência de design

Valores extraídos de `home-espresso-dark.html`. Inline-styles do design → mapear para Tailwind v4 + tokens. As fontes aparecem como `'Hanken Grotesk'` (mapear para `var(--font-sans)`) e `'Newsreader'` (mapear para `var(--font-serif)`), ambas providas pela issue `typo-assets`.

### FAQ (`<section id="faq">`, linhas 172–183)
- Container: `max-width: 780px`, `margin: 0 auto`, padding `88px 56px`.
- Cabeçalho centralizado, `margin-bottom: 36px`:
  - Eyebrow: 600/12px, `letter-spacing: 0.08em`, `text-transform: uppercase`, cor `var(--gold-400)`, `margin-bottom: 12px`, texto **"Dúvidas frequentes"**.
  - `h2`: 800/36px, `line-height: 1.1`, `letter-spacing: -0.03em`, cor `var(--latte-50)`, texto **"Antes de começar"**.
- Lista: `display: flex; flex-direction: column; gap: 12px`.
- Cada item (no design é `<details>`): fundo `var(--espresso-900)`, borda `1px solid var(--border-inverse)`, `border-radius: 14px` (token `--radius-lg`).
  - Trigger/summary: `display:flex; align-items:center; gap:12px; padding: 18px 20px`, 700/16px, cor `var(--latte-50)`, label em `<span style="flex:1">` e chevron lucide `chevron-down` (classe conceitual `faq-chev`) 18px, cor `var(--mocha-400)`, `transition: transform .2s`. **Ao abrir, o chevron gira 180°** (no design: `details[open] > summary .faq-chev { transform: rotate(180deg) }`).
  - Conteúdo/resposta: 400/14px, `line-height: 1.6`, cor `var(--latte-300)`, `padding: 0 20px 18px`.
- **Perguntas e respostas exatas (copy literal):**
  1. **"Preciso instalar uma extensão?"** → "Sim. O preenchimento acontece no seu navegador, pela extensão do Populatte — é assim que mantemos seus dados fora do nosso servidor. Instala em menos de um minuto."
  2. **"Quais formatos de planilha são aceitos?"** → "Hoje o Populatte trabalha com arquivos Excel (.xlsx). Cada linha vira um registro e cada coluna, um campo mapeável."
  3. **"O Populatte preenche sozinho, sem mim?"** → "Ele é um copiloto: você abre o site, escolhe o registro e dispara o preenchimento a partir do mapa que ensinou. Você confere antes de enviar."
  4. **"Meus dados ficam guardados em algum servidor?"** → "Os dados sensíveis são tratados localmente, no navegador, durante o preenchimento. Não pedimos nem guardamos as credenciais dos portais. Tudo conforme a LGPD."

### CTA BAND (`<section>` com a caixa de destaque, linhas 186–197)
- Section externa: `max-width: 1200px`, `margin: 0 auto`, padding `0 56px 88px`.
- Caixa interna: `position: relative`, `border-radius: 24px` (token `--radius-2xl`), `padding: 64px 48px`, `text-align: center`, `overflow: hidden`, `background: linear-gradient(135deg, var(--espresso-800), var(--espresso-950))`, `border: 1px solid var(--border-inverse)`.
- Overlay radial gold (decorativo, `aria-hidden`, `pointer-events: none`): `position: absolute; inset: 0; background: radial-gradient(500px 300px at 80% 10%, rgba(240,178,33,0.18), transparent 60%)`. O `rgba(240,178,33,0.18)` é o valor decorativo literal do design (gold com alpha — não há token equivalente com transparência); manter como no HTML.
- Watermark "☕" (decorativo, `aria-hidden`, `pointer-events: none`): `position: absolute; right: 30px; top: -50px; font-family: var(--font-serif)` ('Newsreader'); `font-style: italic; font-size: 200px; color: rgba(247,227,189,0.06)` (cor cream/`--latte-200` com alpha — valor decorativo literal do design).
- `h2` (`position: relative`): 800/44px, `line-height: 1.08`, `letter-spacing: -0.03em`, cor `var(--latte-50)`. Texto **"Pronto para economizar horas de trabalho?"**, com a palavra **"horas"** em `<em>` serifado: `font-family: var(--font-serif)`, `font-style: italic`, `font-weight: 500`, cor `var(--gold-400)`.
- Parágrafo (`position: relative`): 400/18px, cor `var(--latte-300)`, `margin: 14px 0 30px`. Texto **"Crie sua conta e prepare o primeiro projeto em poucos minutos."**
- Linha de CTAs (`position: relative`, `display: flex; gap: 12px; justify-content: center`):
  - Primário (gold): `height: 54px`, `padding: 0 28px`, `border-radius: 12px`, `background: var(--gold-500)`, cor `var(--espresso-950)`, 700/16px, hover `var(--gold-600)`; ícone lucide `arrow-right` 18px + texto **"Começar agora — é grátis"**.
  - Secundário (outline): `height: 54px`, `padding: 0 24px`, `border-radius: 12px`, `background: transparent`, `border: 1px solid var(--border-inverse)`, cor `var(--latte-100)`, 600/16px, hover `background: rgba(247,227,189,0.08)` (valor decorativo literal do design). Texto **"Já tenho conta"**.
- **Auth-aware:** no design os dois apontam estaticamente para `/sign-up` e `/sign-in`. A decisão 4 do épico exige variação por estado de auth via Clerk (ver Passos): deslogado mostra os dois CTAs acima; logado mostra um único CTA gold para `/dashboard`.

### FOOTER (`<footer>`, linhas 200–211)
- `border-top: 1px solid var(--border-inverse)`.
- Grid principal: `max-width: 1200px`, `margin: 0 auto`, padding `48px 56px`, `grid-template-columns: 1.4fr 1fr 1fr 1fr`, `gap: 32px`.
- Coluna 1 (marca): linha (`display:flex; align-items:center; gap:10px; margin-bottom:12px`) com quadrado de logo (`width:30px; height:30px; border-radius: 9px`, fundo `var(--latte-100)`, `display:grid; place-items: center`) contendo o logo-mark (asset trazido pela issue `typo-assets`, `height: 21px`, `alt="Populatte"`) + wordmark `<b>` 800/17px cor `var(--latte-50)` "Populatte". Abaixo, tagline (`<p>`) 400/13px, `line-height: 1.55`, cor `var(--mocha-400)`, `max-width: 26em`: **"Do Excel para a Web, num gole de café. Preenchimento de formulários automatizado, seguro e validado."**
- Cada coluna de links: título 700/12px cor `var(--latte-100)` `margin-bottom: 12px`; lista `flex column gap: 9px`, links 400/13px cor `var(--mocha-400)`, hover `color: var(--latte-100)`.
  - **Produto:** "Como funciona" → `#como`; "Casos de uso" → `#casos`; "Dúvidas" → `#faq`.
  - **Empresa:** "Sobre" → `#`; "Contato" → `#`; "Blog" → `#` (**placeholders**).
  - **Legal:** "Privacidade (LGPD)" → `#`; "Termos" → `#` (**placeholders**).
- Barra inferior: `border-top: 1px solid var(--border-inverse)`; conteúdo `max-width: 1200px`, `margin: 0 auto`, padding `18px 56px`, 400/12px cor `var(--mocha-500)`, texto **"© 2026 Populatte · Transformando Excel em automação, um formulário por vez."**

### Ícones lucide usados
`chevron-down` (FAQ — o shadcn Accordion já embute um `ChevronDownIcon` no trigger), `arrow-right` (CTA primário). Ambos existem no `lucide-react` já instalado.

## Arquivos afetados / criados

- **Criar** `apps/web/components/marketing/faq.tsx` (novo diretório `components/marketing/`).
- **Criar** `apps/web/components/marketing/cta-band.tsx`
- **Criar** `apps/web/components/marketing/site-footer.tsx`
- **Criar (via CLI shadcn)** `apps/web/components/ui/accordion.tsx` — primitivo gerado por `pnpm dlx shadcn@latest add accordion`; pertence a `components/ui/` (regra do CLAUDE.md). Hoje só existe `components/ui/collapsible.tsx`; `accordion.tsx` ainda não.
- **Dependência nova esperada**: `@radix-ui/react-accordion` (instalada automaticamente pelo shadcn) — registrar em `apps/web/package.json`/`pnpm-lock.yaml` se o CLI adicionar.
- Consome (não cria): tokens em `apps/web/app/globals.css` (issue `tokens`), fontes (`var(--font-sans)`/`var(--font-serif)`) e asset de logo-mark em `apps/web/public/` (issue `typo-assets`), helpers Clerk de `@clerk/nextjs` (`SignedIn`, `SignedOut`, `SignInButton`, `SignUpButton`).

## Passos de implementação

1. **Adicionar o Accordion shadcn**: rodar `pnpm dlx shadcn@latest add accordion` dentro de `apps/web`. Confirmar que `components/ui/accordion.tsx` foi criado e que `@radix-ui/react-accordion` entrou em `package.json`. Não editar o primitivo além do necessário para o tema (a sobrescrita visual fica no `faq.tsx`, via className).
2. **`faq.tsx`**:
   - Componente de marketing renderizando `<section id="faq">` com `max-width: 780px` e padding do design. O componente shadcn `Accordion` é client (`"use client"`); `faq.tsx` pode ser Server Component que importa o `Accordion` client, ou marcar `"use client"` se preferir — sem estado próprio fora do Radix.
   - Cabeçalho com eyebrow gold "Dúvidas frequentes" e `h2` "Antes de começar".
   - Usar `Accordion type="single" collapsible` com 4 `AccordionItem`/`AccordionTrigger`/`AccordionContent` usando a copy literal exata. Definir as 4 perguntas/respostas como array tipado, com identificadores em inglês (ex.: `const faqItems: { question: string; answer: string }[]`).
   - **Restilizar para o visual escuro** (via className/Tailwind arbitrário): cada `AccordionItem` com fundo `bg-[var(--espresso-900)]`, borda `border-[var(--border-inverse)]`, `rounded-[var(--radius-lg)]` (14px) e **sem o `border-b` padrão** que o new-york aplica entre itens (itens isolados com `gap: 12px`). Trigger 700/16px cor `var(--latte-50)`; o `ChevronDownIcon` do trigger shadcn já gira via `data-[state=open]:rotate-180` — manter, ajustando a cor para `var(--mocha-400)`. Content 400/14px cor `var(--latte-300)`, padding `0 20px 18px`.
3. **`cta-band.tsx`**:
   - `"use client"` (usa componentes Clerk). `<section>` externa + caixa interna com gradiente, borda e radius do design.
   - Overlay radial gold e watermark "☕" como `<div aria-hidden="true">` posicionados absolutamente (`pointer-events: none`); o "☕" em `var(--font-serif)`, 200px, com a cor decorativa literal `rgba(247,227,189,0.06)`. Garantir `overflow: hidden` na caixa para conter o watermark.
   - `h2` com `<em>` em "horas" (serif italic gold `var(--gold-400)`) e parágrafo literal.
   - CTAs **auth-aware** com Clerk, espelhando o padrão da `app/page.tsx` atual: `<SignedOut>` renderiza o CTA gold "Começar agora — é grátis" (`<SignUpButton mode="redirect">` → `/sign-up`, com ícone `arrow-right`) e o outline "Já tenho conta" (`<SignInButton mode="redirect">` → `/sign-in`); `<SignedIn>` renderiza um único CTA gold com `<Link href="/dashboard">` (texto "Ir para o Dashboard"). Estilizar os botões com as medidas do design (54px de altura, radius 12px, cores gold/outline) — pode usar o `Button` shadcn (`asChild`) ou um elemento estilizado, mas mantendo os tokens.
4. **`site-footer.tsx`**:
   - `<footer>` (Server Component) com borda superior, grid de 4 colunas (`1.4fr 1fr 1fr 1fr`) e gap 32px.
   - Coluna de marca (quadrado de logo `var(--latte-100)` + logo-mark + wordmark + tagline). Para o logo-mark, consumir o asset que a issue `typo-assets` colocará em `public/` (via `next/image` ou `<img src="/logo-mark.png" alt="Populatte" height={21}>` — alinhar o nome final do arquivo com `typo-assets`).
   - Colunas Produto/Empresa/Legal com os links e hovers do design. Definir os links em arrays tipados, com chaves/identificadores em inglês.
   - **Sinalizar placeholders**: os links de Empresa e Legal usam `href="#"` por enquanto. Adicionar um comentário em inglês no código (ex.: `// TODO: replace placeholder "#" links once About/Contact/Blog/Privacy/Terms pages exist`).
   - Barra inferior com o copyright literal "© 2026 Populatte · Transformando Excel em automação, um formulário por vez." (atenção: a `app/page.tsx` atual ainda diz "© 2025" — o novo footer deve usar **2026**).
5. **Responsividade**:
   - FAQ: padding lateral reduzido em telas estreitas (ex.: `px-5 md:px-14`), mantendo `max-width: 780px`.
   - CTA: reduzir `padding` (ex.: `px-6 py-12 md:px-12 md:py-16`) e tamanho do `h2` em mobile; CTAs empilham (`flex-col sm:flex-row`).
   - Footer: grid colapsa as 4 colunas (ex.: `grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]`), padding lateral menor em mobile (ex.: `px-6 md:px-14`).
6. **A11y / motion**:
   - Garantir `aria-hidden` em overlay radial e watermark "☕"; ambos com `pointer-events: none` (não capturam clique nem foco).
   - Foco visível (ring) nos links e CTAs — usar o token de ring (`var(--ring)`/`--ring-color`) garantindo contraste sobre o fundo escuro.
   - A rotação do chevron e a animação de abrir/fechar do accordion degradam sob `@media (prefers-reduced-motion: reduce)` (sem animação/transição, com o estado final correto e o conteúdo legível).
7. Rodar `npm run lint --filter=@populatte/web` e `npm run type-check --filter=@populatte/web`; inspecionar os três componentes isoladamente no navegador (a montagem real na página fica na issue `shell`).

## Critérios de aceite

- [ ] Existem `apps/web/components/marketing/faq.tsx`, `cta-band.tsx` e `site-footer.tsx`, exportando componentes nomeados em inglês.
- [ ] O Accordion shadcn foi adicionado (`apps/web/components/ui/accordion.tsx` presente) e o FAQ o usa restilizado para o tema escuro; nenhum primitivo de accordion foi criado fora de `components/ui/`.
- [ ] FAQ: container com `max-width: 780px` e padding do design; eyebrow gold "Dúvidas frequentes" (`var(--gold-400)`), `h2` "Antes de começar" em `var(--latte-50)`; 4 itens com fundo `var(--espresso-900)`, borda `var(--border-inverse)`, radius 14px (`--radius-lg`) e gap 12px (sem `border-b` padrão do new-york entre itens).
- [ ] As 4 perguntas e respostas do FAQ batem **exatamente** com a copy do design (incluindo "Antes de começar" e o fecho "Tudo conforme a LGPD").
- [ ] O chevron do FAQ gira 180° ao abrir o item e volta ao fechar.
- [ ] CTA band: caixa com `border-radius: 24px` (`--radius-2xl`), `background: linear-gradient(135deg, var(--espresso-800), var(--espresso-950))`, borda `var(--border-inverse)` e `overflow: hidden`.
- [ ] O overlay radial gold (`rgba(240,178,33,0.18)`) e o watermark "☕" (200px, `var(--font-serif)` italic, `rgba(247,227,189,0.06)`) estão presentes, são puramente decorativos (`aria-hidden`, `pointer-events: none`) e não capturam clique/foco nem geram scroll horizontal.
- [ ] CTA band: `h2` "Pronto para economizar horas de trabalho?" com a palavra "horas" em `<em>` serifado itálico gold (`var(--gold-400)`); parágrafo "Crie sua conta e prepare o primeiro projeto em poucos minutos." presente.
- [ ] CTAs do CTA band são **auth-aware** via Clerk (espelhando o padrão `mode="redirect"` da page atual): deslogado mostra "Começar agora — é grátis" (`/sign-up`) + "Já tenho conta" (`/sign-in`); logado mostra um único CTA "Ir para o Dashboard" (`/dashboard`).
- [ ] CTA primário usa ícone lucide `arrow-right`, fundo `var(--gold-500)`, texto `var(--espresso-950)`, altura 54px, radius 12px e hover `var(--gold-600)`; o secundário é outline `var(--border-inverse)` com texto `var(--latte-100)`.
- [ ] Footer: grid `1.4fr 1fr 1fr 1fr` em desktop com colunas marca / Produto / Empresa / Legal; coluna de marca com quadrado `var(--latte-100)` (30px, radius 9px) + logo-mark + wordmark "Populatte" + tagline literal; links com hover `color: var(--latte-100)`.
- [ ] Links de Produto apontam para `#como`, `#casos`, `#faq`; links de Empresa (Sobre/Contato/Blog) e Legal (Privacidade (LGPD)/Termos) usam `href="#"` e estão sinalizados como placeholders no código (comentário em inglês).
- [ ] Barra inferior do footer exibe exatamente "© 2026 Populatte · Transformando Excel em automação, um formulário por vez." (ano 2026, não 2025).
- [ ] Todas as cores/raios/tipografia usam tokens Populatte (`var(--...)`), sem hex cru; os únicos valores literais admitidos são os `rgba(...)` decorativos do design (overlays e hover do outline) que não têm token com transparência. Nenhuma das três seções depende da classe `.dark` ou do `ModeToggle` (Home sempre Espresso Dark).
- [ ] Responsivo: footer colapsa as colunas em telas estreitas; FAQ e CTA permanecem legíveis com padding/headline adaptados; sem overflow horizontal causado pelo watermark.
- [ ] A11y: foco visível em links e CTAs; a rotação do chevron e a animação do accordion degradam sob `prefers-reduced-motion: reduce`, preservando o estado final.
- [ ] `npm run lint --filter=@populatte/web` e `npm run type-check --filter=@populatte/web` passam sem erros nos novos arquivos.

## Dependências

- **Depende de** `tokens` (variáveis Populatte em `globals.css`) e `typo-assets` (`next/font` com Hanken Grotesk/Newsreader/JetBrains Mono + asset de logo-mark em `public/`).
- É **consumida por** `shell` (composição/ordem das seções, rota, lock Espresso Dark) e verificada por `a11y-qa` (QA responsivo e de acessibilidade final).
- Introduz o componente `accordion` (shadcn) e a dependência `@radix-ui/react-accordion`.

## Riscos & observações

- **Accordion shadcn em tema escuro**: o estilo padrão (new-york) traz `border-b` entre itens, `ChevronDownIcon` com cor herdada e radius pequeno; será necessário sobrescrever via className para o visual do design (itens isolados com fundo `var(--espresso-900)`, borda `var(--border-inverse)`, radius 14px, gap 12px, chevron `var(--mocha-400)`). Manter a sobrescrita no `faq.tsx`, não no primitivo `components/ui/accordion.tsx`, para não vazar estilo para usos futuros do Accordion no dashboard.
- **No design o FAQ usa `<details>` nativo** (`details[open] > summary .faq-chev { transform: rotate(180deg) }`); ao trocar por Radix Accordion, garantir paridade visual do chevron (rotação via `data-[state=open]`) e da animação de abertura/fechamento, respeitando `prefers-reduced-motion`.
- **Watermark "☕" / overflow**: `font-size: 200px` posicionado fora dos limites (`right:30px; top:-50px`) — confirmar `overflow: hidden` na caixa do CTA para não criar scroll horizontal, especialmente em mobile.
- **Placeholders `#`**: Sobre/Contato/Blog/Privacidade/Termos não existem ainda; manter como `#` e sinalizar com comentário, evitando links quebrados aparentando rota real.
- **CTAs auth-aware**: o design mostra dois CTAs estáticos (`/sign-up` e `/sign-in`); a decisão 4 do épico exige variação por estado de auth — alinhar o estado logado (CTA único "Ir para o Dashboard") com o restante da Home para consistência, reusando o padrão `SignUpButton`/`SignInButton mode="redirect"` já presente em `app/page.tsx`.
- **Cor de texto base**: estas seções rodam sobre fundo escuro; não herdar `--text-strong`/`--text-body` (que são escuros, pensados para a faixa clara) — usar explicitamente `var(--latte-*)`/`var(--mocha-*)` conforme o design.
- **Gerenciador de pacotes**: `apps/web` tem `pnpm-lock.yaml` próprio (apesar do `package-lock.json` na raiz); usar `pnpm dlx shadcn@latest add accordion` dentro de `apps/web`, como no CLAUDE.md.
- **Ano do copyright**: a `app/page.tsx` atual usa "© 2025" — esta implementação deve usar "© 2026", conforme o design.