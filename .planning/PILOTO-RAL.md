# Piloto RAL — Diagnóstico, Backlog e Roadmap

> Documento produzido em 2026-06-12 a partir de auditoria direta do código (não de resumos).
> Cada afirmação está marcada como **[verificado]** (lido no código/artefato) ou **[a verificar]** (suposição que precisa de teste).
> Prosa em português; artefatos técnicos (arquivos, identificadores, código) em inglês.

---

## 1. Diagnóstico de prontidão

### 1.1 A descoberta mais importante: os "blockers diagnosticados" já foram corrigidos — mas nada foi validado por humano

Os dois bugs apontados como "diagnosticados e não corrigidos" no briefing **já estão corrigidos no código atual**:

| Bug (nota de debug) | Estado real | Evidência |
|---|---|---|
| Side Panel inutilizável (`AUTH_LOGIN` "Unknown message type" + `GET_STATE` timeout) — `.planning/debug/sidepanel-port-communication.md` | **CORRIGIDO** [verificado] | `CodeInputForm.tsx`, `ProjectSelector.tsx` e `BatchSelector.tsx` usam `sendViaPort`; `background.ts` trata `AUTH_LOGIN` no port handler (linha 632), `GET_STATE` resolve `activeTabId` via `tabs.query` (linhas 318-324) e o push imediato de estado na conexão foi removido (comentário nas linhas 300-304). Corrigido nos planos 35-03/35-04. |
| Port desconecta após idle (SW termination) — `.planning/debug/sidepanel-port-disconnect-idle.md` | **CORRIGIDO** [verificado] | `App.tsx` tem reconexão com backoff exponencial (`retriesRef`, `maxRetries = 5`); `background.ts` tem `safeSendToPort` com try-catch e keepalive alarm de 4 min (linha 36). Corrigido no plano 35-05. |
| `UpdateBatchUseCase` sem `totalRows` — `.planning/debug/batch-inline-edit-invalid-data.md` | **CORRIGIDO** [verificado] | Commit `496664f fix(31-07): return totalRows from UpdateBatchUseCase`; o use case retorna `UpdateBatchResult extends Batch { totalRows }`. |
| Next button desabilitado — `.planning/debug/next-button-disabled.md` | **SUPERADO** [verificado] | `RowIndicator.tsx` agora tem navegação livre prev/next (`onPrev`/`onNext`, ChevronLeft/Right). |
| Empty state cobre seletores / indicadores de fill — `.planning/debug/empty-state-covers-ui.md`, `fill-result-indicators.md` | **RESOLVIDOS** (status `resolved` nas próprias notas) [verificado] | — |
| Sem toast de sucesso no batch settings / botões pequenos no card — `batch-settings-no-success-toast.md`, `batch-card-buttons-cosmetic.md` | **ABERTOS, cosméticos** [verificado] | Fora do caminho crítico do piloto. |

**Porém:** o UAT da Fase 37 (Aba Preencher) está com **0 de 10 testes executados** (`.planning/phases/37-aba-preencher/37-UAT.md`) [verificado]. Ou seja: o caminho upload→map→fill **nunca foi validado por um humano após as correções**. O produto compila, type-checka e builda — mas ninguém confirmou que funciona de ponta a ponta. Esse é o blocker nº 1.

### 1.2 Lista ordenada de blockers entre "hoje" e "um sub-form RAL preenchido E2E"

1. **Validação humana do fluxo atual nunca aconteceu** [verificado: UAT 37 = 0/10; nenhum Playwright no repo]. Risco de bugs latentes desconhecidos. → Smoke test manual completo é o primeiro passo, antes de escrever qualquer código.
2. **Motor não suporta seleção de radio dirigida por dado** [verificado]: `executeFill` em radio faz truthy-check (`"yes"/"true"/"1"/"sim"` → check) em `apps/extension/src/content/actions.ts` (função `isTruthyValue`). Para o `rblSinal` do RAL (valores `+`/`-`), um fill com `sourceFieldKey` **desmarcaria** o radio (`"+"` não é truthy). Precisa de "radio by value": dado o valor da linha, achar e clicar o radio do grupo cujo `value` casa.
3. **Valores numéricos saem com decimal de ponto, RAL espera vírgula** [verificado para profile mode]: `CellAccessHelper.getCellValue` retorna `cell.v` cru (número JS); o executor faz `String(value)` → `"1500.5"`. Os campos do RAL exibem `"0,00"` [verificado no .mhtml]. List mode usa `sheet_to_json({ raw: false })`, que usa o texto formatado do SheetJS — mas o SheetJS formata com convenções en-US, então provavelmente também sai `"1500.50"` [a verificar empiricamente]. Precisa de camada de transformação de valor (formato pt-BR) no step.
4. **Deploy impossível como está** [verificado]: `API_BASE_URL = 'http://localhost:3001'` hardcoded em `apps/extension/src/api/client.ts:15`. Sem Dockerfile, sem config de hosting. CORS da API só libera localhost + `WEB_URL` env — suficiente para a extensão (que tem `host_permissions: ['<all_urls>']` e bypassa CORS [verificado em `wxt.config.ts`]), mas o web precisa de `WEB_URL` configurado.
5. **Tooling do monorepo está quebrado vs. documentação** [verificado]: root `package.json` **não tem nenhum script** (sem `dev`, `build`, `lint`), **não existe `turbo.json`**, existem **dois lockfiles** (`package-lock.json` trackeado + `yarn.lock` untracked), e `packages/commons` e `packages/eslint-config`/`tsconfig` **não existem** (só `packages/types`) — CLAUDE.md e README descrevem um monorepo aspiracional. Os apps individualmente funcionam: `tsc --noEmit` limpo em api e web, `wxt build` ok [verificado]. Não bloqueia desenvolvimento local, mas bloqueia build reproduzível para deploy.
6. **Extensão tem 9 erros de type-check** [verificado]: `TS6133`/`TS2339`/`TS2833` em `App.tsx`, `handlers.ts`, `send.ts`, `highlight-step.ts`, `validate-selectors.ts`. O build do WXT passa mesmo assim, mas viola o strict TS do projeto. Baixo esforço, alto valor de higiene.
7. **Comportamento live do site RAL é desconhecido** [a verificar]: os snapshots `.mhtml` não contêm `__doPostBack` nem `MaskedEdit` [verificado nos snapshots], mas são estáticos — o site vivo pode ter postbacks em selects cascateados (ddlEstado → ddlMunicipio no Mercado Consumidor) e validação server-side de formato. Só o teste live com o usuário resolve.
8. **Ação `verify` existe no enum mas não no executor** [verificado]: `StepAction.Verify` em `step.entity.ts`, mas `executor.ts` só trata `fill`/`click`/`wait` (verify cai em "Unknown action type"). Não usar `verify` no piloto, ou remover do dashboard para não criar steps quebrados.

### 1.3 O que NÃO é blocker (descartado com evidência)

- **"Rows default to VALID" (AUDIT.md)**: desatualizado. O schema atual tem `status` default `'DRAFT'` e um `fillStatus` separado (`PENDING`/`VALID`/`ERROR`) [verificado em `ingestion-rows.schema.ts`]. O fluxo de fill não é bloqueado por status de revisão. Para um piloto com 1 usuário preenchendo os próprios dados, **grid de revisão/curadoria não é necessário** — o usuário corrige no Excel e re-sobe.
- **Trabalho em andamento não commitado** [verificado]: o diff atual (step DTO nullable + `updateMappingResponseSchema` no web) é uma correção coerente da mesma família do bug de `totalRows` (shape de resposta ≠ schema Zod). Deve ser finalizado e commitado, não descartado.

---

## 2. Avaliação do motor de preenchimento vs. RAL

Baseado na leitura de `actions.ts`, `executor.ts`, `selector.ts` e nos `.mhtml` decodificados (quoted-printable) de **Movimentação da Produção Bruta** e **Mercado Consumidor**.

### 2.1 O DOM real do RAL (verificado nos snapshots)

**Movimentação da Produção Bruta** (`LAVRA/PRODUÇÃO BRUTA/MOVIMENTAÇÃO...`): 118 controles. Estrutura:
- Grid `gridViewMovimentacaoBruta$ctl02..ctl13` (12 meses) × colunas `ProducaoTonelada`, `VendaTonelada`, `TratamentoTonelada`, `TransformacaoConsumo`, `TransferenciaConsumo`, `VendaValor`, `TransformacaoVenda`, `TransferenciaVenda` — todos `input type="text"` simples com valor default `"0,00"`, **sem handlers JS inline, sem máscaras** [verificado].
- Estoque: `txtEstoqueInicial` (editável), `txtEstoqueFinalCalculado` e `txtEstoqueFinalReal` (**disabled** — calculados), radio `rblSinal` (`value="+"` / `value="-"`), `txtAjusteEstoque`.
- Botões submit ASP.NET: `buttonCalcularEstoque`, `btnAdicionar`, `btnGravar`, `btnNovo` (postback full).
- **`fupExcel` — um file input**: o próprio site do governo aceita upload de Excel neste form (ver pergunta aberta Q2).

**Mercado Consumidor**: padrão de entrada repetida (lista): `ddlListaCompradores`, `ddlPais` (246 opções), `ddlEstado` (28), `ddlMunicipio` (**0 opções — cascateado**), `txtQuantidade`, `txtValor`, `ddlGrupo` (22), `ddlUso` (**0 opções — cascateado**), `btnAdicionar`. Também tem `fupExcel`.

**Correção ao briefing:** `txtQuantidade`/`txtTeor` **não** estão no form de Movimentação — `txtQuantidade` está no Mercado Consumidor (LAVRA e BENEFICIAMENTO) [verificado por busca em todos os 41 `.mhtml`]. O exemplo do `WORKFLOW_AND_TESTING.md` mistura campos de forms diferentes.

### 2.2 Matriz: tipo de campo RAL × estado do motor

| Tipo de campo (RAL) | Estado do motor | Evidência / o que falta |
|---|---|---|
| Text input simples (grid de toneladas) | ✅ **Funciona** | Native setter + `input`/`change` events; inputs do RAL são plain, sem framework JS [verificado] |
| Decimal pt-BR (`"1500,00"`) | ⚠️ **Frágil — gap real** | Valor chega como `"1500.5"` (`String(cell.v)`). Falta transformação de formato. **Construir:** opção de transform no step (`format: 'pt-br-decimal'` com casas decimais) aplicada no `getStepValue` do executor |
| Radio group dirigido por dado (`rblSinal` +/-) | ❌ **Não suportado — gap real** | `executeFill` faz truthy-check, marcaria/desmarcaria errado. **Construir:** em `executeFill`, quando o alvo é radio com `sourceFieldKey`, localizar no grupo (`input[name=...]`) o radio cujo `value` casa com o dado e clicá-lo (~30 linhas em `actions.ts`) |
| Select estático (ddlPais, ddlGrupo) | ✅ **Funciona (com ressalva)** | Match por `value` e depois por texto visível case-insensitive [verificado]. Ressalva: sem normalização de acentos/espaços — "São Paulo" vs "Sao Paulo" falha. **Endurecer:** normalizar com `String.prototype.normalize('NFD')` no match por texto |
| Select cascateado (ddlEstado → ddlMunicipio) | ⚠️ **Frágil** | Funciona em teoria com `fill → wait(ms) → fill`, mas se o site fizer postback full ao selecionar, o ciclo morre no reload [a verificar no live]. Para a fatia recomendada (Movimentação) **não é necessário** |
| Checkbox | ✅ Funciona | Truthy values incl. "sim" [verificado] |
| Campos disabled (estoque calculado) | ✅ Comportamento correto | `executeFill` falha em disabled — basta não mapear esses campos |
| File input (`fupExcel`) | ✅ Comportamento correto | Marcado como skip/manual [verificado] |
| Botões submit ASP.NET (`btnGravar`) | ✅ Funciona como **último** step ou manual | `executeClick` dispara o postback. Como o postback recarrega a página, deve ser o step final + success trigger, ou ficar manual no Copiloto |
| Datas / inputs mascarados | ❔ [a verificar] | Nenhuma máscara detectada nos snapshots analisados; revisar nos demais sub-forms quando forem alvo |
| Ação `verify` | ❌ Não implementada no executor | Não usar no piloto |
| Selectors ASP.NET longos | ✅ Funciona | IDs `ctl00_..._rblSinal_0` são longos mas estáveis e únicos; CSS por `#id` + fallbacks cobre [verificado] |

**Resumo:** para a fatia recomendada, os únicos itens de construção no motor são **(a) transform decimal pt-BR** e **(b) radio-by-value** — ambos pequenos. Normalização de acentos em select é desejável. Todo o resto já existe.

---

## 3. Recomendação da menor fatia RAL

### Fatia recomendada: **Movimentação da Produção Bruta (LAVRA) via PROFILE mode**

**Por quê (alinhamento estrutural perfeito):**
- O template oficial (`Lavra - Movimentação da Produção.xls`) é uma **matriz** (12 linhas-mês × 8 colunas-medida, ~96 células úteis) [verificado]. O **PROFILE mode** existente — N arquivos → N rows com chaves de endereço de célula (`B2`, `C5`) — foi feito exatamente para isso [verificado em `profile-mode.strategy.ts`]. 1 arquivo Excel = 1 row = 1 formulário inteiro.
- O mapping é grande mas trivial: ~96 fill steps, cada um `selector` fixo (`#ctl00_..._gridViewMovimentacaoBruta_ctl02_ProducaoTonelada`) + `sourceFieldKey` = endereço da célula. Todos text inputs simples, **sem selects cascateados, sem máscaras** no grid.
- **Um clique = um formulário inteiro preenchido** → é onde a automação economiza mais tempo por execução e a demo é mais convincente.
- O radio `rblSinal` + `txtAjusteEstoque` (ajuste de estoque) pode ficar **manual no piloto** (1 clique + 1 valor do usuário) se quisermos cortar até o radio-by-value — mas como o fix é pequeno, recomendo incluí-lo.
- Botões `Calcular Estoque` e `Gravar` ficam **manuais** (Copiloto: usuário revisa e submete — exatamente o gatilho de conclusão desejado).

**Segunda fatia (depois do piloto):** Mercado Consumidor via LIST mode (1 linha de Excel por comprador, ciclo fill+`Adicionar` por linha) — modelo de dados encaixa no row-cycle do Populatte, mas depende de selects cascateados (ddlMunicipio/ddlUso) cujo comportamento live precisa ser verificado primeiro.

### Resolução da contradição multi-step (CONTEXT.md Q2 vs PROJECT.md)

`CONTEXT.md` decidiu "Suporte a Navegação (Multi-step)"; `PROJECT.md` lista "Multi-URL workflows" como fora de escopo. **Para o piloto, vale o PROJECT.md**: cada sub-form RAL = **um mapping por URL** (o matching por prefixo de URL já existe [verificado em "Inverted URL prefix matching"]), e **o humano navega entre páginas** (é o modo Copiloto — o usuário já está logado no site com o próprio CPF/certificado).

- **Trade-off aceito:** o usuário clica a navegação do site entre sub-forms; o motor só preenche a página atual. Sem engine de orquestração cross-página, sem gravação de navegação, sem estado entre páginas.
- **Custo:** alguns cliques manuais por declaração. **Benefício:** zero código novo de navegação, zero risco de dessincronia página/dado.
- A decisão multi-step verdadeira (autonomia entre páginas) fica explicitamente adiada para depois do piloto (ver Perguntas Abertas Q1).

---

## 4. Estratégia de validação E2E (Offline Lab)

Hoje **não existe nenhum teste E2E nem Playwright no repo** [verificado]. Estratégia em 3 estágios, do mais barato ao mais realista:

### Estágio A — Testes do executor puro sobre forms sintéticos (sem extensão, sem auth)
1. Criar workspace `apps/e2e` com Playwright (`@playwright/test`).
2. Servir `docs/test-documents/*.html` com um static server local (evitar `file://`).
3. Em cada teste: `page.goto`, injetar o bundle do content (ou importar `executeSteps` compilado standalone via esbuild), executar um JSON de steps + rowData de fixture, e assertar `expect(page.locator('#campo')).toHaveValue('...')`.
4. Cobre: text, email, tel, date, select, radio, checkbox, CPF/CNPJ — os 5 formulários sintéticos já existentes [verificado em `README-formularios-teste.md`].

### Estágio B — Mesmos testes sobre os snapshots RAL
1. Script `apps/e2e/scripts/mhtml-to-html.ts`: decodificar os `.mhtml` (quoted-printable — já provado neste diagnóstico com `quopri`) e extrair o documento HTML principal para `apps/e2e/fixtures/ral/*.html`.
2. Script `extract-html-map.ts`: parsear os fixtures e gerar `ral-field-map.json` (id completo, name, type, value default) — vira a fonte para montar o mapping de produção.
3. Testes: carregar o fixture de Movimentação, executar o mapping real (96 steps + radio), assertar todos os valores **já formatados pt-BR** (`"1.500,00"`), radio `+` marcado, campos disabled intocados.
4. **Gate de qualidade:** o piloto live só acontece com o Estágio B verde.

### Estágio C — Smoke com a extensão real (1 teste)
Playwright Chromium com `--load-extension=.output/chrome-mv3` (persistent context) para validar o caminho completo background→content uma vez — pega bugs de mensageria que o Estágio A não vê. Auth pode ser stubada gravando o token direto em `chrome.storage.local`.

### Estágio D — Live com o usuário (Copiloto)
Sessão acompanhada: usuário logado no site real, dados reais, extensão instalada. Primeiro uma página em homologação visual (preencher e **não** gravar), depois a declaração real.

---

## 5. Recomendação de deploy mínimo

Para **1 usuário remoto**, otimizando custo e simplicidade:

| Componente | Recomendação | Custo | Justificativa |
|---|---|---|---|
| PostgreSQL | **Supabase** (já é o setup — `DATABASE_URL` pooler no `.env.example` [verificado]) | Free tier | Zero migração |
| API (NestJS) | **Railway** (ou Render) — deploy via Nixpacks/Dockerfile do diretório `apps/api` | ~US$ 5/mês | Suporta monorepo path, env vars simples, logs decentes |
| Web (Next.js 16) | **Vercel** — root `apps/web` | Free (Hobby) | Next + Clerk funcionam out-of-the-box |
| Extensão | `wxt zip` → **Chrome Web Store unlisted** (preferido) ou "Load unpacked" guiado | US$ 5 one-time (dev account) | Unlisted dá update automático; unpacked é fallback imediato enquanto a review (1-3 dias) roda |
| Auth | Clerk (atual) — criar instância de produção + webhook URL nova | Free tier | Já integrado |

**Passos concretos (ordem):**
1. Tornar `API_BASE_URL` configurável: `import.meta.env.WXT_API_URL ?? 'http://localhost:3001'` em `client.ts` + `.env` no build da extensão.
2. Escolher **NPM** como package manager único (o `package-lock.json` é o lockfile trackeado; o `yarn.lock` untracked deve ser apagado). Adicionar `"packageManager": "npm@..."` e scripts root (`build`, `lint`, `type-check` via `npm run --workspaces`). Turborepo é **opcional** e fica fora do piloto.
3. Deploy da API no Railway com `PORT`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `WEB_URL`.
4. Deploy do web na Vercel com `NEXT_PUBLIC_API_URL`, `API_URL`, chaves Clerk.
5. Apontar webhook do Clerk para a API de produção; smoke test de signup/login/sync.
6. Build da extensão com `WXT_API_URL` de produção; zip; instalar no Chrome do usuário.

---

## 6. Backlog: Épicos → User Stories

Prioridade MoSCoW; tamanho P/M/G (pequeno ≤ ½ dia, médio ≤ 2 dias, grande > 2 dias).

### Épico E1 — Prontidão: validar o que já existe

**US-1.1 — Smoke test manual do fluxo completo** — **Must, M**
Como dono do produto, quero executar o UAT pendente da Fase 37 mais um fluxo E2E completo (upload → mapping por captura → fill em form sintético) para saber o estado real do produto antes de escrever código novo.
- Dado o repo atual buildado localmente, Quando executo os 10 testes de `37-UAT.md` mais o fluxo upload→capture→fill em `formulario-simples.html`, Então cada teste tem resultado registrado (pass/fail) e cada falha vira item de backlog com nota de debug.
- Arquivos de referência: `.planning/phases/37-aba-preencher/37-UAT.md`, `docs/test-documents/`.

**US-1.2 — Finalizar e commitar o trabalho em andamento** — **Must, P**
Como desenvolvedor, quero concluir o diff não commitado (step DTO nullable em `apps/api/src/presentation/dto/step.dto.ts` + `updateMappingResponseSchema` em `apps/web/lib/api/schemas/mapping.schema.ts`) para que o reparo do shape de resposta de update de mapping não se perca.
- Dado o diff atual, Quando edito um mapping no dashboard e salvo, Então não ocorre erro de validação Zod e a resposta é aceita.

### Épico E2 — Hardening do motor para RAL

**US-2.1 — Radio-by-value** — **Must, P**
Como usuário do Copiloto, quero que um fill step com `sourceFieldKey` sobre um radio selecione a opção do grupo cujo `value` casa com o dado da linha (ex.: `"+"` marca `rblSinal_0`), para preencher o ajuste de estoque do RAL a partir do Excel.
- Dado um grupo de radios `name="...rblSinal"` com values `+`/`-`, Quando executo um fill step com valor `"+"`, Então o radio de value `+` fica checked e dispara `change`.
- Dado um valor sem match no grupo, Quando executo o step, Então o step falha com erro descritivo (`No radio option matching value: X`).
- Arquivo: `apps/extension/src/content/actions.ts` (`executeFill`, branch radio).

**US-2.2 — Transformação de valor pt-BR decimal** — **Must, M**
Como usuário, quero declarar num step que o valor deve ser formatado como decimal pt-BR com N casas (ex.: `1500.5` → `"1.500,50"`), para que os campos do RAL aceitem os números do Excel.
- Dado um step com `valueFormat: { type: 'decimal-ptbr', decimals: 2 }` e rowData `1500.5` (number), Quando o fill executa, Então o campo recebe `"1.500,50"`.
- Dado rowData já em string `"1500,50"`, Quando o fill executa, Então o valor é preservado (idempotência).
- Toca: `packages/types` (step type), `step.entity.ts` + DTO (API), `executor.ts`/`getStepValue` (extensão), modal de step no dashboard (campo opcional). Sem `any`; campo opcional para não quebrar steps existentes.

**US-2.3 — Normalização de acentos no match de select por texto** — **Should, P**
Como usuário, quero que o match de option por texto visível ignore acentos e espaços duplicados, para que "São Paulo" no Excel case com "Sao Paulo" no site (e vice-versa).
- Dado um select com option "São Paulo", Quando o fill executa com valor "sao paulo", Então a option é selecionada.

**US-2.4 — Bloquear/ocultar a ação `verify`** — **Should, P**
Como usuário, não quero conseguir criar steps `verify` que o executor não implementa, para não montar mappings quebrados.
- Dado o modal de step no dashboard, Quando abro o seletor de ação, Então `verify` não aparece (ou aparece desabilitado com tooltip), até o executor implementá-la.

### Épico E3 — Offline Lab (validação E2E reproduzível)

**US-3.1 — Workspace Playwright + testes do executor em forms sintéticos** — **Must, M**
Como desenvolvedor, quero testes Playwright que executam `executeSteps` sobre os formulários de `docs/test-documents/` para provar o motor sem login no governo.
- Dado `apps/e2e` com Playwright configurado, Quando rodo `npm run test:e2e`, Então os 5 formulários sintéticos são preenchidos e cada campo é assertado (text/email/tel/date/select/radio/checkbox/CPF/CNPJ).
- CI-able: roda headless com um único comando.

**US-3.2 — Conversor mhtml→html + mapa de campos do RAL** — **Must, P**
Como desenvolvedor, quero scripts que decodificam os `.mhtml` do RAL para HTML servível e extraem `ral-field-map.json` (name/id/type/default), para gerar fixtures e montar o mapping real.
- Dado `docs/RAL/**/*.mhtml`, Quando rodo o script, Então `apps/e2e/fixtures/ral/*.html` e `ral-field-map.json` são gerados e o fixture de Movimentação abre no Chromium com os 118 controles presentes.

**US-3.3 — Lab verde no RAL Movimentação** — **Must, M**
Como dono do produto, quero um teste Playwright que executa o mapping completo de Movimentação da Produção Bruta sobre o fixture e asserta todos os ~96 campos + radio, para ter prova de correção antes do live.
- Dado o fixture de Movimentação e um Excel de teste preenchido no template oficial, Quando o teste roda o pipeline (parse profile-mode → steps → executeSteps), Então cada célula do grid tem o valor formatado pt-BR esperado, `rblSinal` correto, e campos disabled intocados.
- **Este teste é o gate do piloto live.**

**US-3.4 — Smoke com extensão carregada** — **Should, M**
Como desenvolvedor, quero 1 teste Playwright com a extensão real (`--load-extension`) cobrindo background→content→fill, para pegar regressões de mensageria.
- Dado o build `.output/chrome-mv3` e token stubado em storage, Quando disparo um fill, Então o form sintético é preenchido via caminho completo da extensão.

### Épico E4 — Tooling mínimo para buildar e deployar

**US-4.1 — Um package manager, um lockfile, scripts root** — **Must, P**
Como desenvolvedor, quero NPM como única ferramenta (apagar `yarn.lock`, adicionar `packageManager` e scripts root `build`/`lint`/`type-check`) para builds reproduzíveis.
- Dado um clone limpo, Quando rodo `npm ci && npm run build`, Então api, web e extension buildam sem passos manuais.
- Atualizar CLAUDE.md/README onde descrevem `turbo` e `packages/commons` inexistentes (nota curta, não reescrita).

**US-4.2 — Zerar erros de type-check da extensão** — **Should, P**
Como desenvolvedor, quero `tsc --noEmit` limpo em `apps/extension` (9 erros atuais: unused vars, `ImportMetaEnv.DEV`, namespace `browser` em `handlers.ts`), para manter o padrão strict do projeto e destravar CI.
- Dado o workspace da extensão, Quando rodo `npm run type-check`, Então saem 0 erros.

### Épico E5 — Deploy mínimo

**US-5.1 — `API_BASE_URL` configurável na extensão** — **Must, P**
Como usuário remoto, quero que a extensão aponte para a API de produção via env de build (`WXT_API_URL`), para usá-la fora do ambiente de dev.
- Dado um build com `WXT_API_URL=https://api.populatte.app`, Quando a extensão autentica, Então as chamadas vão para a URL de produção; sem a env, default localhost (dev).

**US-5.2 — API + DB em produção** — **Must, M**
Como usuário remoto, quero a API NestJS no Railway/Render conectada ao Supabase com Clerk de produção, para usar o dashboard de qualquer lugar.
- Dado o deploy, Quando acesso `GET /health` (ou raiz), Então responde 200; signup→sync de usuário funciona via webhook; upload de batch funciona.

**US-5.3 — Web em produção (Vercel)** — **Must, P**
- Dado o deploy, Quando o usuário piloto faz login e cria projeto + upload do template, Então o fluxo do dashboard completa sem erros de CORS (`WEB_URL` configurado na API).

**US-5.4 — Extensão instalável pelo usuário piloto** — **Must, P**
Como usuário piloto, quero instalar a extensão sem ambiente de dev (zip + unpacked com guia, e em paralelo submissão unlisted na Chrome Web Store).
- Dado o zip de produção, Quando o usuário segue o guia de instalação (1 página), Então conecta com o código de 6 dígitos e vê seus projetos.

### Épico E6 — Piloto RAL ao vivo

**US-6.1 — Mapping de produção da Movimentação + template preparado** — **Must, M**
Como usuário piloto, quero o mapping oficial da Movimentação da Produção Bruta criado (a partir do `ral-field-map.json`) e o template Excel com instruções de preenchimento, para executar minha declaração real.
- Dado o projeto do piloto no dashboard, Quando o usuário sobe 1 arquivo do template (profile mode) e abre a página do RAL, Então a extensão detecta o mapping e o fill preenche o grid completo.

**US-6.2 — Ensaio live sem gravar (homologação)** — **Must, P**
Como dono do produto, quero uma sessão acompanhada onde o usuário preenche uma página real **sem clicar Gravar**, para validar selectors e formatos no site vivo (postbacks, validações server-side) com risco zero.
- Dado o site real logado, Quando o fill executa, Então 100% dos campos mapeados ficam corretos na conferência visual; divergências viram itens de correção.

**US-6.3 — Piloto real com métricas** — **Must, P**
Como dono do produto, quero o usuário completando a declaração real com o cronômetro rodando, para medir o ganho contra o processo manual.
- Dado o ensaio aprovado, Quando o usuário completa ≥1 sub-form real e submete, Então registramos: tempo por formulário, nº de campos auto-preenchidos vs corrigidos à mão, erros, e depoimento qualitativo.

### Fora do MVP (considerado e cortado)
AUTOPILOTO/auto-advance; AI smart-mapping; busca híbrida; execução headless em nuvem; processamento assíncrono 12k linhas; grid de curadoria/revisão de dados no dashboard (1 usuário corrige no Excel); fix dos 2 bugs cosméticos (`batch-settings-no-success-toast`, `batch-card-buttons-cosmetic`); Turborepo real + `packages/commons`/`eslint-config`/`tsconfig` (reconstrução do monorepo documentado); Mercado Consumidor e demais sub-forms (segunda fatia); ação `verify` no executor; multi-URL orchestration; Chrome Web Store pública.

---

## 7. Roadmap faseado

```
F0 ──► F1 ──► F2 ──► F3 ──► F4 ──► F5
(smoke) (lab     (motor + (deploy) (piloto
 +tool   sintético) lab RAL)         live)
```

| Fase | Conteúdo | Stories | Depende de | Milestone (gate de saída) |
|---|---|---|---|---|
| **F0 — Chão firme** | Smoke manual UAT-37 + E2E local; commitar WIP; lockfile único + scripts root | US-1.1, US-1.2, US-4.1 | — | Fluxo upload→capture→fill funciona localmente em form sintético, com resultado documentado |
| **F1 — Lab sintético** | Playwright + testes do executor nos 5 forms sintéticos; type-check limpo | US-3.1, US-4.2 | F0 | `npm run test:e2e` verde nos sintéticos |
| **F2 — Motor pronto p/ RAL** | radio-by-value, transform pt-BR, normalização select, esconder verify | US-2.1, US-2.2, US-2.3, US-2.4 | F1 (testes prontos para validar) | Novos recursos cobertos por testes no lab sintético |
| **F3 — Lab RAL verde** | mhtml→fixtures, field map, teste completo da Movimentação | US-3.2, US-3.3, US-3.4 | F2 | **Gate do piloto:** mapping da Movimentação 100% verde no fixture |
| **F4 — Deploy mínimo** | API/Web/DB produção, extensão configurável + instalável | US-5.1, US-5.2, US-5.3, US-5.4 | F0 (pode rodar em paralelo a F1–F3) | Usuário piloto loga no dashboard de produção e conecta a extensão |
| **F5 — Piloto live** | Mapping de produção, ensaio sem gravar, declaração real medida | US-6.1, US-6.2, US-6.3 | F3 + F4 | **Pilot live:** ≥1 sub-form RAL real preenchido, conferido e submetido |

Paralelismo: F4 (deploy) é independente de F1–F3 e pode andar em paralelo. F2 depende de F1 apenas para ter onde testar — o código pode começar antes.

---

## 8. Definição de Pronto (DoD) do piloto, métricas, riscos e perguntas abertas

### DoD do piloto
- [ ] Offline Lab verde: sintéticos + fixture RAL Movimentação (CI ou comando único documentado).
- [ ] API, web e DB em produção; extensão instalada no Chrome do usuário piloto apontando para produção.
- [ ] Usuário piloto, com o próprio login no site da ANM, preencheu ≥1 formulário de Movimentação da Produção Bruta real via extensão, conferiu visualmente e clicou Gravar ele mesmo.
- [ ] Linha marcada com `fillStatus` correto (VALID/ERROR) no dashboard após a execução.
- [ ] Métricas da sessão registradas (abaixo).

### Critérios de sucesso mensuráveis
1. **Tempo:** preencher 1 form de Movimentação via extensão ≤ 50% do tempo manual do usuário (baseline medida com ele antes).
2. **Correção:** ≥ 95% dos campos mapeados corretos na primeira execução live (sem edição manual); 100% após conferência (o usuário é o gate final — Copiloto).
3. **Cobertura:** 100% dos campos editáveis do grid preenchidos automaticamente (96/96); só ajuste de estoque e botões manuais.
4. **Confiabilidade:** 0 erros de extensão (port timeout, auth, fill abort) durante a sessão do piloto.
5. **Adoção:** o usuário declara que usaria na próxima janela RAL (sim/não + por quê).

### Riscos e suposições
| # | Risco / Suposição | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Site live difere dos snapshots (postbacks, validação JS, IDs dinâmicos por sessão) | Média | Alto | US-6.2 (ensaio sem gravar) antes de qualquer submissão; fallback selectors |
| R2 | SheetJS lê células do template com formato inesperado (datas, fórmulas, merged cells) | Média | Médio | US-3.3 usa o template oficial real como fixture de ingestão |
| R3 | Janela de submissão do RAL é sazonal (tipicamente até 15/03) — site pode não aceitar declaração fora do período | **Alta** | **Alto** | Pergunta aberta Q3; se fechado, piloto roda em ambiente de ensaio (sem Gravar) e a submissão real espera a janela |
| R4 | `prefix matching` de URL não casa com a URL real do RAL (query strings, session tokens no path) | Média | Médio | Verificar URL real no ensaio; ajustar `targetUrl` ou relaxar matching |
| R5 | Postback de `Calcular Estoque`/`Adicionar` no meio do fluxo reseta o form preenchido | Média | Médio | Ordenar steps para deixar postbacks por último/manuais; documentar a ordem para o usuário |
| R6 | Review da Chrome Web Store atrasa a instalação | Baixa | Baixo | Fallback "Load unpacked" com guia |
| R7 | Suposição: 1 usuário piloto disponível e com dados reais de mineração | — | Alto | Confirmar com o dono (Q5) |

### Perguntas abertas ao dono do produto
1. **Multi-step (decisão de produto):** confirmo a resolução "1 mapping por URL + navegação humana" para o piloto? A visão do CONTEXT.md (sequência de passos com navegação) fica para um milestone pós-piloto?
2. **`fupExcel` — o site do governo já importa Excel nesses forms** [verificado nos 2 snapshots analisados]. O usuário piloto já usa esse import nativo? Se sim, a dor real dele está em **quais** sub-forms (os sem import? o retrabalho de converter dados?) — isso pode mudar a fatia recomendada. Preciso dessa resposta antes do F3.
3. **Janela RAL:** a declaração RAL é tipicamente entregue jan–mar. Estamos em junho/2026 — o site aceita declaração/retificação agora? Qual é a data-alvo real do usuário? Isso define se o "pilot live" termina em submissão real ou em ensaio completo aguardando a janela.
4. **Qual sub-form dói mais** para o usuário piloto (volume × frequência)? Recomendo Movimentação pela estrutura, mas a dor dele manda.
5. **Quem é o usuário piloto** e quantos empreendimentos/minas/processos ele declara? (Define quantos arquivos profile-mode e se o volume justifica a segunda fatia.)
6. **Domínio de produção:** já existe domínio/nome para `API_URL`/`WEB_URL` ou uso os subdomínios das plataformas (railway.app/vercel.app)?
