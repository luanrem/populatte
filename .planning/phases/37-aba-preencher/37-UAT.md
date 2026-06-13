---
status: testing
phase: 37-aba-preencher
source: [37-01-SUMMARY.md, 37-02-SUMMARY.md, 37-03-SUMMARY.md]
started: 2026-02-08T12:00:00Z
updated: 2026-02-08T12:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Preencher Tab Layout
expected: |
  Open the Side Panel. The Preencher tab shows: compact connection status (dot + text) in the header, project/batch selectors, mapping info, and a sticky footer with row navigator and fill controls always visible at the bottom. All content fits within ~320px width without horizontal scrolling.
awaiting: user response

## Tests

### 1. Preencher Tab Layout
expected: Open the Side Panel. The Preencher tab shows: compact connection status (dot + text) in the header, project/batch selectors, mapping info, and a sticky footer with row navigator and fill controls always visible at the bottom. All content fits within ~320px width without horizontal scrolling.
result: [pending]

### 2. Empty State
expected: With no batch selected, the Preencher tab shows a Coffee icon with the message "Selecione um projeto e batch para comecar".
result: [pending]

### 3. Steps List Collapsed by Default
expected: After selecting a project, batch, and mapping, a steps section appears below the mapping name. It is collapsed by default showing a summary count (e.g., "5 passos"). A chevron toggle expands it to reveal the full list.
result: [pending]

### 4. Steps List Content
expected: Expand the steps list. Each step shows its action icon, CSS/XPath selector text, and source field name.
result: [pending]

### 5. Drag-and-Drop Step Reordering
expected: In the expanded steps list, drag a step to a different position. The step moves to the new position smoothly.
result: [pending]

### 6. Invalid Selector Badge
expected: If any step has a CSS/XPath selector that does not match an element on the current page, it shows a red dot badge. Hovering the badge shows a tooltip with the selector value. The collapsed header shows a count like "X de Y passos com problema".
result: [pending]

### 7. Click Step to Highlight Element
expected: Click a step in the list. The corresponding element on the web page gets highlighted with an amber/gold outline and scrolls into view. The highlight auto-dismisses after ~3 seconds.
result: [pending]

### 8. Element Not Found Toast
expected: Click a step whose selector does not match any element on the page. A toast notification appears: "Elemento nao encontrado na pagina" and auto-clears after ~3 seconds.
result: [pending]

### 9. Fill Result Indicators (Gap Closure Retest)
expected: After running fill on a row, each step shows a green check (success) or red cross (failed) indicator. These indicators appear even if the overall fill had some failures (partial fill scenario). This was the issue fixed in 37-03.
result: [pending]

### 10. Fill Results Clear on Row Navigation
expected: After filling a row and seeing fill result indicators, navigate to a different row (next/previous). All fill result indicators clear, giving a fresh state for the new row.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
