---
status: diagnosed
phase: 37-aba-preencher
source: 37-01-SUMMARY.md, 37-02-SUMMARY.md
started: 2026-02-06T22:00:00Z
updated: 2026-02-06T22:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Preencher Tab Layout
expected: Open the Side Panel. The Preencher tab shows a compact layout that fits within ~320px width. Content area scrolls if needed. No horizontal scrollbar appears.
result: pass

### 2. Connection Status Indicator
expected: In the Preencher tab header, a compact connection indicator shows as a dot + text (e.g., green dot + "Conectado" when connected). It's inline in the header, not a separate block.
result: pass

### 3. Empty State (No Batch Selected)
expected: When no project/batch is selected, the Preencher tab shows a Coffee icon with the message "Selecione um projeto e batch para comecar".
result: issue
reported: "Apareceu, so que nao era pra deselecionar. Ele cobriu todo lugar, nao consegui selecionar o outro dai. A label ali com o cafezinho fica na frente e eu nao consigo ver outro."
severity: blocker

### 4. Steps List - Collapsed by Default
expected: After selecting a mapping with steps, the steps list section appears collapsed by default showing a summary (e.g., step count). A chevron toggle allows expanding to see all steps.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

### 5. Steps List - Expanded View
expected: Expanding the steps list shows each step with its action icon, selector text, and source field. The list is readable and doesn't require horizontal scrolling.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

### 6. Steps List - Drag and Drop Reorder
expected: You can drag a step to a different position in the list. The step moves to the new position and the list reorders accordingly.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

### 7. Sticky Footer with Fill Controls
expected: The bottom of the Preencher tab always shows the row navigator (row number, prev/next arrows) and fill controls (fill button). These stay visible even when scrolling the content above.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

### 8. Click Step to Highlight Element
expected: Click a step in the expanded steps list. The corresponding element on the web page gets an amber/gold outline and the page scrolls to bring it into view. The highlight auto-dismisses after ~3 seconds.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

### 9. Invalid Selector Badges
expected: If a step's CSS/XPath selector doesn't match any element on the current page, a red dot badge appears on that step. Hovering the badge shows a tooltip with the selector value.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

### 10. Element Not Found Toast
expected: When you click a step whose selector doesn't match anything on the page, a toast notification appears saying "Elemento nao encontrado na pagina" and auto-clears after ~3 seconds.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

### 11. Fill Result Indicators
expected: After running a fill operation, each step shows a green check (success) or red cross (failed) indicator based on whether its fill action succeeded.
result: skipped
reason: Blocked by test 3 - empty state covers UI, cannot select project/batch

## Summary

total: 11
passed: 2
issues: 1
pending: 0
skipped: 8

## Gaps

- truth: "Empty state shows Coffee icon when no batch selected, without blocking project/batch selection UI"
  status: failed
  reason: "User reported: Empty state with coffee icon covers entire UI including selectors. Once it appears, user cannot select any project/batch because the label is in front of the controls."
  severity: blocker
  test: 3
  root_cause: "In App.tsx, the ternary `!state.batchId ? (empty state) : (selectors + content)` places ProjectSelector and BatchSelector INSIDE the else branch. When no batch is selected, the empty state replaces the entire content including selectors, creating a deadlock."
  artifacts:
    - path: "apps/extension/entrypoints/sidepanel/App.tsx"
      issue: "ProjectSelector and BatchSelector inside conditional branch that hides them when no batch selected"
  missing:
    - "Move ProjectSelector and BatchSelector outside the ternary so they always render"
  debug_session: ".planning/debug/empty-state-covers-ui.md"
