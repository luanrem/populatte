---
description: Executa um ticket do Linear (research → plano → worktree → implementação → verificação → fechamento) com os comandos e convenções certos deste repo
argument-hint: <TICKET> [branch-base]  ex.: POP-50 epic/pop-47-dashboard-shell
---

# EXECUTAR TICKET

Argumentos: **$ARGUMENTS** → o 1º token é o **TICKET** (ex.: `POP-50`); o 2º, se vier, é a
**BRANCH-BASE** (a branch de onde sair e onde fazer o merge; ex.: `epic/pop-47-dashboard-shell` ou
`main`). **Se a branch-base não for dada, DERIVE-A do parent** (ver FASE 1): sub-ticket de uma
feature guarda-chuva → a **epic branch** registrada na feature pai; ticket solto (sem parent) →
`main`. Só **pergunte** se não conseguir derivar.

> Objetivo: implementar este ticket com fidelidade ao spec, commits atômicos limpos e verificação
> real — sem desperdiçar token e sem deixar assinatura de IA em lugar nenhum.

## CONTEXTO FIXO
- Monorepo Turborepo + **pnpm** (NUNCA npm/yarn; ignore `package-lock.json`).
- Alvo típico: `apps/web` (Next.js App Router, Tailwind v4 CSS-first, shadcn/ui "new-york", Clerk,
  next-themes, lucide-react, next/font). **Light-only** (`forcedTheme="light"`) — não há tema escuro.
- Convenções: TS estrito (sem `any`); ordem de imports do ESLint; **`components/ui/` é EXCLUSIVO do
  shadcn**; código/identificadores em **inglês**, copy/UI em **PT-BR**; cor SEMPRE via
  utilitário/token (tokens café já globais em `globals.css`), **nunca hex cru**; a11y AA.
- Commits: Conventional Commits + ref do ticket. Ex.: `feat(web): add app sidebar (POP-50)`.

## ⚠️ ASSINATURA — OBRIGATÓRIO
- NÃO adicionar QUALQUER assinatura/atribuição de Claude/IA em commit, PR, comentário do Linear ou
  metadado git. Sem trailer `Co-Authored-By`, sem "Generated with…". Autor/committer = o usuário.

## ⚙️ COMANDOS DO REPO (use exatamente estes — não invente variações)
- **Install (worktree novo):** na **RAIZ** do worktree → `pnpm install` (há deps que vivem no
  package.json **raiz**, ex.: `react-dropzone`) **E** `pnpm -C apps/web install`. Não existe
  `pnpm-workspace.yaml` → `pnpm --filter @populatte/web …` **não casa com nada**.
- **Type-check** (de `apps/web`): `./node_modules/.bin/tsc --noEmit`  (NÃO há script `type-check`).
- **Lint** (de `apps/web`): `./node_modules/.bin/eslint .`  (baseline: **0 erros, 3 warnings
  pré-existentes** em `app/(platform)/mappings/` — ignore-os).
- **Dev:** `apps/web/node_modules/.bin/next dev`.
- `pnpm run`/`pnpm exec` quebram com `ERR_PNPM_IGNORED_BUILDS` → **sempre os binários diretos**.
- **Worktree precisa de env:** copie `apps/web/.env.local` do checkout principal (Clerk), senão
  `next dev`/ClerkProvider erram.

## FASE 1 — PESQUISA + PLANO (modo plano, SOMENTE LEITURA — pesquisa pesada no subagente)
1. Leia o issue **{{TICKET}}** no Linear: descrição, critérios de aceite (AC), labels, prioridade,
   parent e relations (`blockedBy`/`blocks`) + o `gitBranchName` sugerido.
   **Resolva a BRANCH-BASE** (se não veio por argumento): se o ticket tem **parent** (feature
   guarda-chuva), use a **epic branch** registrada na descrição da feature pai / no `REFERENCE.md`
   (padrão `epic/pop-<parent>-<slug>`); garanta que existe (`git fetch origin` + `git switch`). Se
   **não houver parent**, a base é **`main`**. Se for sub-ticket mas a epic branch não existir →
   **PARE e avise** (a feature precisa ter sido criada via `/organize-feature`).
2. Confirme que **todo `blockedBy` está Done** (logo, já mergeado na branch-base). Se algum NÃO
   estiver → **PARE e avise**; não inicie.
3. Dispare **1 subagente** (Explore/Task) para devolver um **DIGEST CURTO** (os arquivos crus não
   entram no contexto principal). Ele deve ler: o spec do ticket no Linear; o `REFERENCE.md` da
   feature **se houver** (foque nas seções: anatomia do componente/tela, mapa de tokens→utilitário, e
   a linha deste ticket no mapa de tickets) + o markup de design da feature (**só a parte deste
   ticket**); os docs de convenção/estrutura (`.planning/codebase/CONVENTIONS.md`, `STRUCTURE.md`,
   `ARCHITECTURE.md`, `CLAUDE.md`); e **apenas** os arquivos de "Arquivos afetados" do ticket + 1–2
   análogos próximos. Digest = (a) **valores/copy/ícones exatos** do ticket, (b) arquivos a
   criar/editar (1 linha cada), (c) análogos a seguir, (d) divergências spec×código. Terso; **não
   colar arquivos inteiros**.
4. Apresente um **PLANO curto** (bullets): arquivos a criar/editar; componentes shadcn a adicionar
   (`cd apps/web && pnpm dlx shadcn@latest add <comp>`); **commits atômicos** (mensagens propostas,
   sem assinatura); como **cada AC** será atendido; plano de verificação. **Não cole markup de design
   no plano.** **Aguarde aprovação.**

## FASE 2 — EXECUÇÃO (após aprovação)
5. Worktree a partir da branch-base:
   ```
   git switch <BRANCH-BASE>
   git worktree add ../populatte-worktrees/{{TICKET}} -b <gitBranchName do Linear> <BRANCH-BASE>
   cp apps/web/.env.local ../populatte-worktrees/{{TICKET}}/apps/web/.env.local
   cd ../populatte-worktrees/{{TICKET}} && pnpm install && pnpm -C apps/web install
   ```
6. Linear: {{TICKET}} → **In Progress**, assignee **"me"**.
7. Implemente seguindo o plano, com **commits atômicos** (cada commit idealmente passa tsc+eslint).
   Sem assinatura. NÃO commitar `node_modules`/`.next` nem o `pnpm-workspace.yaml`/lockfile stray que
   o install pode dropar.
8. **VERIFICAÇÃO** (de `apps/web`):
   - `./node_modules/.bin/tsc --noEmit` → verde
   - `./node_modules/.bin/eslint .` → 0 erros (3 warnings de `mappings/` são baseline)
   - Tickets de UI: `apps/web/node_modules/.bin/next dev` e compare com o design (REFERENCE.md /
     `.html` da feature). Screenshots **só desktop + mobile** (sem modo escuro). Cheque foco por teclado.
   - **Resuma a saída** dos comandos (só falhas); não cole logs que passaram. Não rode `build` salvo
     se o ticket pedir.
9. **AUTO-REVISÃO:** releia os AC e marque cada um ✅/⚠️ citando `arquivo:linha`. Conserte antes de fechar.
10. **Fechamento no Linear:** comentário com resumo, arquivos principais, checklist dos AC (✅/⚠️),
    como verificou, branch + commits, follow-ups/desvios → **só então** mude para **Done**. Se algum
    AC falhar, mantenha **In Progress**, comente o bloqueio e avise.
11. **Squash-merge** na branch-base:
    ```
    cd <raiz principal>; git switch <BRANCH-BASE>
    git merge --squash <gitBranchName>
    git commit -m "feat(web): <resumo do ticket> ({{TICKET}})"   # corpo: commits + URL. Sem assinatura.
    (cd apps/web && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint .)   # base verde
    git worktree remove ../populatte-worktrees/{{TICKET}} --force
    ```
12. **Relatório final:** resumo, URL do ticket, SHA do commit squashado na branch-base, follow-ups.

## REGRAS DE OURO
- **Sessão nova por ticket** (ou `/clear` entre tickets) — não encadeie tickets no mesmo contexto.
- Pesquisa pesada vai no **subagente**; o contexto principal guarda só o digest.
- Comandos: **só os da seção ⚙️**. Nada de assinatura de IA. Não iniciar com `blockedBy` pendente.
- Não fechar o ticket com QUALQUER AC falho. Fidelidade via token/utilitário; sem libs novas além de
  shadcn/lucide-react/next-font/Clerk/next-themes. Se a realidade divergir do spec, registre o desvio
  no plano E no comentário do Linear.
