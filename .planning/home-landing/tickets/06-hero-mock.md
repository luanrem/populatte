## Contexto

Esta sub-issue faz parte do épico **"Home pública (Landing) — Espresso Dark"** do `apps/web` (Next.js App Router, Tailwind v4 CSS-first, shadcn/ui new-york, Clerk, next-themes, lucide-react, next/font). A Home é uma landing de marketing pública que **substitui a `apps/web/app/page.tsx` atual** e tem art direction **fixa em Espresso Dark** — NÃO segue o toggle claro/escuro do `next-themes`.

O elemento desta issue é o **mock animado de preenchimento** da coluna direita do HERO: um card claro sobre o fundo escuro espresso que ilustra a extensão Populatte preenchendo um formulário campo a campo, com um badge flutuante de "horas economizadas". É puramente ilustrativo/decorativo — reforça a promessa "Você dirige, a extensão preenche" do hero.

Fonte do design (source of truth): `.planning/home-landing/design/home-espresso-dark.html` (bloco `<!-- BRIGHT MOCK on dark -->`, linhas ~79–114, com os `@keyframes` no `<style>`, linhas ~27–41) e `.planning/home-landing/design/tokens.css`.

## Objetivo

Entregar o componente de marketing `HeroMock` — o card claro animado com header de status, 4 linhas de campo preenchidas em sequência e badge flutuante — fiel ao design, **decorativo para leitores de tela** (`aria-hidden`) e que **respeita `prefers-reduced-motion`** congelando no estado final preenchido (sem loops).

## Escopo

**Inclui:**
- Criar o componente `apps/web/components/marketing/hero-mock.tsx` exportando `HeroMock` (a coluna direita do hero, com seu próprio wrapper `position: relative`).
- Wrapper relativo da coluna (`position: relative`) contendo o card + o badge flutuante absoluto. O wrapper NÃO tem `overflow: hidden` (só o card tem), para o badge poder transbordar.
- Card claro: `background: var(--surface-card)`, borda `var(--border-subtle)`, `border-radius: 18px` (`var(--radius-xl)`), sombra forte (`box-shadow: 0 30px 70px rgba(0,0,0,0.45)`), `overflow: hidden`.
- Header do mock (`background: var(--espresso-800)`, `padding: 13px 16px`, `display:flex; align-items:center; gap:10px`, borda inferior `1px solid rgba(255,255,255,0.06)`): quadrado `var(--latte-100)` (28px, radius 8) com o `logo-mark` (`height: 20px`, `alt="Populatte"`), wordmark **"Populatte"** (`font: 700 14px 'Hanken Grotesk'`, cor `var(--latte-50)`), e à direita (`margin-left:auto`) o status com ícone lucide `loader` (`var(--gold-400)`) girando via `popspin 1.1s linear infinite` + texto **"Preenchendo 1 de 6"** (`font: 500 11px 'Hanken Grotesk'`, cor `var(--latte-300)`).
- 4 linhas de campo (label em `Hanken Grotesk`, valor em **`JetBrains Mono`**), cada uma com ícone-chip tintado à esquerda + check à direita:
  - **Razão Social** — chip `var(--success-soft)`, ícone `building-2` (`var(--green-600)`), valor `"Padaria Pão Quente LTDA"` — delay `0s`
  - **CNPJ** — chip `var(--success-soft)`, ícone `hash` (`var(--green-600)`), valor `"12.345.678/0001-90"` — delay `0.9s`
  - **E-mail** — chip `var(--gold-200)`, ícone `mail` (`var(--espresso-700)`), valor `"contato@paoquente.com"` — delay `1.8s`
  - **Município** — chip `var(--latte-200)`, ícone `map-pin` (`var(--espresso-600)`), valor `"Belo Horizonte / MG"` — delay `2.7s`
- Animações escalonadas (delays `0s / 0.9s / 1.8s / 2.7s`, duração `11s`, easing `cubic-bezier(.22,1,.36,1)` = `var(--ease-out)`): `popwash` (borda/fundo da linha), `popfill` (valor entra), `popchk` (check surge).
- Badge flutuante absoluto: `"142h"` (`JetBrains Mono` 800 22px/1, cor `var(--espresso-900)`, `letter-spacing:-0.02em`) + legenda `"economizadas este mês"`, ícone `check-check` (`var(--green-600)`) em chip `var(--success-soft)`, animado com `popfloat 5s ease-in-out infinite`.
- Tratamento de `@media (prefers-reduced-motion: reduce)`: desliga **todas** as animações e fixa cada linha/valor/check no estado final preenchido (verde).
- Marcar o componente como decorativo (`aria-hidden="true"`) para leitores de tela.

**Não inclui:**
- Conteúdo textual da coluna esquerda do hero (badge pill `coffee`, headline serif com `<em>` gold, subcopy, CTAs `zap`/`log-in`, trust line `shield-check`) e o fundo radial do hero → ticket `hero-content`.
- A montagem do grid 2 colunas `1.02fr / 0.98fr` do hero / composição da página → ticket `shell` (o `shell` posiciona o `HeroMock` na coluna direita).
- Definição global da paleta/tokens em `globals.css` e mapeamento das variáveis shadcn → ticket `tokens` (este componente apenas **consome** os tokens).
- Importação de fontes (`JetBrains Mono`, `Hanken Grotesk`, `Newsreader`) via `next/font` e do asset `logo-mark` para `public/` → ticket `typo-assets` (este componente apenas usa os utilitários/variáveis já disponíveis).
- A declaração global dos `@keyframes` (`popfill`, `popwash`, `popchk`, `popspin`, `popfloat`) caso a decisão seja colocá-los em `globals.css` → coordenado com `tokens` (ver Dependências). Esta issue só os **usa**; se a escolha for CSS Module co-localizado, aí sim ela os declara.
- QA responsivo final e auditoria final de a11y → ticket `a11y-qa`.

## Referência de design

Seção do design: **HERO MOCK (animado)** — bloco `<!-- BRIGHT MOCK on dark -->` em `home-espresso-dark.html` (linhas ~79–114) e os `@keyframes` no `<style>` (linhas ~27–41).

**Wrapper da coluna:** `position: relative` (sem `overflow:hidden`).

**Card (interno):**
- `background: var(--surface-card)`; `border: 1px solid var(--border-subtle)`; `border-radius: 18px` (= `var(--radius-xl)`); `box-shadow: 0 30px 70px rgba(0,0,0,0.45)`; `overflow: hidden`.

**Header do mock:**
- `background: var(--espresso-800)`; `padding: 13px 16px`; `display:flex; align-items:center; gap:10px`; `border-bottom: 1px solid rgba(255,255,255,0.06)`.
- Quadrado do logo: 28px, `border-radius: 8px`, `background: var(--latte-100)`, `display:grid; place-items:center`, `logo-mark` com `height:20px`, `alt="Populatte"`.
- Wordmark: `"Populatte"`, `font: 700 14px 'Hanken Grotesk'`, cor `var(--latte-50)`.
- Status (`margin-left:auto`, `display:inline-flex; align-items:center; gap:6px`): ícone `loader` 13px cor `var(--gold-400)` com `animation: popspin 1.1s linear infinite`, seguido do texto `"Preenchendo 1 de 6"` em `font: 500 11px 'Hanken Grotesk'`, cor `var(--latte-300)`.

**Corpo (lista de campos):** `padding: 15px`; `display:flex; flex-direction:column; gap:10px`.

Cada **linha de campo**: `display:flex; align-items:center; gap:11px; padding:11px 13px`; `border:1px solid var(--border-subtle)`; `border-radius:10px` (`var(--radius-md)`); `background: var(--surface-card)`; `animation: popwash 11s cubic-bezier(.22,1,.36,1) infinite {delay}`.
- Ícone-chip: 28px, `border-radius:8px`, `display:grid; place-items:center`, `flex-shrink:0` + ícone lucide 16px (chip/ícone por linha conforme a tabela no Escopo).
- Bloco de texto (`min-width:0`): label `font: 600 13px 'Hanken Grotesk'`, cor `var(--text-strong)`; valor `font: 500 12px 'JetBrains Mono'`, cor `var(--text-muted)`, com `animation: popfill 11s cubic-bezier(.22,1,.36,1) infinite {delay}` (mesmo delay da linha).
- Check (`margin-left:auto`): ícone `check` 17px, cor `var(--green-600)`, `animation: popchk 11s cubic-bezier(.22,1,.36,1) infinite {delay}` (mesmo delay).

Valores literais (em `JetBrains Mono`): `"Padaria Pão Quente LTDA"`, `"12.345.678/0001-90"`, `"contato@paoquente.com"`, `"Belo Horizonte / MG"`. Observação: no design, o `@` do e-mail está envolto em um `<span style="font:inherit">` (provavelmente para evitar ligaduras/kerning estranho); em React, um JSX simples `"contato@paoquente.com"` é suficiente — o `@` pode ficar inline sem precisar do span.

**Badge flutuante** (posicionado relativo ao wrapper da coluna): `position:absolute; right:-16px; bottom:26px`; `background: var(--surface-card)`; `border:1px solid var(--border-subtle)`; `border-radius:14px` (`var(--radius-lg)`); `box-shadow: var(--shadow-lg)`; `padding:12px 15px`; `display:flex; align-items:center; gap:12px`; `animation: popfloat 5s ease-in-out infinite`.
- Chip 38px, `border-radius:10px`, `background: var(--success-soft)`, `display:grid; place-items:center`, ícone `check-check` 20px cor `var(--green-600)`.
- Número `"142h"`: `font: 800 22px/1 'JetBrains Mono'`, cor `var(--espresso-900)`, `letter-spacing:-0.02em`.
- Legenda `"economizadas este mês"`: `font: 500 11px 'Hanken Grotesk'`, cor `var(--text-muted)`.

**Keyframes (definições exatas do design):**
```css
@keyframes popfill {
  0%, 4%    { opacity: 0; transform: translateY(4px); }
  9%        { opacity: 1; transform: translateY(0); }
  90%       { opacity: 1; transform: translateY(0); }
  97%, 100% { opacity: 0; transform: translateY(4px); }
}
@keyframes popwash {
  0%, 5%    { background: var(--surface-card); border-color: var(--border-subtle); }
  7%        { border-color: var(--gold-500); box-shadow: 0 0 0 3px var(--ring-color); }
  11%, 90%  { background: rgba(91,168,79,0.07); border-color: var(--green-400); box-shadow: none; }
  98%, 100% { background: var(--surface-card); border-color: var(--border-subtle); box-shadow: none; }
}
@keyframes popchk {
  0%, 6%    { transform: scale(0); opacity: 0; }
  12%       { transform: scale(1); opacity: 1; }
  92%       { transform: scale(1); opacity: 1; }
  99%, 100% { transform: scale(0); opacity: 0; }
}
@keyframes popspin { to { transform: rotate(360deg); } }
@keyframes popfloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
```
Observação sobre `popwash`: o varrimento vai de neutro (`var(--surface-card)` / `var(--border-subtle)`) → gold (`var(--gold-500)` + ring `box-shadow: 0 0 0 3px var(--ring-color)`) → verde (`rgba(91,168,79,0.07)` / `var(--green-400)`). Reutilizar `var(--ring-color)` dos tokens (= `color-mix(in oklab, var(--gold-500) 55%, transparent)`) em vez de redefinir o glow.

Literais não-tokenizáveis presentes no design (manter como estão, não substituir por hex inventado): `rgba(91,168,79,0.07)` (verde do estado preenchido), `rgba(255,255,255,0.06)` (borda inferior do header), `rgba(0,0,0,0.45)` (sombra do card).

Ícones lucide (todos confirmados pelo REFERENCE.md como existentes em `lucide-react`): `loader`, `building-2`, `hash`, `mail`, `map-pin`, `check`, `check-check`.

## Arquivos afetados / criados

- **Criar:** `apps/web/components/marketing/hero-mock.tsx` — componente `HeroMock`.
- **Possivelmente criar:** `apps/web/components/marketing/hero-mock.module.css` — caso a decisão (coordenada com `tokens`) seja co-localizar os `@keyframes` + a regra `prefers-reduced-motion` específicos do mock em CSS Module, em vez de declará-los em `globals.css`.
- **Possivelmente editar:** `apps/web/app/globals.css` — apenas se a decisão (ticket `tokens`) for declarar os `@keyframes` globalmente. Esta issue não redefine tokens; apenas os consome.
- Consome (não cria): tokens de `app/globals.css` (ticket `tokens`); fontes via `next/font` e asset `logo-mark` em `apps/web/public/` (ticket `typo-assets`).
- **Nada novo em `apps/web/components/ui/`** (reservado a shadcn). Não há primitivo shadcn aplicável a este mock decorativo.

## Passos de implementação

1. Definir, junto com o ticket `tokens`, **onde vivem os keyframes**: (a) em `app/globals.css` (reutilizáveis globalmente) ou (b) em um `hero-mock.module.css` co-localizado. Como o mock é o único consumidor, um CSS Module co-localizado é uma opção limpa e mantém o `@media (prefers-reduced-motion: reduce)` no mesmo lugar dos keyframes. Registrar a escolha na PR.
2. Criar `HeroMock` em `apps/web/components/marketing/hero-mock.tsx`. O markup é estático (animação é puramente CSS), então pode ser **Server Component** (sem `"use client"`). Importar ícones de `lucide-react`. Aplicar `aria-hidden="true"` no elemento raiz, já que é ilustração decorativa.
3. Montar o wrapper relativo da coluna (`position: relative`, sem `overflow:hidden`) contendo o card + o badge flutuante absoluto.
4. Construir o **card**: header (logo-chip + wordmark + status com `loader` girando) e o corpo com as 4 linhas de campo.
5. Implementar as 4 linhas com os chips/ícones, labels e valores literais corretos; aplicar `popwash` na linha, `popfill` no valor e `popchk` no check, com os delays `0s / 0.9s / 1.8s / 2.7s`. Evitar repetição extraindo um sub-componente interno (ex.: `MockField`) com props tipadas (`icon`, `chipColor`, `iconColor`, `label`, `value`, `delay`) — sem `any`.
6. Adicionar o **badge flutuante** (`142h` + `economizadas este mês` + `check-check`) com `popfloat`.
7. Garantir que **todas** as cores e raios usem tokens Populatte (`var(--surface-card)`, `var(--border-subtle)`, `var(--gold-400)`, `var(--green-600)`, `var(--text-strong)`, `var(--text-muted)`, `var(--espresso-700/800/900)`, `var(--latte-100/200/300/50)`, `var(--success-soft)`, `var(--gold-200)`, `var(--radius-md/lg/xl)`, `var(--shadow-lg)`, `var(--ring-color)`) — sem hex cru, exceto os três literais do design listados acima.
8. Implementar `@media (prefers-reduced-motion: reduce)`: zerar `animation` em todas as linhas/valores/checks, no `loader` (`popspin`) e no badge (`popfloat`), e fixar cada linha no **estado final preenchido** = fundo `rgba(91,168,79,0.07)`, borda `var(--green-400)`, `box-shadow:none`; valor visível (`opacity:1; transform:none`); check visível (`transform:scale(1); opacity:1`). Sem loops.
9. Confirmar que `JetBrains Mono` está aplicado aos valores e ao número `142h` (via a variável/utilitário de fonte do ticket `typo-assets`).
10. Verificar visualmente contra o design renderizado e em `prefers-reduced-motion` (DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`).

## Critérios de aceite

- [ ] Existe `apps/web/components/marketing/hero-mock.tsx` exportando `HeroMock`, sob `components/marketing/` (nada novo em `components/ui/`).
- [ ] O wrapper raiz é `position: relative` **sem** `overflow:hidden`; apenas o card interno tem `overflow:hidden`.
- [ ] O card usa `var(--surface-card)`, borda `var(--border-subtle)`, `border-radius: 18px` (`var(--radius-xl)`) e `box-shadow: 0 30px 70px rgba(0,0,0,0.45)`, com `overflow: hidden`.
- [ ] O header mostra o logo-chip `var(--latte-100)` (28px, com `logo-mark` 20px e `alt="Populatte"`), o wordmark "Populatte" (`var(--latte-50)`) e o status "Preenchendo 1 de 6" (`var(--latte-300)`) com o ícone `loader` (`var(--gold-400)`) girando via `popspin 1.1s linear infinite`.
- [ ] As 4 linhas têm os ícones corretos (`building-2`, `hash`, `mail`, `map-pin`), as cores de chip/ícone do design (`success-soft`+`green-600` ×2, `gold-200`+`espresso-700`, `latte-200`+`espresso-600`) e os valores literais em `JetBrains Mono`: "Padaria Pão Quente LTDA", "12.345.678/0001-90", "contato@paoquente.com", "Belo Horizonte / MG".
- [ ] Cada linha anima com `popwash` (linha), `popfill` (valor) e `popchk` (check), todas com duração `11s`, easing `cubic-bezier(.22,1,.36,1)` e delays escalonados `0s / 0.9s / 1.8s / 2.7s` (valor e check com o mesmo delay da respectiva linha).
- [ ] O `popwash` varre a borda/fundo de neutro → gold (com ring `var(--ring-color)`) → verde (`rgba(91,168,79,0.07)` / `var(--green-400)`).
- [ ] O badge flutuante "142h / economizadas este mês" está em `right:-16px; bottom:26px`, com ícone `check-check` (`var(--green-600)`) em chip `var(--success-soft)`, número em `JetBrains Mono` 800 22px (`var(--espresso-900)`), legenda em `var(--text-muted)` e animação `popfloat 5s ease-in-out infinite`.
- [ ] Com `prefers-reduced-motion: reduce` ativo, **nenhuma** animação roda em loop (`popspin`, `popfloat`, `popwash`, `popfill`, `popchk` todas desligadas) e o mock fica congelado no estado final preenchido: valores visíveis, checks visíveis (`scale(1)`), linhas em verde (`rgba(91,168,79,0.07)` / `var(--green-400)`).
- [ ] O mock é decorativo: o elemento raiz tem `aria-hidden="true"` e nenhum texto do mock (labels, valores, "Preenchendo 1 de 6", "142h") é anunciado por leitor de tela; o mock não introduz nenhum alvo focável (sem links/botões reais).
- [ ] Todas as cores/raios vêm de tokens Populatte; os únicos literais cruos são `rgba(91,168,79,0.07)`, `rgba(255,255,255,0.06)` e `rgba(0,0,0,0.45)` (presentes no design).
- [ ] Os `@keyframes` (`popfill`, `popwash`, `popchk`, `popspin`, `popfloat`) estão declarados no local acordado com o ticket `tokens` (globals.css ou CSS Module co-localizado), sem duplicação, e o local está documentado na PR.
- [ ] Em viewport estreita, o card não causa scroll horizontal por causa do badge em `right:-16px` (o wrapper da página tem `overflow:hidden`, mas o empilhamento responsivo do hero é do `shell`/`hero-content`; este componente apenas não deve assumir largura fixa que estoure o container).
- [ ] O componente compila e passa `npm run lint --filter=@populatte/web` e `npm run type-check --filter=@populatte/web` (sem `any`).

## Dependências

- **Depende de `tokens`** — as variáveis Populatte (`--surface-card`, `--border-subtle`, `--gold-200/400/500`, `--green-400/600`, `--latte-50/100/200/300`, `--espresso-600/700/800/900`, `--success-soft`, `--text-strong`, `--text-muted`, `--radius-md/lg/xl`, `--shadow-lg`, `--ring-color`) precisam existir em `app/globals.css`; e a decisão sobre onde declarar os `@keyframes` é coordenada com este ticket.
- **Depende de `typo-assets`** — `JetBrains Mono` e `Hanken Grotesk` via `next/font`, e o asset `logo-mark` em `apps/web/public/`.
- É consumido pelo `shell` (que o posiciona na coluna direita do grid do hero) e convive com o `hero-content` (coluna esquerda). A auditoria final de a11y/responsividade é do `a11y-qa`.

## Riscos & observações

- **Loop infinito vs. performance:** são 12 animações simultâneas em loop (4 × `popwash`/`popfill`/`popchk`) + `popspin` + `popfloat`. Animar apenas `opacity` / `transform` / `background` / `border-color` / `box-shadow` (já é o caso) para manter o trabalho no compositor; evitar propriedades que disparem layout/reflow.
- **`prefers-reduced-motion` é OBRIGATÓRIO** (decisão do épico + critério do `a11y-qa`). O estado congelado deve ser o **final preenchido** (verde, valores e checks visíveis), não o inicial vazio, para que o mock continue legível.
- **Onde ficam os keyframes:** Tailwind v4 é CSS-first (sem `tailwind.config`); declarar via CSS em `globals.css` ou em CSS Module. Alinhar com `tokens` para não duplicar nem conflitar definições.
- **A Home é sempre Espresso Dark** e desacoplada do `next-themes`: este card é intencionalmente claro (`var(--surface-card)`) sobre fundo escuro — não confundir com o "modo claro" do tema, e não envolver o componente em lógica de tema (`useTheme`, `.dark`, etc.).
- **Posicionamento do badge:** `right:-16px` faz o badge transbordar a borda do card; manter o wrapper da coluna **sem** `overflow:hidden` (só o card tem) e validar que não causa scroll horizontal indesejado. O empilhamento responsivo do hero (quando vira 1 coluna) é decidido pelo `shell`/`hero-content`; coordenar para que o badge não vaze a viewport em telas estreitas.
- **`aria-hidden` cobre o subtree:** com `aria-hidden="true"` no raiz, não é necessário adicionar `alt` significativo ao `logo-mark` para a11y (pode ser `alt=""`); manter o markup decorativo e sem foco.
- **Acentuação/copy:** preservar exatamente como no design ("Razão Social", "Município", "Padaria Pão Quente LTDA", "Preenchendo 1 de 6", "economizadas este mês").
- **Idioma:** código/identificadores em inglês (`HeroMock`, `MockField`); copy/UI em PT-BR.