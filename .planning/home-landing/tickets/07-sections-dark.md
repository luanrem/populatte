## Contexto

A Home pública do Populatte está sendo reconstruída fiel ao design **Espresso Dark** (substitui a `apps/web/app/page.tsx` atual). Esta sub-issue entrega duas seções escuras consecutivas da landing: a **faixa de segmentos** (prova social) logo abaixo do hero e a seção **"Como funciona"** (3 passos). Ambas vivem sobre o fundo global `var(--espresso-950)` e fazem parte da art direction fixa — a Home é **sempre Espresso Dark** e NÃO segue o toggle claro/escuro do `next-themes` (decisão travada).

Os componentes desta issue são montados depois pela sub-issue `shell`, que compõe todas as seções na página e aplica o lock Espresso Dark no nível do layout de marketing. Aqui entregamos apenas os dois componentes de marketing, isolados e prontos para composição — sem tocar em `app/page.tsx`.

## Objetivo

Implementar dois componentes de marketing reutilizáveis e fiéis ao design:
- `segments-band.tsx` — faixa de prova social com eyebrow + 4 segmentos em serif itálico.
- `how-it-works.tsx` — seção "Como funciona" com eyebrow + h2 + grid de 3 cards (passos 01/02/03).

Fidelidade visual ao HTML/tokens do design, com responsividade (grid de 3 colunas colapsa para 1 coluna no mobile; faixa quebra via `flex-wrap`).

## Escopo

**Inclui:**
- Componente `SegmentsBand` em `apps/web/components/marketing/segments-band.tsx`.
- Componente `HowItWorks` em `apps/web/components/marketing/how-it-works.tsx`, cujo elemento raiz é `<section id="como">` (alvo dos links âncora da navbar e do footer).
- Cores via tokens Populatte (`var(--espresso-950)`, `var(--espresso-900)`, `var(--border-inverse)`, `var(--gold-400)`, `var(--latte-50)`, `var(--latte-100)`, `var(--latte-300)`, `var(--mocha-400)`, `var(--green-400)`), tipografia (Hanken Grotesk, Newsreader, JetBrains Mono) e ícones de `lucide-react`.
- Copy literal em PT-BR exatamente como no HTML do design.
- Responsividade: grid de 3 colunas no desktop → 1 coluna no mobile; faixa de segmentos com `flex-wrap` centralizado.
- Hierarquia semântica e acessível de headings (a faixa de segmentos não é heading; "Como funciona" usa `<h2>` para o título e `<h3>` para cada card); ícones decorativos marcados como tal.

**Não inclui:**
- Composição na página / criação ou edição de `app/page.tsx` e do layout de marketing (responsabilidade do `shell`).
- Definição dos tokens em `globals.css` (sub-issue `tokens`) e configuração de fontes via `next/font` + assets de marca (sub-issue `typo-assets`) — esta issue **consome** esses outputs, não os cria.
- Navbar, hero (conteúdo e mock), faixa clara "Por que + Casos", FAQ, CTA band e footer (outras sub-issues).
- Auditoria final de a11y / `prefers-reduced-motion` / QA responsivo cross-section (sub-issue `a11y-qa`). **Estas duas seções não têm animação**, então `prefers-reduced-motion` não se aplica aqui.

## Referência de design

Fonte: `./design/home-espresso-dark.html` (blocos `<!-- SEGMENTOS -->`, linhas ~118–127, e `<!-- COMO FUNCIONA (dark) -->`, linhas ~129–139) e `./design/tokens.css`. Os `<i data-lucide="...">` do HTML viram componentes de `lucide-react` no JSX.

### (a) Faixa de segmentos — `SegmentsBand`
- Wrapper externo com `border-top: 1px solid var(--border-inverse)` e `border-bottom: 1px solid var(--border-inverse)`.
- Container interno: `max-width: 1200px`, centralizado (`margin: 0 auto`), `padding: 22px 56px`, `display: flex; align-items: center; gap: 30px; flex-wrap: wrap; justify-content: center`.
- Eyebrow: `"Confiado por equipes em"` — Hanken Grotesk, `font-weight: 600`, `font-size: 11px`, `letter-spacing: 0.05em`, `text-transform: uppercase`, cor `var(--mocha-400)`.
- 4 segmentos em série, cada um: `font-family: 'Newsreader', serif`, `font-style: italic`, `font-size: 20px`, cor `var(--latte-300)`:
  - `"Contabilidades"`
  - `"Escritórios jurídicos"`
  - `"RH & Dep. pessoal"`
  - `"BPO financeiro"`

### (b) "Como funciona" — `HowItWorks`
- `<section id="como">`, `max-width: 1200px`, centralizado (`margin: 0 auto`), `padding: 88px 56px`.
- Cabeçalho centralizado (`text-align: center; max-width: 38em; margin: 0 auto 48px`):
  - Eyebrow: `"Como funciona"` — Hanken Grotesk, `font-weight: 600`, `font-size: 12px`, `letter-spacing: 0.08em`, `text-transform: uppercase`, cor `var(--gold-400)`, `margin-bottom: 12px`.
  - h2: `"Três passos. Nenhuma madrugada digitando."` — Hanken Grotesk, `font-weight: 800`, `font-size: 40px`, `line-height: 1.1`, `letter-spacing: -0.03em`, cor `var(--latte-50)`.
- Grid: `grid-template-columns: repeat(3, 1fr)`, `gap: 18px`.
- Cada card: fundo `var(--espresso-900)`, `border: 1px solid var(--border-inverse)`, `border-radius: 16px`, `padding: 28px`.
- Estrutura de cada card (na ordem do HTML):
  1. Número mono: JetBrains Mono, `font-weight: 800`, `font-size: 12px`, cor `var(--gold-400)`.
  2. Quadrado de ícone: `width: 50px; height: 50px; border-radius: 12px; display: grid; place-items: center; margin: 16px 0`, com fundo tintado específico por passo (ver abaixo); ícone `lucide` `width: 24px; height: 24px`.
  3. h3: Hanken Grotesk, `font-weight: 700`, `font-size: 22px`, cor `var(--latte-50)`.
  4. p: Hanken Grotesk, `font-weight: 400`, `font-size: 14px`, `line-height: 1.55`, cor `var(--latte-300)`, `margin-top: 8px`.
- Conteúdo dos 3 cards (copy e tintas literais do HTML):
  - **01** — ícone `file-spreadsheet`; quadrado tinta `rgba(247,227,189,0.08)` (latte translúcido); cor do ícone `var(--latte-100)`; título `"Importe sua planilha"`; descrição `"Suba um Excel (.xlsx). Cada linha vira um registro, cada coluna um campo mapeável."`
  - **02** — ícone `git-compare-arrows`; quadrado tinta `rgba(240,178,33,0.14)` (gold translúcido); cor do ícone `var(--gold-400)`; título `"Mapeie com a extensão"`; descrição `"Clique numa coluna, clique no campo do site. O vínculo fica salvo para os próximos registros."`
  - **03** — ícone `zap`; quadrado tinta `rgba(91,168,79,0.16)` (green translúcido); cor do ícone `var(--green-400)`; título `"Preencha e valide"`; descrição `"Um clique e o formulário é populado. Você confere, envia e marca como concluído."`

> Observação sobre tintas: os fundos dos quadrados de ícone são RGBAs translúcidos derivados das ramps latte/gold/green; manter exatamente como no HTML (não substituir por tokens sólidos, pois o efeito depende da transparência sobre `var(--espresso-900)`).

## Arquivos afetados / criados

- `apps/web/components/marketing/segments-band.tsx` — novo, exporta `SegmentsBand`.
- `apps/web/components/marketing/how-it-works.tsx` — novo, exporta `HowItWorks` (raiz `<section id="como">`).

O diretório `apps/web/components/marketing/` ainda **não existe** e deve ser criado nesta issue. Nenhum primitivo novo em `components/ui/` (reservado ao shadcn) — usar apenas `lucide-react` para ícones. Não editar `app/page.tsx`, `app/layout.tsx` nem `app/globals.css` aqui.

## Passos de implementação

1. Criar o diretório `apps/web/components/marketing/`.
2. Implementar `segments-band.tsx`:
   - Componente React funcional `SegmentsBand` (sem props).
   - Wrapper externo com bordas top/bottom `var(--border-inverse)`; container interno com layout `flex` + `gap: 30px` + `flex-wrap: wrap` + `justify-content: center`, `max-width: 1200px`, `margin: 0 auto`, `padding: 22px 56px`.
   - Renderizar o eyebrow e mapear um array de 4 strings de segmentos (a label exibida é a copy PT-BR literal) para `<span>` em serif itálico.
   - Aplicar fontes via as variáveis/classes expostas pela sub-issue `typo-assets` (Hanken Grotesk no eyebrow; Newsreader itálico nos segmentos). Não hardcodear `@import`/`@font-face` de fonte.
3. Implementar `how-it-works.tsx`:
   - Componente React funcional `HowItWorks` cujo elemento raiz é `<section id="como">`.
   - Renderizar o bloco de cabeçalho (eyebrow gold + `<h2>`).
   - Definir um array tipado de 3 steps (campos: `number`, `Icon` de `lucide-react`, `iconSquareBackground`, `iconColor`, `title`, `description`) e mapear para os cards; importar `FileSpreadsheet`, `GitCompareArrows`, `Zap` de `lucide-react`.
   - Cada card usa `<h3>` para o título (preservando hierarquia h2 → h3).
   - Garantir que o número usa JetBrains Mono (variável/classe mono de `typo-assets`) e cor `var(--gold-400)`.
4. Responsividade: o grid de "Como funciona" deve colapsar de `repeat(3, 1fr)` para 1 coluna em telas estreitas (Tailwind responsivo, ex. `grid-cols-1 md:grid-cols-3`, ou media query equivalente). A faixa de segmentos quebra naturalmente via `flex-wrap`.
5. Acessibilidade: os ícones `lucide-react` são decorativos — marcá-los como `aria-hidden` (ou usar a prop equivalente do componente lucide) para não poluir leitores de tela; o número `01/02/03` é decorativo e não deve substituir o título do card como conteúdo principal.
6. Usar tokens Populatte para todas as cores (consumindo as variáveis definidas pela sub-issue `tokens`) e evitar hex cru, exceto as tintas RGBA translúcidas dos quadrados de ícone, que são fiéis ao design.
7. Conferir lado a lado com o HTML do design (espaçamentos, pesos de fonte, tamanhos e copy literal).

## Critérios de aceite

- [ ] `apps/web/components/marketing/segments-band.tsx` existe e exporta `SegmentsBand`.
- [ ] `apps/web/components/marketing/how-it-works.tsx` existe, exporta `HowItWorks` e seu elemento raiz é `<section>` com `id="como"`.
- [ ] A faixa de segmentos tem bordas top e bottom em `var(--border-inverse)` e conteúdo centralizado com `flex-wrap` (`gap: 30px`, `padding: 22px 56px`, `max-width: 1200px`).
- [ ] O eyebrow da faixa exibe exatamente `"Confiado por equipes em"`, uppercase, `font-weight: 600`, `font-size: 11px`, cor `var(--mocha-400)`.
- [ ] Os 4 segmentos aparecem em Newsreader itálico, `font-size: 20px`, cor `var(--latte-300)`, com a copy exata: `"Contabilidades"`, `"Escritórios jurídicos"`, `"RH & Dep. pessoal"`, `"BPO financeiro"`.
- [ ] "Como funciona" exibe o eyebrow `"Como funciona"` em `var(--gold-400)` (`font-size: 12px`, `letter-spacing: 0.08em`, uppercase) e o `<h2>` `"Três passos. Nenhuma madrugada digitando."` em `var(--latte-50)` (`font-weight: 800`, `font-size: 40px`, `letter-spacing: -0.03em`).
- [ ] Os 3 cards usam fundo `var(--espresso-900)`, borda `var(--border-inverse)`, `border-radius: 16px` e `padding: 28px`.
- [ ] Os números `01`, `02`, `03` aparecem em JetBrains Mono, `font-weight: 800`, `font-size: 12px`, cor `var(--gold-400)`.
- [ ] Card 01 usa ícone `file-spreadsheet` (cor `var(--latte-100)`, quadrado `rgba(247,227,189,0.08)`), título `"Importe sua planilha"` e descrição `"Suba um Excel (.xlsx). Cada linha vira um registro, cada coluna um campo mapeável."`
- [ ] Card 02 usa ícone `git-compare-arrows` (cor `var(--gold-400)`, quadrado `rgba(240,178,33,0.14)`), título `"Mapeie com a extensão"` e descrição `"Clique numa coluna, clique no campo do site. O vínculo fica salvo para os próximos registros."`
- [ ] Card 03 usa ícone `zap` (cor `var(--green-400)`, quadrado `rgba(91,168,79,0.16)`), título `"Preencha e valide"` e descrição `"Um clique e o formulário é populado. Você confere, envia e marca como concluído."`
- [ ] O título de cada card é renderizado como `<h3>` (hierarquia h2 → h3 correta) e os ícones decorativos estão marcados como `aria-hidden`.
- [ ] No mobile, o grid dos 3 cards colapsa para 1 coluna (cards empilhados, sem overflow horizontal); a faixa de segmentos quebra para múltiplas linhas centralizadas.
- [ ] Nenhuma cor de texto/fundo usa hex cru (exceto as 3 tintas RGBA translúcidas dos quadrados de ícone); tudo via tokens Populatte.
- [ ] As seções permanecem em Espresso Dark independentemente do toggle de tema — os componentes usam os tokens escuros diretamente, sem variantes `dark:` nem estilo condicional por tema.
- [ ] `npm run lint --filter=@populatte/web` e `npm run type-check --filter=@populatte/web` passam para os arquivos criados.

## Dependências

- **`tokens`** — variáveis CSS Populatte (`--espresso-900`, `--espresso-950`, `--latte-50`, `--latte-100`, `--latte-300`, `--gold-400`, `--green-400`, `--mocha-400`, `--border-inverse`) precisam existir em `apps/web/app/globals.css`.
- **`typo-assets`** — fontes Hanken Grotesk, Newsreader (com itálico) e JetBrains Mono carregadas via `next/font` e expostas (variáveis/classes) para uso nos componentes.

Esta issue é consumida posteriormente pelo `shell` (composição na página + lock Espresso Dark) e verificada pela `a11y-qa` (QA responsivo e a11y final cross-section).

## Riscos & observações

- **Travamento do tema:** estas seções não devem reagir ao `next-themes`. O `shell` aplica o lock Espresso Dark no nível do layout de marketing; aqui os componentes apenas consomem os tokens escuros diretamente. Evitar qualquer variante `dark:` ou estilo condicional por tema.
- **Tintas translúcidas:** os fundos dos quadrados de ícone dependem de RGBA sobre `var(--espresso-900)`; substituí-los por tokens sólidos quebraria o efeito visual. Mantê-los literais (`rgba(247,227,189,0.08)`, `rgba(240,178,33,0.14)`, `rgba(91,168,79,0.16)`).
- **Âncora `#como`:** o `id="como"` é alvo dos links da navbar e do footer; não renomear nem mover para um elemento aninhado.
- **Fontes serif:** os segmentos usam Newsreader itálico — garantir que `typo-assets` carrega o estilo itálico real (a fonte do design declara italic para Newsreader), senão o navegador renderiza fake italic.
- **Acentuação e `&`:** preservar caracteres acentuados; em `"RH & Dep. pessoal"` o HTML usa `&amp;`, mas no JSX deve ser `&` literal (ou `{"&"}`) — não escrever `&amp;` no texto renderizado.
- **Sem animação:** diferentemente do hero-mock, estas seções são estáticas; não introduzir keyframes nem transições aqui, portanto não há tratamento de `prefers-reduced-motion` nesta issue.