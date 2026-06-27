# Detalhe do Projeto + Fluxo de Importação — REFERENCE

Feature **POP-64** (Linear, time Populatte / projeto Piloto RAL). Organizada via `/organize-feature` em **2026-06-25**. Espelha o formato dos épicos POP-47 (App Shell) e POP-55 (Lista de Projetos).

> **Fonte única da spec = Linear.** Este arquivo é índice/decisões/anatomia, não a spec dos tickets.

---

## 1. O que é

Redesenhar a **página de detalhe do projeto** (`/projects/[id]`) + o **modal "Nova importação"**, fechando o fluxo **criar projeto → importar planilha** no dashboard. **Frontend-only** (o backend de criar + importar já está pronto). A tela pós-importação ("Significado dos dados" / mapeamento real) fica para outra feature — aqui é só placeholder.

## 2. Fonte de verdade visual

Claude Design — projeto `1a97966a-4217-4773-a3f6-94e730d7b31c`:
- **`Populatte Projeto Detalhe.dc.html`** — a página `/projects/[id]` (toggle de demo: A Configurando / B Configurado). Cópia local: [`design/projeto-detalhe.html`](design/projeto-detalhe.html).
- **`Populatte Fluxo Criação.dc.html`** — sequência criar→importar em 3 quadros. Cópia local: [`design/fluxo-criacao.html`](design/fluxo-criacao.html).
  - Quadro 1 = modal "Novo projeto" (**referência** — já existe, POP-61)
  - Quadro 2 = projeto vazio recém-criado (= a própria página de detalhe vazia)
  - Quadro 3 = modal "Nova importação"

## 3. Decisões travadas (com o usuário, 2026-06-25)

1. **Foco** = redesign da página de detalhe + modal "Nova importação".
2. **Cadastro** (modal "Novo projeto") = **reusar** o existente (POP-61); entidade-alvo em **texto livre** (sem `<select>` do design). Não recriar.
3. **Backend** = **nada novo** (criar + upload/ingestão já completos). `packages/types` (Project stale) = chore separado, fora.
4. **Sem tag de status** "Configurando/Configurado" no header (estado derivado removido).
5. **Config band** (stepper 4 passos) = **mantida**, **some após ≥1 importação** (deriva de `batches.length` no cliente).
6. **Modal de importação** = **sem o selo "detectado automaticamente"**; modo escolhido manualmente (default sensato). Detecção real = futuro.
7. **Progresso X/Y** = placeholder (POP-22 adiado). **"Preencher"** = botão presente, ação placeholder/guia p/ extensão.
8. **Fora/mock**: "Significado dos dados" (POP-24/POP-33), editor de mapeamento real (extensão), detecção de modo, progresso real.
9. **Sequenciamento** = **blocked-by POP-55** (precisa de `urls[]` + primitivos em main).
10. Tokens café, light-only, apresentacional, **pnpm**, copy **PT-BR** / código **EN**.

## 4. Inconsistências entre os 2 designs (e veredito)

Os dois designs **não competem** — o quadro 2 do *Fluxo* É a página *Detalhe* no estado vazio. "Inconsistência" aqui = **estados diferentes da mesma peça**.

| # | Divergência | Veredito |
|---|---|---|
| 1 | **Stepper "passo atual"**: *Fluxo* (vazio) → passo 1 "Agora"; *Detalhe* A → passo 1 done, passo 2 "Agora" | 2 estados do mesmo stepper. Construir ambos (POP-66). |
| 2 | **Ação primária do header**: vazio = "Importar planilha" (gold); com dados = "Nova importação" (outline) + "Preencher" (gold) | Depende do estado; *Detalhe* (com dados) é a referência mais completa (POP-65). |
| 3 | **3 gatilhos de import** (header, empty state, tile) | Um único modal, 3 gatilhos (POP-68/POP-69). |
| 4 | **"+1 URL"** = texto fixo nos dois | Mock — calcular `+N` de `urls.length` (POP-65). |
| 5 | **Status "Configurando/Configurado"** | Não existe no backend → **removido** por decisão (#4). Config band passa a sumir por `batches.length` (#5). |
| 6 | **"Significado dos dados"** (passo do stepper, chip no card, destino do "Continuar") | Só **placeholder/link** aqui; tela real = POP-24/POP-33. |

## 5. Estado do código (verificado 2026-06-25)

**Frontend (apps/web) — já existe, é redesign:**
- Rota `apps/web/app/(platform)/projects/[id]/page.tsx` (~171 linhas) — funcional, **pré-redesign** (ações soltas, "Importacoes"/"Mappings"). Título via `usePageHeader` (header global POP-47).
- Componentes em `components/projects/`: `project-form-dialog` (criar/editar multi-URL, **com `targetEntity` texto livre**), `project-card`, `upload-batch-modal` (react-dropzone, modos LIST/PROFILE, POST FormData), `batch-grid`/`batch-card`/`batch-empty-state`, `mappings-list`/`mappings-empty-state`, `delete-*`.
- Primitivos `components/ui/` (POP-57): `status-badge`, `url-chip`, `entity-chip`, `progress-meter`.
- API layer 100% real (`lib/api/client.ts` + Clerk bearer). Schema `project.schema.ts`: **`urls: ProjectUrl[]` + `targetEntity: string|null` + `status: active|archived`**. Hooks `use-projects`, `use-batches`.

**Backend (apps/api) — COMPLETO para criar + importar:**
- `POST /projects` (`project.controller.ts`) com `name`, `description`, `targetEntity`, `urls[]` (JSONB; `normalizeProjectUrls` garante 1 principal). CRUD completo (POP-56).
- `POST /projects/:projectId/batches` (`batch.controller.ts`, `FilesInterceptor` 50 arq / 5MB) → `IngestionService` (List/Profile). Tabelas `ingestion_batches`/`ingestion_rows` (`columnMetadata` JSONB, status PROCESSING|COMPLETED|FAILED).
- **`.xls` (OLE2) aceito no server** (`file-content-validation.pipe.ts`) — mas **rejeitado no front** (`upload-batch-modal.tsx` só `.xlsx`) → **POP-12** (dobrado no POP-68).

**Gap de backend:** praticamente nenhum. Só `packages/types` Project stale (sem `urls`/`targetEntity`, enum errado) — **chore fora desta feature**.

## 6. Mapa de tickets

Feature pai: **[POP-64](https://linear.app/populatte/issue/POP-64)** — Detalhe do Projeto — página + fluxo de importação (redesign). *blocked-by POP-55.*

| Ticket | `[slug]` | Responsabilidade | Fase | blocked-by | Prio |
|---|---|---|---|---|---|
| **POP-65** | `[detail-header]` | Header (título, chips Entidade/URL +N real, ProgressMeter placeholder, ações Nova importação + Preencher); sem tag de status | Peças | POP-55 | High |
| **POP-66** | `[config-band]` | Faixa + stepper 4 passos (2 estados); some após ≥1 importação | Peças | POP-55 | Med |
| **POP-67** | `[zones]` | Zonas Importações + Mapeamentos (reusa BatchGrid/MappingsList; empty/tile; chip "Significado" placeholder) | Peças | POP-55 | Med |
| **POP-68** | `[import-modal]` | Redesign modal "Nova importação" (sem auto-detect; **aceita .xls → POP-12**) | Peças | POP-55 | Med |
| **POP-69** | `[integration]` | Compor em `projects/[id]/page.tsx`; dados reais; band condicional; 3 gatilhos; copy PT-BR | Integração | 65,66,67,68 | Med |
| **POP-70** | `[qa]` | Paridade visual, a11y, responsivo, lint/type-check | QA | 69 | Med |
| **POP-12** | (bug, dobrado) | `.xls` rejeitado no front — resolvido pelo POP-68 | — | (related POP-68) | High |

**Ordem recomendada (fazer um a um):** POP-55 (externo, mergear) → **POP-65 → POP-66 → POP-67 → POP-68** (paralelos) → **POP-69** → **POP-70**.

**Relacionados (fora):** POP-22 (progresso real), POP-17 (batch travado PROCESSING), POP-24/POP-33 ("Significado dos dados"), POP-35 (ativação — coordenar copy do stepper), POP-61 (modal criar — reusado).

## 7. Tokens & convenções (lembrete)

- Cor SEMPRE via utilitário/token (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-gold text-gold-foreground`, status `bg-*-soft text-*-text`). **Nunca hex cru.**
- Radii: `rounded-md` botões/inputs · `rounded-lg` cards · `rounded-xl` modais.
- Primitivos só em `components/ui/`; composições de feature em `components/projects/`. Componentes apresentacionais (props in / callbacks out). Adicionar novos primitivos ao `/design-system`.
- Verificação: `pnpm` lint + type-check via `node_modules/.bin` (ver memória `populatte-web-dev-verify-env`). Worktree: `pnpm install` na **raiz** também (react-dropzone é dep da raiz).
