---
description: Discovery interativo → cria uma feature (issue pai) + subtickets no Linear, no padrão dos POP-36/POP-47
argument-hint: <descrição curta da feature, ex.: "Página de Projetos — listagem + criação">
---

# ORGANIZAR FEATURE NO LINEAR (discovery → feature + subtickets)

A feature a organizar: **$ARGUMENTS**

> Objetivo: levar esta feature do zero à organização completa no Linear — pesquisando o
> contexto sozinho, fazendo **perguntas didáticas até entender 100%**, e criando um ticket
> **feature guarda-chuva + subtickets** bem documentados (padrão POP-36 / POP-47), com
> dependências, labels e artefatos locais. **Não escreva nada no Linear sem minha aprovação.**

## NOMENCLATURA
No Linear NÃO existe tipo "Epic". A "feature" é um **issue pai** (guarda-chuva) e cada parte é
uma **sub-issue** (`parentId`). Trate isto como uma **feature**, não um épico.

## CONTEXTO FIXO (sempre vale)
- **Linear:** time **Populatte** (key POP), projeto **Piloto RAL**. Referências de formato:
  POP-36 (Home — Espresso Dark) e POP-47 (App Shell do Dashboard). Leia a estrutura delas e espelhe.
- **Labels (use as existentes — confirme com `list_issue_labels`):** uma de **Área**
  (`Web` / `API` / `Extension` / `Tooling` / `Deploy/Infra` / `Offline Lab`) + tipo
  (`Feature` / `Bug` / `Improvement`) + `UI/UX` quando houver design/interface. Prioridade:
  fundação = High; demais = Medium; QA = Medium. Criar tudo em **Backlog**.
- **Stack/convenções** (ver CLAUDE.md + memórias): monorepo Turborepo + **pnpm**; clean architecture;
  **shadcn/ui** (em `components/ui/`); **tokens café já globais** em `globals.css` (cor SEMPRE via
  utilitário/token, nunca hex); componentes **apresentacionais** (dados/lógica fora deles);
  **código/identificadores em inglês, copy/UI em PT-BR**; light-only no piloto.
- **MCPs:** Linear (ler/criar issues), **claude_design / DesignSync** (ler design — projeto
  "Populatte Design", projectId `1a97966a-4217-4773-a3f6-94e730d7b31c`), e o próprio codebase.
- **Sem assinatura de IA:** nada de "Claude/gerado por IA" em descrições de Linear, commits ou
  metadados de git.

## FASE 1 — PESQUISA DE CONTEXTO (subagente, SOMENTE LEITURA — economiza token)
Antes de perguntar qualquer coisa, **descubra sozinho o que já dá pra saber** (não me pergunte o
que você consegue achar). Dispare **1 subagente** (Explore/Task) com a tarefa:
- **Ler os documentos do projeto** (são a fonte do "o que é / como funciona" — use-os, não reinvente):
  - *Produto (o que é, por quê):* `IDEA.md` (conceito/visão/MVP), `.planning/PROJECT.md`
    (§What This Is / Core Value / Constraints / Key Decisions), `README.md` (§About).
  - *Arquitetura & convenções (onde o código vive):* `CLAUDE.md` + `.planning/codebase/`
    (`ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `STACK.md`, `INTEGRATIONS.md`).
  - *Estado & roadmap (o que já existe / o que vem):* `.planning/MILESTONES.md`, `.planning/STATE.md`,
    `.planning/PILOTO-RAL.md` (só as seções da feature) e `.planning/HANDOFF.md` se existir.
  - *Memória:* `MEMORY.md` + as memórias ligadas a esta feature.
  - **Eficiência:** docs pequenos (IDEA, README, `codebase/*`) → leitura completa OK; docs grandes
    (`PROJECT.md`, `PILOTO-RAL.md`) → só as seções relevantes. Confie nos `.planning/codebase/*` para
    convenções/estrutura em vez de varrer o código do zero — mas, se for decidir algo crítico,
    **confirme no código** (alguns docs podem estar defasados).
- Mapear o **estado atual no código** da feature (rotas, componentes, hooks, serviços, DTOs já existentes).
- **Buscar no Linear** issues já existentes/relacionados (`list_issues` no projeto Piloto RAL + busca
  por palavra-chave) — para não duplicar nem ignorar trabalho já planejado/feito.
- Se houver design, ler via DesignSync **apenas** os arquivos desta feature.
- Ler a **estrutura** dos tickets de referência (POP-36/POP-47) p/ espelhar o formato das descrições.
- Devolver um **DIGEST CURTO**: (a) o que já existe, (b) o **gap** (o que falta), (c) decisões já
  registradas, (d) **lista de perguntas em aberto** que faltam para fechar o escopo. NÃO colar arquivos inteiros.

## FASE 2 — PERGUNTAS DIDÁTICAS (iterativo — pergunte até entender 100%)
Com base no digest, me pergunte em **rodadas curtas** (1–4 perguntas por vez), usando `AskUserQuestion`:
- **Uma ideia por pergunta.** 2–4 opções, e **cada opção explica o que significa + o trade-off**
  (didático, pra eu entender bem o que está sendo decidido). Marque a recomendada com "(recomendado)"
  e diga **por quê**.
- **Explique POR QUE a pergunta importa** e o que muda no resultado conforme a resposta.
- Só pergunte o que **não** dá pra resolver pesquisando. Não pergunte o óbvio.
- Cubra, no mínimo:
  1. **Escopo** — o que entra e **o que fica de fora** (deixar explícito o adiado/follow-ups).
  2. **Fronteira** — ex.: só UI/layout? inclui dados/estado/backend? só leitura ou também escrita?
  3. **Divisão em responsabilidades** — como quebrar em subtickets (1 responsabilidade cada).
  4. **Dependências** — o que bloqueia o quê; o que precisa estar pronto antes (inclusive de outras features).
  5. **Design** — qual a fonte de verdade visual (DesignSync? já existe?).
  6. **Dados/backend** — existe API/endpoint? usar mock/placeholder? contrato de tipos?
  7. **Decisões com mais de um caminho válido** — apresentar as opções, não assumir.
- Faça **quantas rodadas precisar**. Só pare de perguntar quando conseguir escrever o breakdown **sem chutar**.
- Ao final, **resuma seu entendimento em 5–10 bullets** ("é isso?") e peça confirmação antes de prosseguir.

## FASE 3 — PROPOSTA DE BREAKDOWN (aprovação antes de escrever no Linear)
**Antes, decida o tamanho:** se a feature couber em **≤2–3 tarefas**, proponha **tickets soltos**
(sem issue pai) em vez de uma feature guarda-chuva — não infle. Guarda-chuva só quando há várias
responsabilidades com dependências entre si.
Apresente: (a) a **feature guarda-chuva** (título + resumo + decisões travadas); (b) a **lista de
subtickets** com título, **1 linha de responsabilidade**, **dependências** e a **ordem em fases**
(ex.: Fundação → Peças → Integração → QA). Peça aprovação; permita ajustar granularidade.
**Não crie nada no Linear sem o meu OK.**

## FASE 4 — CRIAÇÃO (só depois da aprovação)
1. **Issue pai (feature)** no projeto **Piloto RAL**, time **Populatte**, descrição rica nas seções:
   **Resumo / Contexto & problema / Decisões travadas / Design & fonte / Abordagem técnica /
   Sub-issues (ordem e dependências) / Definition of Done / Riscos**. Anexar link de design (se houver);
   labels (UI/UX, Web|API|Extension, Feature); prioridade.
2. **Sub-issues** com `parentId` = feature, descrição nas seções: **Contexto / Objetivo /
   Escopo (Inclui / Não inclui) / Referência de design / Arquivos afetados / Passos de implementação /
   Critérios de aceite (checkboxes) / Dependências / Riscos & observações**.
   - **Crie em ordem topológica** (fundação primeiro) p/ ter os IDs e ligar `blockedBy` corretamente.
   - Labels/prioridade por ticket (regra prática: fundação = High; demais = Medium; QA = Medium).
   - `assignee` = "me".
3. **Verifique** as relações (`get_issue` com `includeRelations` em 1–2 tickets) — confirme `blockedBy`.
4. **Artefatos locais** em `.planning/<feature-slug>/`: **REFERENCE.md** (decisões, estado do código,
   anatomia/design, inventário/rotas, **mapa de tickets com links + ordem recomendada**) e, se houver
   design, `design/<feature>.html`. **NÃO** espelhar specs em `tickets/*.md` (fonte única = Linear),
   salvo se eu pedir.
5. **Memória:** criar `.../memory/<feature-slug>.md` (type: project, com refs POP-XX, decisões,
   achados-chave) + 1 linha no `MEMORY.md`.
6. **Relatório final:** tabela (POP-XX | título | depende de), ordem "fazer um a um", links e pendências.

## REGRAS DE OURO
- Pesquisa pesada vai no **subagente**; o contexto principal guarda só o **digest** (economia de token).
- **Fonte única** de spec (Linear) — não duplicar em arquivos locais; leitura **focada** (nada de ler
  `components/ui/*` inteiro ou logs que passaram).
- Perguntas **didáticas** (opções explicadas + por que importa); **itere até 100%**; **confirme o
  entendimento** antes de criar.
- Padrão de descrição = POP-36 / POP-47. Clean arch; PT-BR copy / English code; tokens, nunca hex.
- **Nada de assinatura de IA** no Linear/git. **Não criar tickets sem aprovação do breakdown.**
