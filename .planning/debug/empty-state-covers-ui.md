---
status: resolved
trigger: "Empty state covers entire Preencher UI including project/batch selectors"
created: 2026-02-06T00:00:00Z
updated: 2026-02-06T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - The ternary at line 559 renders empty state OR selectors, never both
test: Read App.tsx conditional rendering logic
expecting: Empty state and selectors are in mutually exclusive branches of a ternary
next_action: Document root cause

## Symptoms

expected: Empty state should only cover content area below selectors; project selector, batch selector, and connection indicator in the header should always remain visible and interactive
actual: Empty state (Coffee icon + "Selecione um projeto e batch para comecar") covers entire UI including selector dropdowns, making them inaccessible
errors: None (cosmetic/UX blocker)
reproduction: Open Preencher tab without selecting project/batch
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-02-06T00:00:00Z
  checked: App.tsx lines 556-636 (Preencher tab rendering)
  found: |
    Line 559 has a ternary: `{!state.batchId ? ( <empty state> ) : ( <selectors + content> )}`
    The ProjectSelector (line 569-573) and BatchSelector (line 574-579) are INSIDE the else branch.
    When !state.batchId is true, the entire content area is replaced by the empty state.
    The selectors are never rendered when there is no batch, creating a deadlock: user cannot select a batch because the selector is hidden by the empty state that says "select a batch".
  implication: This is the root cause. The selectors must be rendered OUTSIDE the ternary so they are always visible.

## Resolution

root_cause: |
  In App.tsx line 559, the conditional `{!state.batchId ? (empty state) : (selectors + content)}`
  places the ProjectSelector and BatchSelector components INSIDE the else branch of the ternary.
  When no batch is selected, the empty state replaces the ENTIRE preencher content area, including
  the selector dropdowns. This creates a deadlock: the user cannot select a project/batch because
  the selectors are hidden behind the empty state that tells them to select a project/batch.

fix: |
  Move ProjectSelector and BatchSelector OUTSIDE the ternary so they always render.
  The empty state should only replace the content below the selectors (steps list, fill controls).
  Structure should be:
    <ProjectSelector />
    <BatchSelector />
    {!state.batchId ? <empty state> : <steps + fill controls>}

verification:
files_changed:
  - apps/extension/entrypoints/sidepanel/App.tsx
