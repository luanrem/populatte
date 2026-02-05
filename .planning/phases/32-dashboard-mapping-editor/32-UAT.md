---
status: complete
phase: 32-dashboard-mapping-editor
source: 32-01-SUMMARY.md, 32-02-SUMMARY.md, 32-03-SUMMARY.md
started: 2026-02-05T00:20:00Z
updated: 2026-02-05T00:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Navigate to Mapping Editor
expected: From the mappings list, clicking a mapping row navigates to /mappings/[mappingId]. The page loads with the mapping name in the header, a back button, and a Save button.
result: issue
reported: "clico na linha não faz nada"
severity: major

### 2. View Mapping Properties
expected: The editor displays two collapsible cards - "Basic Info" (name, target URL, active toggle) and "Behavior" (success trigger dropdown). Cards are open by default.
result: issue
reported: "Active Toggle está no card errado (Comportamento ao invés de Informações Básicas). Sem espaçamento entre os cards e a seção de Passos."
severity: minor

### 3. Edit Mapping Name
expected: Editing the mapping name field enables the Save button. Clicking Save persists the change and the button disables again.
result: issue
reported: "Botão Salvar já está ativo no load. Dropdown de gatilho de sucesso não mostra o valor da API. Form state não sincroniza corretamente com dados carregados."
severity: major

### 4. Toggle Active Status
expected: Clicking the active toggle switches between on/off state. The toggle reflects the current value from the API.
result: pass

### 5. Unsaved Changes Warning
expected: After making changes without saving, refreshing the browser or closing the tab shows a "Leave site?" confirmation dialog.
result: pass

### 6. View Steps List
expected: The Steps section shows all steps for the mapping with their order number, action type icon, primary selector, and source column/fixed value.
result: pass
note: "Feedback cosmético: linha do card poderia ser menor, muito espaço em volta para conteúdo em uma linha só"

### 7. Step Action Color Coding
expected: Each step card has a colored left border based on action type: blue for fill, green for click, amber for wait.
result: pass

### 8. Drag-and-Drop Reorder Steps
expected: Dragging a step by its handle reorders the list. Dropping saves the new order immediately.
result: issue
reported: "1) Sem feedback visual de salvamento - API demora mas não mostra loading (sugestão: spinner ou barra de progresso animada no header da seção). 2) Drag overlay confinado ao scroll area - ao arrastar perto das bordas, parece que a página cobre parte do item arrastado (deveria ser overlay global)."
severity: minor

### 9. Add New Step
expected: Clicking the "Add Step" button opens the step editor modal in create mode with empty fields.
result: pass

### 10. Edit Existing Step
expected: Clicking a step card opens the step editor modal with the step's current values pre-filled.
result: pass

### 11. Step Editor Modal Fields
expected: The modal shows: action type dropdown (fill/click/wait), primary selector input, fallback selectors (add up to 5), source column combobox with search, fixed value toggle and input, and options (clearFirst, humanDelay).
result: pass
note: "Options são: usar valor fixo, opcional, limpar antes, pressionar enter"

### 12. Save Step
expected: Completing the step form and clicking Save creates/updates the step. The modal closes and the steps list refreshes.
result: pass
note: "Corrigido bug: toggle 'usar valor fixo' não limpava campo anterior e schema não aceitava undefined"

### 13. Delete Step
expected: Clicking the delete button on a step card shows a confirmation dialog. Confirming removes the step from the list.
result: pass
note: "Funciona, mas falta feedback visual de loading (mesma sugestão do test 8: shimmer/progress bar no header da seção)"

### 14. Empty Steps State
expected: When a mapping has no steps, the section shows an empty state message with a prompt to add the first step.
result: pass

## Summary

total: 14
passed: 10
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Clicking mapping row navigates to editor page"
  status: fixed
  reason: "User reported: clico na linha não faz nada"
  severity: major
  test: 1
  root_cause: "Link apontava para rota errada e faltava projectId query param"
  artifacts:
    - path: "apps/web/components/projects/mappings-list.tsx"
      issue: "Link href incorreto e sem onClick na row"
  missing: []
  debug_session: ""

- truth: "Basic Info card contains active toggle, Behavior card contains only success trigger"
  status: failed
  reason: "User reported: Active Toggle está no card errado (Comportamento ao invés de Informações Básicas). Sem espaçamento entre os cards e a seção de Passos."
  severity: minor
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Form state syncs correctly with API data, Save button disabled on load"
  status: failed
  reason: "User reported: Botão Salvar já está ativo no load. Dropdown de gatilho de sucesso não mostra o valor da API. Form state não sincroniza corretamente com dados carregados."
  severity: major
  test: 3
  root_cause: ""
  artifacts:
    - path: "apps/web/app/(platform)/mappings/[mappingId]/page.tsx"
      issue: "useForm values/reset não sincroniza corretamente"
    - path: "apps/web/app/(platform)/mappings/[mappingId]/_components/mapping-properties-section.tsx"
      issue: "Select não exibe valor carregado"
  missing: []
  debug_session: ""

- truth: "Drag-and-drop has visual feedback and proper overlay"
  status: failed
  reason: "User reported: 1) Sem feedback visual de salvamento - API demora mas não mostra loading. 2) Drag overlay confinado ao scroll area - ao arrastar perto das bordas, parece que a página cobre parte do item."
  severity: minor
  test: 8
  root_cause: ""
  artifacts:
    - path: "apps/web/app/(platform)/mappings/[mappingId]/_components/steps-section.tsx"
      issue: "Falta loading state no reorder e DragOverlay não usa portal"
  missing:
    - "Adicionar feedback visual (spinner ou progress bar) durante reorder"
    - "Usar createPortal para DragOverlay aparecer acima de tudo"
  debug_session: ""
