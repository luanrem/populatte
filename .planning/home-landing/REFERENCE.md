# Home pública (Landing) — Espresso Dark · Documento de referência

Fonte do design: projeto **Populatte Design** em claude.ai/design.
URL: https://claude.ai/design/p/1a97966a-4217-4773-a3f6-94e730d7b31c?file=Populatte+Home+-+Espresso+Dark.dc.html
Arquivos locais (source of truth):
- `./design/home-espresso-dark.html` — markup/inline-styles/copy exatos do alvo
- `./design/tokens.css` — tokens do design system (cores, tipografia, espaçamento, elevação)

> Esta página é uma **landing page de marketing pública** que substitui a `apps/web/app/page.tsx` atual.

---

## Decisões do produto (travadas pelo usuário em 2026-06-21)

1. **Projeto Linear:** o épico e as sub-issues ficam no projeto **Piloto RAL** (time Populatte, key POP).
2. **Tema da Home:** **sempre Espresso Dark.** A Home NÃO segue o toggle claro/escuro (next-themes). A art direction é fixa — fundo escuro espresso com UMA faixa clara intencional (seção "Por que + Casos de uso"). A faixa clara faz parte do design, não é o modo claro do tema.
3. **Tokens:** **adotar globalmente já.** Os tokens Populatte (ramps espresso/latte/gold/green/mocha/terra + aliases semânticos + raios/sombras/ring/motion) substituem a paleta OKLCH genérica em `apps/web/app/globals.css`, mapeando as variáveis semânticas do shadcn (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--ring`, `--sidebar-*`, `--chart-*`) para light e dark. Isso re-skinna o dashboard existente → exige smoke test visual das telas atuais.
4. **CTAs auth-aware (Clerk):** quando o usuário está logado, "Entrar/Começar grátis" viram "Ir para o Dashboard". Deslogado mostra Entrar (`/sign-in`) e Começar grátis (`/sign-up`). Manter o comportamento atual da page.tsx.

---

## Estado atual do `apps/web` (relevante)

- **Next.js App Router**, **Tailwind v4** (CSS-first, `@import "tailwindcss"` + `@theme inline` em `app/globals.css`; sem `tailwind.config`). **PostCSS** com `@tailwindcss/postcss`.
- **shadcn/ui** (style "new-york", base "slate", `components.json` presente, alias `@/components/ui`). Já instalados: button, card, badge, dialog, dropdown-menu, input, label, popover, select, separator, sheet, sidebar, skeleton, sonner, switch, table, textarea, tooltip, progress, collapsible, command, breadcrumb, alert-dialog, form, toggle, toggle-group. **NÃO há `accordion`** (precisa adicionar para o FAQ).
- **next-themes** já configurado (`components/theme/theme-provider.tsx`, `components/theme/mode-toggle.tsx`), `.dark` class. ThemeProvider no `app/layout.tsx`.
- **Fontes atuais:** Geist Sans/Mono via `next/font`. **Faltam** Hanken Grotesk, Newsreader, JetBrains Mono.
- **Ícones:** `lucide-react` instalado (todos os ícones do design existem no lucide-react: coffee, zap, log-in, shield-check, loader, building-2, hash, mail, map-pin, check, check-check, file-spreadsheet, git-compare-arrows, clock, target, lock, mouse-pointer-click, calculator, scale, users, landmark, chevron-down, arrow-right).
- **Auth:** Clerk. Rotas `/sign-in` e `/sign-up` existem (catch-all). `app/page.tsx` atual já usa `SignedIn/SignedOut/SignInButton/SignUpButton`.
- **Assets:** `apps/web/public/` só tem SVGs default do Next. **Sem logo Populatte.** No projeto de design existem `assets/logo-full.svg` e `assets/logo-mark.png` (precisam ser trazidos para `public/`).
- **`app/page.tsx` atual:** já é uma landing simples (hero + features + benefits + CTA + footer) com copy diferente — será **substituída** por esta implementação fiel ao design.
- Existe uma rota dev `app/colors/page.tsx` (preview de cores) — pode servir de referência ao mapear tokens.
- Convenção de componentes (CLAUDE.md): `components/ui/` é exclusivo do shadcn; criar componentes de marketing em **`apps/web/components/marketing/`** (novo diretório). Código/identificadores em inglês; UI/copy em PT-BR.

---

## Estrutura da página (breakdown por seção — ver HTML para valores exatos)

Largura de conteúdo: `max-width:1200px`, padding lateral `56px` (FAQ usa `max-width:780px`). Fundo global `var(--espresso-950)`, texto base `var(--latte-200)`.

1. **NAV (sticky)** — `height:74px`, `position:sticky; top:0; z-index:50`, borda inferior `--border-inverse`, fundo `color-mix(in oklab, var(--espresso-950) 82%, transparent)` + `backdrop-filter:blur(10px)`. Esquerda: logo-mark em quadrado `--latte-100` (36px, radius 10) + wordmark "Populatte". Centro: links âncora "Como funciona" (#como), "Casos de uso" (#casos), "Dúvidas" (#faq). Direita: "Entrar" (ghost) + "Começar grátis" (gold pill). **Sem mode-toggle.** Mobile: o design não define menu mobile → definir comportamento (ex.: Sheet/hambúrguer).
2. **HERO** — grid 2 colunas `1.02fr / 0.98fr`, gap 52, padding `80px 56px 72px`. Fundo: dois `radial-gradient` (gold em 76%/22%, green em 12%/90%). Coluna esquerda: badge pill (ícone `coffee` + "Do Excel para a Web, num gole de café"), `h1` 60px com `<em>` serif itálico gold ("Tome um café"), parágrafo 19px, dois CTAs (Começar gratuitamente — gold com shadow; Entrar — outline), linha de confiança (ícone shield-check + "Sem cartão de crédito · Conforme a LGPD · Configuração em 2 minutos"). Coluna direita: **mock animado** (ver abaixo).
3. **HERO MOCK (animado)** — card claro `--surface-card` sobre o fundo escuro. Header do mock: logo + "Populatte" + status "Preenchendo 1 de 6" com `loader` girando (`popspin`). Corpo: 4 linhas de campo (Razão Social, CNPJ, E-mail, Município) com ícone, label, valor em `JetBrains Mono` e check. Animações escalonadas (delays 0s/0.9s/1.8s/2.7s, duração 11s): `popwash` (borda/fundo varrendo de neutro→gold→verde), `popfill` (valor aparecendo), `popchk` (check surgindo). Badge flutuante absoluto "142h economizadas este mês" com `check-check` e `popfloat` (5s). **Respeitar `prefers-reduced-motion`.**
4. **SEGMENTOS (faixa de prova social)** — faixa com bordas top/bottom `--border-inverse`. "Confiado por equipes em" (eyebrow) + 4 segmentos em serif itálico 20px: Contabilidades, Escritórios jurídicos, RH & Dep. pessoal, BPO financeiro. `flex-wrap`, centralizado.
5. **COMO FUNCIONA (#como, dark)** — eyebrow gold "Como funciona" + h2 "Três passos. Nenhuma madrugada digitando." + grid 3 cards (fundo `--espresso-900`, borda `--border-inverse`, radius 16, padding 28). Cada card: número mono ("01/02/03") gold, ícone em quadrado tintado (file-spreadsheet / git-compare-arrows / zap), título, descrição.
6. **POR QUE + CASOS (faixa CLARA)** — `background:var(--latte-50)`, `color:var(--text-body)`. Bloco A "Por que Populatte": grid `0.9fr/1.1fr`, esquerda (eyebrow + h2 "Um copiloto, não um robô que você precisa vigiar." + parágrafo), direita 2x2 de cards de benefício (clock ~95% menos tempo; target Zero erro de digitação; lock Seus dados, seu navegador; mouse-pointer-click Onde você já trabalha). Bloco B "#casos": eyebrow + h2 "Feito para quem preenche em lote." + grid 4 cards (calculator Contabilidade; scale Jurídico; users RH & Dep. pessoal; landmark BPO financeiro).
7. **FAQ (#faq, dark)** — `max-width:780px`. eyebrow gold + h2 "Antes de começar" + 4 itens accordion (`<details>` no design): "Preciso instalar uma extensão?", "Quais formatos de planilha são aceitos?", "O Populatte preenche sozinho, sem mim?", "Meus dados ficam guardados em algum servidor?". Chevron gira ao abrir.
8. **CTA BAND** — caixa radius 24, `background:linear-gradient(135deg, var(--espresso-800), var(--espresso-950))`, borda `--border-inverse`, radial gold overlay + watermark "☕" gigante (200px, serif, `rgba(247,227,189,0.06)`). h2 "Pronto para economizar *horas* de trabalho?" (em serif gold) + parágrafo + 2 CTAs (Começar agora — é grátis / Já tenho conta).
9. **FOOTER** — borda top `--border-inverse`. Grid `1.4fr/1fr/1fr/1fr`: marca + tagline; coluna Produto (#como/#casos/#faq); Empresa (Sobre/Contato/Blog — `#` placeholder); Legal (Privacidade (LGPD)/Termos — `#` placeholder). Barra inferior com copyright "© 2026 Populatte · Transformando Excel em automação, um formulário por vez."

### Animações (keyframes do design)
`popfill`, `popwash`, `popchk`, `popspin`, `popfloat` — definições exatas no `<style>` do HTML. Em Tailwind v4 declarar via `@theme`/`@keyframes` em globals.css ou CSS module do hero-mock. Tudo deve degradar com `@media (prefers-reduced-motion: reduce)` (mostrar estado final preenchido, sem loop).

---

## Mapa de tickets (épico + 10 sub-issues)

Time: **Populatte** · Projeto: **Piloto RAL**. Labels válidas: `Web`, `UI/UX`, `Feature`, `Improvement` (+ área: API, Extension, etc., não usadas aqui).

| key | título | labels | prioridade | depende de |
|-----|--------|--------|-----------|-----------|
| `tokens` | Fundação: tokens/paleta Populatte globais (globals.css + Tailwind v4) | Web, UI/UX | High | — |
| `typo-assets` | Fundação: tipografia (next/font) + assets de marca (logo) | Web, UI/UX | High | — |
| `shell` | Shell da Home: rota, layout marketing (lock Espresso Dark), metadata/SEO, CTAs auth-aware, composição | Web, Feature | High | tokens, typo-assets |
| `navbar` | Navbar marketing: sticky + blur + responsivo (menu mobile) | Web, UI/UX | Medium | tokens, typo-assets |
| `hero-content` | Hero: conteúdo (badge, headline serif, subcopy, CTAs, trust line) + fundo radial | Web, UI/UX | Medium | tokens, typo-assets |
| `hero-mock` | Hero: mock animado de preenchimento + badge flutuante (prefers-reduced-motion) | Web, UI/UX | Medium | tokens, typo-assets |
| `sections-dark` | Seções escuras: faixa de segmentos + "Como funciona" (3 passos) | Web, UI/UX | Medium | tokens, typo-assets |
| `sections-light` | Faixa clara: "Por que Populatte" (benefícios) + "Casos de uso" | Web, UI/UX | Medium | tokens, typo-assets |
| `faq-cta-footer` | FAQ (accordion) + CTA final + Footer | Web, UI/UX | Medium | tokens, typo-assets |
| `a11y-qa` | A11y, prefers-reduced-motion e QA responsivo final | Web, UI/UX | Medium | shell, navbar, hero-content, hero-mock, sections-dark, sections-light, faq-cta-footer |

Observações de dependência: `tokens` e `typo-assets` são fundação e bloqueiam o resto. As seções (navbar, hero-*, sections-*, faq-cta-footer) podem ser construídas como componentes em paralelo e são montadas pelo `shell`. `a11y-qa` é a verificação final e depende de todas as seções.

---

## Template OBRIGATÓRIO da descrição de cada sub-issue (PT-BR, Markdown)

```
## Contexto
## Objetivo
## Escopo
**Inclui:** ...
**Não inclui:** ...
## Referência de design
(seção(ões) do design, valores-chave: cores via tokens, tamanhos, espaçamentos, copy literal, nomes de ícones lucide)
## Arquivos afetados / criados
(caminhos concretos sob apps/web; nomes de componentes em components/marketing/...)
## Passos de implementação
(numerados, concretos)
## Critérios de aceite
- [ ] (cada um testável; fidelidade ao design + responsividade + a11y quando aplicável)
## Dependências
## Riscos & observações
```

Regras de redação:
- Português do Brasil na prosa; código/caminhos/identificadores em inglês.
- Citar valores do design via tokens Populatte (`var(--gold-500)`, `--espresso-950`) — não hex cru.
- Respeitar as 4 decisões acima.
- Componentes de marketing em `apps/web/components/marketing/`; primitivos só em `components/ui/` (shadcn).
- Não inventar libs novas além do que já existe (shadcn, lucide-react, next/font, Clerk, next-themes).
