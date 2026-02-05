---
status: complete
phase: 33-extension-capture-mode
source: 33-01-SUMMARY.md, 33-02-SUMMARY.md, 33-03-SUMMARY.md, 33-04-SUMMARY.md
started: 2026-02-05T14:00:00Z
updated: 2026-02-05T14:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Element Highlighting on Hover
expected: In capture mode, hovering over a form element shows a blue outline highlight around the element and a tooltip with element info (tag, class, etc.)
result: pass

### 2. Click to Capture Element
expected: Clicking a form element captures it, generates a CSS selector, and adds a numbered badge on the element showing its position in the capture list
result: pass

### 3. Captured Step Appears in Popup
expected: After capturing an element, a new step immediately appears in the popup's step list with the selector and default action type
result: pass

### 4. Drag-and-Drop Step Reordering
expected: Dragging a step by its handle allows reordering; releasing in new position updates the list order and badge numbers on the page
result: pass

### 5. Step Configuration Form
expected: Clicking a step opens configuration view with action type (click/fill/select), source mode (column/fixed), column dropdown, and options
result: pass

### 6. Add Wait Step
expected: "Add Wait" button inserts a wait step with configurable delay (500ms, 1s, 2s presets or custom)
result: pass

### 7. Delete Step from List
expected: Clicking delete (trash icon) on a step removes it from the list and removes the badge from the page
result: pass

### 8. Save Mapping to Backend
expected: Clicking "Salvar Mapping" saves all steps to the API and shows success state with "Editar no Dashboard" and "Comecar a Preencher" buttons
result: pass
note: Labels inconsistent - "Cancel", "Save Mapping", "Mapping Name", "Add Wait Step" in English, rest in Portuguese. Need full PT-BR localization.

### 9. Capture Mode Persists Across Popup Close/Reopen
expected: Closing and reopening the popup during capture mode restores the capture panel with all previously captured steps intact
result: pass

### 10. Cancel Capture with Confirmation
expected: Clicking "Cancelar" when steps exist shows confirmation; confirming exits capture mode and clears all captured steps
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
