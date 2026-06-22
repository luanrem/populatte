## Contexto

A Home pública do Populatte é uma landing page de marketing **sempre em Espresso Dark**, desacoplada do toggle claro/escuro (`next-themes`) — a art direction é fixa (decisão 2). Dentro dessa página escura, existe **uma única faixa intencionalmente clara**: a seção "Por que Populatte" + "Casos de uso". Essa clareza é decisão de design (contraste proposital), **não** é o modo claro do tema — ela renderiza igual independentemente do tema travado da aplicação.

Esta sub-issue entrega exatamente essa faixa clara, como componente de marketing isolado em `apps/web/components/marketing/` (diretório novo; `components/ui/` é exclusivo de primitivos shadcn). O componente é montado depois pelo `shell`. Depende das fundações `tokens` (cores/raios/sombras semânticos globais em `app/globals.css`) e `typo-assets` (fontes `Hanken Grotesk`/`Newsreader`/`JetBrains Mono` via `next/font`).

Referência exata: bloco `<!-- POR QUE + CASOS (light contrast band) -->` em `./design/home-espresso-dark.html` (linhas 142–169) e tokens em `./design/tokens.css`.

## Objetivo

Implementar o componente `WhyAndCases` em `apps/web/components/marketing/why-and-cases.tsx`, reproduzindo fielmente as seções "POR QUE" (Bloco A) e "CASOS" (Bloco B) do design — cores via tokens, tipografia, espaçamentos, copy literal, ícones `lucide-react` e comportamento responsivo — com o texto escuro mantendo contraste correto sobre o fundo claro **independentemente** do tema travado da aplicação.

## Escopo

**Inclui:**
- Criação de `components/marketing/why-and-cases.tsx` (a ÚNICA faixa clara da página), exportando `WhyAndCases`.
- **Bloco A — "Por que Populatte":** grid `0.9fr / 1.1fr` — coluna esquerda (eyebrow + `h2` + parágrafo) e coluna direita com grade 2x2 de cards de benefício.
- **Bloco B — "Casos de uso":** wrapper com `id="casos"` (alvo da âncora `#casos` usada por navbar e footer), eyebrow + `h2` centralizados + grade de 4 cards.
- Estilização da faixa: `background: var(--latte-50)`, `color: var(--text-body)`, **fixa por art direction** (nunca via `dark:`/condicional de tema).
- Responsividade dos grids (colapso em telas menores) e redução do padding lateral em telas pequenas.
- Ícones via `lucide-react`.

**Não inclui:**
- Seções escuras de prova social e "Como funciona" (sub-issue `sections-dark`).
- Navbar, hero, FAQ, CTA band, footer (outras sub-issues).
- Definição/mapeamento global de tokens em `globals.css` (sub-issue `tokens`).
- Carregamento de fontes via `next/font` e assets de marca (sub-issue `typo-assets`).
- Composição na página / substituição de `app/page.tsx` (sub-issue `shell`); inclusive o `scroll-margin-top` global para compensar a navbar sticky de `74px`, que pertence ao `shell`/`navbar` (ver Riscos).
- QA responsivo final e auditoria de a11y consolidada (sub-issue `a11y-qa`) — embora fidelidade básica, contraste e foco já sejam critério aqui.

## Referência de design

Fonte: `./design/home-espresso-dark.html`, bloco `<!-- POR QUE + CASOS (light contrast band) -->` (linhas 142–169).

**Faixa (wrapper `<section>`):**
- `background: var(--latte-50)`; `color: var(--text-body)`.
- Container interno: `max-width: 1200px` (= `var(--container-max)`); `margin: 0 auto`; `padding: 88px 56px`.

**Bloco A — "Por que Populatte"** (grid superior, `margin-bottom: 72px`):
- Grid `grid-template-columns: 0.9fr 1.1fr`; `gap: 48px`; `align-items: center`.
- Coluna esquerda:
  - Eyebrow: `font: 600 12px 'Hanken Grotesk'`; `letter-spacing: 0.08em` (= `var(--tracking-caps)`); `text-transform: uppercase`; `color: var(--espresso-500)`; `margin-bottom: 12px`; texto "Por que Populatte".
  - `h2`: `font: 800 36px/1.1 'Hanken Grotesk'`; `letter-spacing: -0.025em`; `color: var(--text-strong)`; texto "Um copiloto, não um robô que você precisa vigiar."
  - Parágrafo: `font: 400 16px/1.6 'Hanken Grotesk'`; `color: var(--text-muted)`; `margin-top: 14px`; texto "Os dados ficam no seu navegador. A extensão só preenche o que você mapeou — e você confere antes de enviar."
- Coluna direita — grade `grid-template-columns: 1fr 1fr`; `gap: 16px` (2x2). Cada card: `background: var(--surface-card)`; `border: 1px solid var(--border-subtle)`; `border-radius: 14px` (= `var(--radius-lg)`); `padding: 22px`; `box-shadow: var(--shadow-xs)`. Estrutura do card: ícone (`width:22px; height:22px; color: var(--espresso-600)`) → título (`font: 700 16px 'Hanken Grotesk'`; `color: var(--text-strong)`; `margin-top: 12px`) → parágrafo (`font: 400 13px/1.5 'Hanken Grotesk'`; `color: var(--text-muted)`; `margin-top: 4px`). Os 4 cards, na ordem:
  - `clock` → "~95% menos tempo" → "O que levava noites agora leva minutos."
  - `target` → "Zero erro de digitação" → "O valor da planilha entra exatamente como está."
  - `lock` → "Seus dados, seu navegador" → "Nada de credenciais no nosso servidor. Conforme a LGPD."
  - `mouse-pointer-click` → "Onde você já trabalha" → "Portais do governo, sistemas internos — sem integração."

**Bloco B — "Casos de uso"** (`<div id="casos">`):
- Eyebrow centralizado: mesmos estilos do eyebrow A (`color: var(--espresso-500)`); `margin-bottom: 14px`; `text-align: center`; texto "Casos de uso".
- `h2` centralizado: `font: 800 34px/1.1 'Hanken Grotesk'`; `letter-spacing: -0.025em`; `color: var(--text-strong)`; `text-align: center`; `margin-bottom: 40px`; texto "Feito para quem preenche em lote."
- Grade de 4 cards: `grid-template-columns: repeat(4, 1fr)`; `gap: 18px`. Cada card: `background: var(--surface-card)`; `border: 1px solid var(--border-subtle)`; `border-radius: 14px` (= `var(--radius-lg)`); `padding: 24px`; `box-shadow: var(--shadow-sm)`. Estrutura: tile de ícone (`width:44px; height:44px; border-radius:10px` (= `var(--radius-md)`); `background: var(--latte-100)`; `display:grid; place-items:center; margin-bottom:14px`) com ícone dentro (`width:22px; height:22px; color: var(--espresso-600)`) → título (`font: 700 17px 'Hanken Grotesk'`; `color: var(--text-strong)`) → parágrafo (`font: 400 13px/1.5 'Hanken Grotesk'`; `color: var(--text-muted)`; `margin-top: 6px`). Os 4 cards, na ordem:
  - `calculator` → "Contabilidade" → "Obrigações acessórias e cadastros em portais fiscais, em massa."
  - `scale` → "Jurídico" → "Peticionamento e cadastros processuais repetitivos."
  - `users` → "RH & Dep. pessoal" → "Admissões, eSocial e cadastros de colaboradores."
  - `landmark` → "BPO financeiro" → "Cadastros bancários e lançamentos para múltiplos clientes."

**Tokens-chave usados:** `var(--latte-50)`, `var(--latte-100)`, `var(--text-body)`, `var(--text-strong)`, `var(--text-muted)`, `var(--surface-card)`, `var(--border-subtle)`, `var(--espresso-500)`, `var(--espresso-600)`, `var(--radius-lg)` (14px), `var(--radius-md)` (10px), `var(--shadow-xs)`, `var(--shadow-sm)`, `var(--tracking-caps)` (0.08em).

**Ícones `lucide-react` necessários** (8): `Clock`, `Target`, `Lock`, `MousePointerClick`, `Calculator`, `Scale`, `Users`, `Landmark`. Todos existem no `lucide-react` (já instalado).

## Arquivos afetados / criados

- **Criado:** `apps/web/components/marketing/why-and-cases.tsx` — componente `WhyAndCases` (React Server Component; conteúdo estático, **sem** `"use client"`). Subcomponentes internos `BenefitCard` e `UseCaseCard` ficam privados no mesmo arquivo (não exportados).
- **Diretório novo:** `apps/web/components/marketing/` (ainda não existe). **Não** criar nada em `components/ui/` (reservado a primitivos shadcn).
- **Consumido depois por:** `apps/web/app/page.tsx` via o `shell` (fora do escopo desta sub-issue).

## Passos de implementação

1. Criar `apps/web/components/marketing/why-and-cases.tsx` exportando o componente nomeado `WhyAndCases`.
2. Importar os ícones de `lucide-react`: `Clock`, `Target`, `Lock`, `MousePointerClick`, `Calculator`, `Scale`, `Users`, `Landmark` (grupo "external packages", conforme a ordem de import do projeto; sem `any`).
3. Renderizar o `<section>` raiz da faixa clara com `background: var(--latte-50)` e `color: var(--text-body)` aplicados de forma **fixa** (via `style` inline com `var(...)` ou utilitários Tailwind que referenciem os tokens) — **sem** condicionar a `.dark`/tema. Garantir que o texto interno herde as cores escuras (não vazar `--latte-*` herdado do escopo escuro pai).
4. Adicionar o container interno (`max-width: var(--container-max)`, `margin: 0 auto`, `padding: 88px 56px`).
5. Implementar o **Bloco A** (grid `0.9fr 1.1fr`, `gap: 48px`, `align-items: center`, `margin-bottom: 72px`): coluna esquerda (eyebrow `var(--espresso-500)` + `h2` "Um copiloto, não um robô que você precisa vigiar." em `var(--text-strong)` + parágrafo em `var(--text-muted)`) e coluna direita com grade 2x2 (`gap: 16px`).
6. Modelar os benefícios como array tipado `readonly` `{ Icon, title, body }` e mapear para `BenefitCard` (cards `var(--surface-card)`, borda `var(--border-subtle)`, raio `var(--radius-lg)`, `box-shadow: var(--shadow-xs)`, ícone `var(--espresso-600)`). Usar a copy literal dos 4 cards na ordem definida.
7. Implementar o **Bloco B** num wrapper com `id="casos"` (necessário para a âncora `#casos`); eyebrow "Casos de uso" + `h2` "Feito para quem preenche em lote." centralizados.
8. Modelar os casos de uso como array tipado e mapear para `UseCaseCard` na grade `repeat(4, 1fr)` / `gap: 18px` (cards `box-shadow: var(--shadow-sm)` e tile de ícone `var(--latte-100)` / `var(--radius-md)`). Usar a copy literal dos 4 cards. Em "RH & Dep. pessoal", renderizar `&` como caractere literal em JSX (texto entre chaves `{"RH & Dep. pessoal"}` ou texto JSX direto — nunca `&amp;`, que é artefato do HTML do design na linha 164).
9. Garantir hierarquia semântica de headings: ambos os `h2` ("Um copiloto…" e "Feito para quem…") como `<h2>`; títulos de card como `<h3>` (no design os títulos de benefício são `<div>`, mas usar `<h3>` melhora a a11y sem alterar o visual — manter os tamanhos/pesos exatos).
10. Aplicar responsividade: Bloco A colapsa `2 → 1` coluna e a grade 2x2 → 1 coluna em breakpoint pequeno; Bloco B colapsa `4 → 2 → 1` colunas progressivamente. Reduzir `padding` lateral em telas pequenas para evitar overflow horizontal.
11. Validar com `npm run lint --filter=@populatte/web` e `npm run type-check` (sem `any`, sem variáveis não usadas; identificadores em inglês, copy em PT-BR).

## Critérios de aceite

- [ ] Componente `WhyAndCases` existe em `apps/web/components/marketing/why-and-cases.tsx` e renderiza sem erros; é Server Component (sem `"use client"`).
- [ ] A faixa usa `background: var(--latte-50)` e `color: var(--text-body)`, e permanece clara **independentemente** do tema da aplicação (testar com `.dark` ativo e inativo: o resultado não muda).
- [ ] Container interno respeita `max-width: 1200px` (`var(--container-max)`) e `padding: 88px 56px` (com redução do padding lateral em telas pequenas).
- [ ] Bloco A: eyebrow "Por que Populatte" em `var(--espresso-500)` com `text-transform: uppercase` e `letter-spacing: 0.08em`; `h2` literal "Um copiloto, não um robô que você precisa vigiar." em `var(--text-strong)`; parágrafo literal em `var(--text-muted)`.
- [ ] Grade de benefícios é 2x2 em desktop, com os 4 cards na ordem e copy exatas: `clock`/"~95% menos tempo", `target`/"Zero erro de digitação", `lock`/"Seus dados, seu navegador", `mouse-pointer-click`/"Onde você já trabalha", e respectivas descrições literais.
- [ ] Cards de benefício usam `var(--surface-card)`, borda `var(--border-subtle)`, raio `var(--radius-lg)` (14px), `box-shadow: var(--shadow-xs)`; ícones em `var(--espresso-600)`.
- [ ] Bloco B tem `id="casos"` e a âncora `#casos` (navbar/footer) rola até ele.
- [ ] Bloco B: eyebrow "Casos de uso" e `h2` "Feito para quem preenche em lote." centralizados; grade de 4 cards na ordem e copy exatas: `calculator`/"Contabilidade", `scale`/"Jurídico", `users`/"RH & Dep. pessoal", `landmark`/"BPO financeiro", e respectivas descrições literais.
- [ ] Cards de casos usam `box-shadow: var(--shadow-sm)` e tile de ícone com `background: var(--latte-100)` e `border-radius: var(--radius-md)` (10px); ícone em `var(--espresso-600)`.
- [ ] "RH & Dep. pessoal" renderiza com `&` literal (sem `&amp;` visível na tela).
- [ ] Responsivo: a grade de benefícios colapsa `2 → 1` coluna e a de casos colapsa `4 → 2 → 1`, sem overflow horizontal em viewports pequenos (≤ 480px).
- [ ] Contraste do texto escuro sobre `var(--latte-50)` atende WCAG AA: `--text-strong` e `--text-body` para texto de corpo, e `--text-muted` ao menos em texto não essencial (verificado pontualmente; auditoria final em `a11y-qa`).
- [ ] Todas as cores e raios citados via tokens (`var(--...)`), sem hex cru no código.
- [ ] `npm run lint --filter=@populatte/web` e `npm run type-check` passam; nenhum uso de `any`; identificadores em inglês, copy em PT-BR.

## Dependências

- **Depende de** `tokens` — as variáveis `--latte-50`, `--latte-100`, `--text-body`, `--text-strong`, `--text-muted`, `--surface-card`, `--border-subtle`, `--espresso-500`, `--espresso-600`, `--radius-lg`, `--radius-md`, `--shadow-xs`, `--shadow-sm`, `--tracking-caps` e `--container-max` precisam estar disponíveis globalmente em `app/globals.css`. Hoje o `globals.css` ainda não define a paleta Populatte (apenas um `--radius-lg: var(--radius)` genérico), por isso esta sub-issue **não pode** entrar antes de `tokens`.
- **Depende de** `typo-assets` — a fonte `Hanken Grotesk` deve estar carregada via `next/font` para a tipografia bater com o design.
- **Consumido por** `shell` (composição na página) e verificado por `a11y-qa` (QA responsivo/a11y final).

## Riscos & observações

- **Faixa clara ≠ modo claro:** o maior risco é alguém amarrar essas cores ao tema. As cores claras devem ser aplicadas de forma fixa (art direction), nunca via `dark:`/condicional de tema. Como o restante da página força Espresso Dark, garantir explicitamente o contraste do texto escuro nesta faixa — em especial não herdar `--latte-200`/texto claro do escopo escuro pai (definir `color` explicitamente nos elementos de texto).
- **Token de surface (verificado em `tokens.css`):** `var(--surface-card)` resolve para `var(--mocha-0)` (`#ffffff`) e **não** há override `.dark` para `--surface-card` no design system de referência. Mesmo assim, como a decisão `tokens` mapeia variantes dark do shadcn, confirmar que nenhum override de `.dark` reescreva `--surface-card`/`--border-subtle`/`--latte-100` dentro desta faixa; se reescrever, aplicar o valor claro localmente para fidelidade.
- **Âncora `#casos` e navbar sticky:** a navbar tem `74px` e é sticky; ao navegar para `#casos` o topo do bloco pode ficar coberto. A correção (`scroll-margin-top` ~ `90px`) é responsabilidade de `shell`/`navbar` (escopo global), **não** desta sub-issue — apenas garantir que o `id="casos"` exista e seja único (alinhar com `shell`/`navbar`/`footer` para não duplicar o `id`).
- **Caractere `&`:** "RH & Dep. pessoal" aparece como `RH &amp; Dep. pessoal` no HTML de design (linha 164); em JSX usar `&` literal — `&amp;` apareceria escapado na tela.
- **Estilos inline vs Tailwind:** o design usa `style` inline com `font:` shorthand e tokens. Em React, preferir utilitários Tailwind v4 que referenciem os tokens; quando inviável (ex.: shorthand `font:` ou referência direta a `var(--...)` sem utilitário mapeado), `style` inline com `var(--...)` é aceitável — mantendo consistência e nunca introduzindo hex cru.
- **Foco/teclado:** esta faixa é estática (sem links/botões próprios), então não há novos focus states aqui; os únicos elementos focáveis da página nesta região são as âncoras externas. Nenhuma animação é introduzida nesta seção, então `prefers-reduced-motion` não se aplica aqui (relevante apenas para `hero-mock`/`navbar`).
- **Sem libs novas:** usar apenas `lucide-react` (ícones) e primitivos já presentes; não adicionar dependências.