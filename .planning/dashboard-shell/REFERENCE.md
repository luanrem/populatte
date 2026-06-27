# App Shell do Dashboard — REFERENCE

Análise, decisões e mapa de tickets do épico **App Shell do Dashboard** (chrome do app
autenticado: sidebar + header + rotas navegáveis). Espelha a prática de
`.planning/home-landing/`. **Fonte de verdade dos specs = Linear** (POP-47 + sub-issues);
este arquivo é o resumo local para execução.

- **Épico Linear:** [POP-47](https://linear.app/populatte/issue/POP-47) — time Populatte, projeto Piloto RAL
- **Design (source of truth visual):** https://claude.ai/design/p/1a97966a-4217-4773-a3f6-94e730d7b31c?file=Populatte+Dashboard.dc.html
- **Markup salvo:** `design/dashboard-shell.html`
- **Escopo:** chrome + roteamento. **NÃO** inclui construir o conteúdo das páginas Dashboard/Projetos.

---

## 1. Decisões travadas (com o usuário, 2026-06-22)

1. **Projeto Linear = Piloto RAL** (time Populatte, key POP).
2. **Escopo = chrome + rotas navegáveis**, não o conteúdo de Dashboard/Projetos (tickets futuros).
3. **Header global no layout** `(platform)/layout.tsx`: deriva título + breadcrumb da rota via
   config central; páginas dinâmicas dão override via contexto (`usePageHeader`). As páginas que
   hoje renderizam `<AppHeader>` migram para fora dele.
4. **Ajuda e Configurações = rotas placeholder** (`/help`, `/settings`) com `PagePlaceholder`.
5. **Busca, sino e "Novo projeto" = desabilitados + tooltip "em construção"** (sem backend ainda).
6. **Onboarding (Tutorial) e Cores saem da navegação de produção** (rotas mantidas e acessíveis):
   onboarding é acessado pelo checklist de ativação; `/colors` é rota de dev.

---

## 2. Estado atual do código (apps/web)

- `app/(platform)/layout.tsx` **já existe**: `SignedIn > SidebarProvider > AppSidebar + {children}`.
- `components/layout/app-sidebar.tsx` = **layout antigo** (emoji 🎨, lista plana
  Dashboard/Projetos/Mapeamentos/Equipe/Assinatura/Tutorial/Cores, rodapé Clerk + "Sair").
- `components/layout/app-header.tsx` = header **por página** (`title` + children), incluído dentro
  de cada `page.tsx`.
- **Rotas existentes** sob `(platform)`: `dashboard`, `projects` (+ `[id]`, `+ batches/[batchId]`),
  `mappings` (+ `[mappingId]`), `team`, `billing`, `onboarding`.
- **Tokens + fontes já globais** (POP-38 / POP-37): paleta café + aliases semânticos
  (`--surface-*`, `--text-*`, `--border-*`, `--shadow-*`) + Hanken/Newsreader/JetBrains em
  `globals.css` + `@theme inline`. Marca: `public/brand/logo-mark.{png,svg}` +
  `components/marketing/logo.tsx` (lockup, hoje pintado para **fundo escuro**).
- ⇒ **Sem ticket de tokens/tipografia neste épico.**

### Páginas que renderizam `<AppHeader>` hoje (a migrar no shell-integration)
`dashboard`, `projects`, `projects/[id]`, `mappings`, `team`, `billing`, `onboarding`
(+ `colors/page.tsx` e `colors/layout.tsx`, que ficam **fora** do `(platform)` e têm
`SidebarProvider` próprio — só garantir que não quebram).

---

## 3. Anatomia do design (chrome)

### Sidebar — `<aside>` 248px, `bg var(--surface-card)`, `border-right var(--border-subtle)`
- **Lockup** (padding `18px 18px 16px`): mark `assets/logo-mark.png` ~34px + "Populatte"
  (Hanken 800/17px, tracking -0.02em, `--text-strong`) + "num gole de café" (Newsreader **itálico**
  12px, `--espresso-500`, margin-top 3px).
- **Grupo "Workspace"** (label 600/11px uppercase tracking .08em `--text-subtle`, padding `10px 12px 6px`):
  Dashboard · Projetos · Mapeamentos · Equipe · Assinatura.
- **Grupo "Suporte"** (mesmo label, padding-top 18px): Ajuda · Configurações.
- **Item** (`padding:9px 12px`, `radius:10px`, gap 11px, ícone 18px):
  - ativo: 600/14px, `--espresso-900` sobre **`--latte-100`**, ícone `--espresso-700`.
  - inativo: 500/14px `--text-body`, ícone `--mocha-500`, hover `--mocha-50`.
- **Medidor de uso** (`margin:0 12px 8px`, padding `13px 14px`, radius 12px, `bg --latte-50`, border subtle):
  linha "Preenchimentos" (600/12px) + "8.412 / 10k" (JetBrains Mono, `--espresso-600`);
  barra h6 track `--mocha-100` + fill 84% `--gold-500`; rodapé "Renova em 11 dias · Plano Pro"
  (500/11px `--text-muted`).
- **Rodapé de usuário** (padding 12px, border-top subtle): avatar 36px círculo `bg --gold-200`
  iniciais `--espresso-700`; nome 600/14px `--text-strong`; e-mail 400/12px `--text-muted`;
  badge "Pro" (tom accent/soft).

### Header — `<header>` 60px, sticky, `border-bottom subtle`, fundo `surface-page 80%` + `blur(8px)`
- **Esquerda** (coluna gap 1px): breadcrumb "Acme Contabilidade › Workspace" (500/12px `--text-muted`,
  chevron-right 13px) + título "Dashboard" (700/20px `--text-strong`, tracking -0.02em).
- **Direita** (gap 12px):
  - **Busca**: 38px × 248px, `bg --surface-card` border-default radius 10px; ícone `search` 16px
    `--text-subtle`; placeholder "Buscar projetos, planilhas…"; kbd "/" (mono 11px, `bg --mocha-50`).
  - **Sino**: botão 38×38 radius 10px `bg --surface-card` border-default; `bell` 18px `--mocha-500`;
    dot 7px `--gold-500`.
  - **"Novo projeto"**: 38px, padding `0 16px`, radius 10px, `bg --espresso-900` texto `--latte-50`,
    `plus` 16px, 600/14px; hover `--espresso-800`.

---

## 4. Mapeamento design-token → utilitário Tailwind

Tokens já existem em `globals.css`. **Nunca hex cru.** O design usa `var(--…)` cru; em código,
preferir o utilitário semântico (ou o ramp exposto).

| Design (`var(--…)`) | Utilitário Tailwind | Observação |
| --- | --- | --- |
| `--surface-page` | `bg-background` | fundo da área de conteúdo |
| `--surface-card` | `bg-card` / `bg-sidebar` | superfície de sidebar/cards |
| `--border-subtle` | `border-border` | borda padrão (`--border`) |
| `--border-default` | `border-input` | bordas de inputs/botões do header |
| `--text-strong` | `text-foreground` | títulos |
| `--text-body` | `text-mocha-800` | corpo (não há semântico exato) |
| `--text-muted` | `text-muted-foreground` | exato (= `--text-muted`) |
| `--text-subtle` | `text-mocha-400` | labels/placeholder |
| `--espresso-900` | `bg-primary` / `text-espresso-900` | "Novo projeto", item ativo |
| `--espresso-700/600/500` | `text-espresso-700/600/500` | ícones/tagline |
| `--gold-500` | `bg-gold` / `bg-gold-500` | barra de uso, dot, CTA gold |
| `--latte-50` | `bg-latte-50` / `text-latte-50` | card do medidor / texto sobre espresso |
| `--latte-100` | `bg-latte-100` | **item ativo** (preferir ao `bg-sidebar-accent`=latte-200) |
| `--latte-200` | `bg-sidebar-accent` | default do primitivo p/ item ativo |
| `--mocha-50/100` | `bg-mocha-50/100` | hover / tracks |
| `--gold-200` | `bg-gold-200` | avatar |
| status `--success-soft/-text`, `--info-soft/-text` | `bg-success-soft text-success-text`, … | KPIs/pills (conteúdo futuro) |

Ícones lucide: `layout-dashboard, folder-kanban, git-compare-arrows, users, credit-card,
life-buoy, settings, search, bell, plus, chevron-right, zap`.

---

## 5. Inventário de rotas (alvo)

| Item de menu | Grupo | Rota | Estado hoje | Ação |
| --- | --- | --- | --- | --- |
| Dashboard | Workspace | `/dashboard` | existe (placeholder) | mantém conteúdo |
| Projetos | Workspace | `/projects` | existe | mantém conteúdo |
| Mapeamentos | Workspace | `/mappings` | existe | mantém conteúdo |
| Equipe | Workspace | `/team` | existe (placeholder) | mantém conteúdo |
| Assinatura | Workspace | `/billing` | existe (placeholder) | mantém conteúdo |
| Ajuda | Suporte | `/help` | **não existe** | **criar** placeholder (POP-49) |
| Configurações | Suporte | `/settings` | **não existe** | **criar** placeholder (POP-49) |
| — (fora do menu) | — | `/onboarding` | existe | rota mantida, sai do menu |
| — (dev, fora do menu) | — | `/colors` | existe | rota mantida, sai do menu |

Público (sem chrome do app): `/` (Home), `/sign-in`, `/sign-up`, `/extension/connect`,
`/unauthorized`.

---

## 6. Arquitetura (clean)

- **Config/dados fora dos componentes:** navegação + metadados de rota em `lib/navigation/`
  (puro, sem JSX). Componentes de chrome são **apresentacionais** (props in, callbacks out).
- **shadcn como blocos:** `Sidebar`/`SidebarProvider`, `Progress`, `Badge`, `Tooltip`,
  `Breadcrumb`, `Input`, `Button`, `DropdownMenu`. Primitivos só em `components/ui/`; chrome em
  `components/layout/`.
- **Header no layout** + `PageHeaderProvider`/`usePageHeader` para títulos/breadcrumbs dinâmicos.
- Identificadores/código em **inglês**; copy/UI em **PT-BR**. Light-only. Sem libs novas.

### Árvore-alvo do shell (`(platform)/layout.tsx`)
```
<SignedIn>
  <SidebarProvider>
    <AppSidebar />                  {/* nav-config + medidor + usuário */}
    <SidebarInset>
      <PageHeaderProvider>
        <AppHeader />               {/* breadcrumb+título derivados; ações desabilitadas */}
        <main>{children}</main>
      </PageHeaderProvider>
    </SidebarInset>
  </SidebarProvider>
</SignedIn>
```

---

## 7. Mapa de tickets (Linear POP-47)

| # | Linear | Ticket | Prioridade | Depende de (blockedBy) |
| --- | --- | --- | --- | --- |
| — | [POP-47](https://linear.app/populatte/issue/POP-47) | **Épico** — App Shell do Dashboard | High | — |
| 01 | [POP-48](https://linear.app/populatte/issue/POP-48) | `[nav-config]` config central de navegação + metadados de rota | High | — |
| 02 | [POP-49](https://linear.app/populatte/issue/POP-49) | `[routes]` rotas faltantes & placeholders (`/help`, `/settings`) | Medium | — |
| 03 | [POP-50](https://linear.app/populatte/issue/POP-50) | `[sidebar]` reconstruir `AppSidebar` fiel ao design | High | POP-48, POP-49 |
| 04 | [POP-51](https://linear.app/populatte/issue/POP-51) | `[header]` header global + contexto de override | High | POP-48 |
| 05 | [POP-52](https://linear.app/populatte/issue/POP-52) | `[shell-integration]` montar shell + migrar páginas | High | POP-49, POP-50, POP-51 |
| 06 | [POP-53](https://linear.app/populatte/issue/POP-53) | `[qa]` paridade visual, a11y, responsivo, checagem final | Medium | POP-48..52 |

### Ordem recomendada (fazer um a um)
1. **POP-48** e **POP-49** em paralelo (fundação: config + rotas).
2. **POP-50** (sidebar) e **POP-51** (header) em paralelo — dependem da fundação.
3. **POP-52** (integração) — amarra tudo e migra as páginas.
4. **POP-53** (QA) — porteira final.

---

## 8. Riscos

- **Migração header per-page → global** (POP-52): 7+ páginas, incl. dinâmicas com breadcrumb de
  nome de projeto. Mitigação: `usePageHeader` + `grep AppHeader` + smoke test rota a rota.
- **`Logo` é para fundo escuro** (wordmark `--latte-50`): a sidebar é clara → variante de cor.
- **Dados do medidor/header são placeholder** (sem backend de billing/notificações): manter
  props-driven.
- **`/colors` tem `SidebarProvider` próprio:** não quebrar ao mexer no chrome.
- **Active bg latte-100 vs sidebar-accent (latte-200):** preferir o valor do design (latte-100).

## 9. Fora de escopo (follow-ups futuros)
Conteúdo da página Dashboard (greeting/KPIs/projetos recentes/atividade), conteúdo da página
Projetos, busca real, central de notificações, criação de projeto pelo header, dados reais de
uso/plano e de workspace (breadcrumb raiz). Abrir como tickets novos — não estender este épico.
