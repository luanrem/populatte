# Projects List Page — REFERENCE

Feature guarda-chuva: **POP-55 — Página de Projetos — redesign da lista + multi-URL**
https://linear.app/populatte/issue/POP-55

> Fonte única de spec = Linear. Este arquivo é índice + decisões + estado do código + anatomia do design + mapa de tickets. **Não** espelha as specs dos tickets.

## O que é

Redesign da página geral `/projects` do dashboard Web para fidelidade ao design `Populatte Projetos.dc.html`, + introdução de **multi-URL** por projeto. A página **já existe e já consome a API real** — isto é redesign, não construção do zero.

- Design (lista, fonte de verdade): https://claude.ai/design/p/1a97966a-4217-4773-a3f6-94e730d7b31c?file=Populatte+Projetos.dc.html
- Design (detalhe, **fora de escopo** — só fronteira): https://claude.ai/design/p/1a97966a-4217-4773-a3f6-94e730d7b31c?file=Populatte+Projeto+Detalhe.dc.html
- Cópia local do design: `./design/projetos.html`

## Decisões travadas (com o usuário, 2026-06-23)

1. **Escopo** = lista + toolbar + modais (criar/editar/excluir). Página de **detalhe** (`/projects/[id]`) **fora** (outra thread). O card só navega para o detalhe.
2. **Card "UI primeiro, dados depois"**: visual fiel; **progresso, avatares de membros e "atualizado há…" são placeholder/derivado**; dados reais = follow-up. Card é Web/apresentacional.
3. **Multi-URL agora** (só o necessário para esta página): `Project.targetUrl` (string) → **`Project.urls[]`** com uma principal, **substituição + migração**. Mapeamento dado↔URL = futuro (detalhe/extensão).
4. **Busca reativada no header global** para `/projects` (via page-header context); **abas** Todos/Ativos/Arquivados na toolbar; **sem toggle grade/lista** (removido) — só grade.
5. **Bugs dentro da feature**: POP-54 = `[contrast]` (F1, feito antes); POP-13 resolvido por `[card]`; **POP-22 relacionada** (dado de progresso real, adiado).
6. **Convenções**: tokens café (nunca hex), light-only, componentes apresentacionais (dados em `lib/query`), shadcn como base, código em inglês / copy pt-BR, pnpm por app.

## Achado-chave que reduziu risco

A extensão lê **`Mapping.targetUrl`** (tabela `mappings`, prefix-match em `drizzle-mapping.repository.ts:73`), **não** `Project.targetUrl`. Logo, trocar `Project.targetUrl → urls[]` **não toca a extensão**. (Confirmado por grep — ver inventário abaixo.)

## Estado do código (inventário)

**Web (`apps/web`)** — página já funcional, ligada à API:
- Rota: `app/(platform)/projects/page.tsx` (client; tem um botão "Novo projeto" standalone a remover)
- Componentes: `components/projects/{project-grid,project-card,project-empty-state,project-form-dialog,delete-project-dialog}.tsx`
- Dados: `lib/query/hooks/use-projects.ts` (`useProjects`/`useProject`/create/update/delete), `lib/api/endpoints/projects.ts`, `lib/api/schemas/project.schema.ts` (`status: active|archived`, **`targetUrl` único**)
- Shell (POP-47): `components/layout/app-header.tsx` + page-header context; nav em `lib/navigation/nav-config.ts`
- Tokens: `app/globals.css` (café + status `-soft`/`-text`). Mapa token→Tailwind: `.planning/dashboard-shell/REFERENCE.md`
- **Não existem ainda**: `StatusBadge`/`ProgressMeter`/`UrlChip` em `components/ui/`; rota `/design-system`

**API (`apps/api`)** — alvo do `[api-urls]` (Project.targetUrl → urls[]):
- Core: `core/entities/project.entity.ts`, `core/repositories/project.repository.ts`, `core/use-cases/project/{create,update,get,list,delete}-project.use-case.ts`
- Infra: `infrastructure/database/drizzle/schema/projects.schema.ts` (`target_url text`), `mappers/project.mapper.ts`, `repositories/drizzle-project.repository.ts`
- Presentation: `presentation/dto/project.dto.ts`, `controllers/project.controller.ts`
- Testes: `apps/api/test/integration/*project*`
- Migrations: **sem pasta versionada** (provável `drizzle-kit push`); DB local docker :5433

## Anatomia do design (lista)

Chrome já pronto (sidebar 248px + header 60px). Conteúdo `max-width:1180px`:
1. **Intro row**: H2 "Seus projetos" + subcopy "{ativos} ativos · {arquivados} arquivados".
2. **Toolbar**: esquerda = abas segmentadas Todos/Ativos/Arquivados (com contagem mono; ativo espresso-900/latte-50); direita = label "N projetos". (Sem toggle grade/lista.)
3. **Grade** 3 col. **Card**: top (nome truncado + pill "Arquivado" + kebab → Editar/Arquivar/Excluir); descrição 2-linhas; badges (StatusBadge + entity chip espresso-100 + UrlChip "N URLs"); progress block (label + %/— + barra colorida por status: done=success, ready/0=mocha-300, senão gold); footer (avatares iniciais + "atualizado há…"). Hover shadow+translateY; arquivado opacity .72. **Tile "Novo projeto"** (dashed, hover gold) na última célula.
4. **Status do card** (lifecycle de preenchimento): `filling`/`done`/`ready`/`pending` (≠ flag archive). Na v1 derivado provisoriamente de `active|archived` + sinais existentes (progresso real adiado).
5. **3 empty states**: sem projetos / sem busca (`search-x`, "Limpar busca") / sem arquivados (`archive`, "Ver ativos").
6. **Modal criar/editar** (radius xl): Nome* (focus gold), Descrição, Entidade alvo, **URLs do formulário** (lista add/remove, "principal"/star, input mono, count pill), submit **gold**.
7. **Modal excluir** (terra): nomeia o projeto + "não pode ser desfeita".

## Mapa de tickets (ordem topológica = ordem recomendada)

| Ordem | Ticket | Fase | Depende de (blockedBy) | Link |
|------|--------|------|------------------------|------|
| 1 | POP-56 `[api-urls]` | F1 Fundação | — | https://linear.app/populatte/issue/POP-56 |
| 2 | POP-54 `[contrast]` | F1 Fundação | — | https://linear.app/populatte/issue/POP-54 |
| 3 | POP-57 `[primitives]` | F1 Fundação | — | https://linear.app/populatte/issue/POP-57 |
| 4 | POP-59 `[card]` | F2 Peças | POP-56, POP-57, POP-54 | https://linear.app/populatte/issue/POP-59 |
| 5 | POP-60 `[toolbar]` | F2 Peças | POP-57 | https://linear.app/populatte/issue/POP-60 |
| 6 | POP-61 `[modals]` | F2 Peças | POP-56 | https://linear.app/populatte/issue/POP-61 |
| 7 | POP-58 `[header-search]` | F3 Integração | — | https://linear.app/populatte/issue/POP-58 |
| 8 | POP-62 `[integration]` | F3 Integração | POP-59, POP-60, POP-61, POP-58 | https://linear.app/populatte/issue/POP-62 |
| 9 | POP-63 `[qa]` | F4 QA | POP-62 | https://linear.app/populatte/issue/POP-63 |

Bugs: **POP-13** (re-parentado, resolvido por POP-59) · **POP-54** (re-parentado, = `[contrast]`) · **POP-22** (relacionado a POP-55/POP-59, *não* re-parentado).

Notas: POP-56 e POP-58 podem rodar em paralelo (sem deps). POP-58 não bloqueia nada da F2 — pode ser feito a qualquer momento antes do POP-62.
