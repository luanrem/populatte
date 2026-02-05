---
status: diagnosed
trigger: "Next/Prev row navigation buttons are disabled in extension popup after selecting a batch"
created: 2026-02-05T00:00:00Z
updated: 2026-02-05T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Next button disabled state is gated by fillStatus, not by batch selection
test: Read FillControls.tsx disabled logic
expecting: Disabled condition depends on fillStatus only
next_action: Report root cause

## Symptoms

expected: Next/Prev buttons should be enabled after selecting a batch with multiple rows
actual: Next button is disabled, preventing row navigation
errors: None reported
reproduction: Select a batch with identifier fields configured, observe Next button is disabled
started: By design - the FillControls component was built for COPILOTO mode (fill-then-navigate)

## Eliminated

## Evidence

- timestamp: 2026-02-05T00:01:00Z
  checked: FillControls.tsx lines 35-36, 83-86
  found: |
    The Next button disabled condition is: `disabled={!canConfirm}`
    where `canConfirm = fillStatus === 'success' || fillStatus === 'partial' || fillStatus === 'failed'`
    This means Next is ONLY enabled after a fill operation completes (success/partial/failed).
    When fillStatus is 'idle' (default after batch selection, after ROW_NEXT), canConfirm is false => button disabled.
  implication: This is the direct cause - the Next button was designed to only work AFTER a fill, not for free navigation.

- timestamp: 2026-02-05T00:02:00Z
  checked: App.tsx line 388 - FillControls props
  found: |
    FillControls receives: fillStatus from state.fillStatus, which starts as 'idle'.
    The handleNext function (line 147-155) sends 'ROW_NEXT' message to background.
    Background ROW_NEXT handler (background.ts line 384-404) resets currentFillStatus to 'idle' after advancing.
    So even after navigating, fillStatus goes back to 'idle', re-disabling the button.
  implication: Even if the button were briefly enabled, navigating would re-disable it immediately for the next row.

- timestamp: 2026-02-05T00:03:00Z
  checked: App.tsx lines 379-396 - Render order
  found: |
    RowIndicator (line 379-386) shows row position and identifiers.
    FillControls (line 388-396) contains Fill, Next, and Mark Error buttons.
    There are NO separate Prev/Next navigation buttons outside of FillControls.
    RowIndicator has NO navigation buttons - it is purely a display component.
  implication: Row navigation is exclusively controlled by FillControls, which gates it behind fill completion.

- timestamp: 2026-02-05T00:04:00Z
  checked: Background script BATCH_SELECT handler (background.ts lines 349-382)
  found: |
    When a batch is selected, storage.selection.setSelectedBatch(batchId, rowTotal) is called.
    This correctly sets rowTotal in storage (selection.ts line 69-77).
    The buildState function (background.ts line 199) correctly reads rowTotal from storage.
    rowTotal IS correctly propagated to the popup state.
  implication: rowTotal is correctly set. The issue is NOT about rowTotal being 0.

- timestamp: 2026-02-05T00:05:00Z
  checked: Background script ROW_NEXT handler (background.ts lines 384-404)
  found: |
    Line 386: `currentFillStatus = 'idle'` - resets fill status on every row advance.
    This means after advancing a row, the Next button becomes disabled again.
    The flow is: Fill -> button enables -> click Next -> row advances -> fillStatus resets to idle -> button disables.
  implication: The COPILOTO flow works as designed (fill-per-row), but there is no way to skip rows or browse data without filling.

- timestamp: 2026-02-05T00:06:00Z
  checked: No Prev button exists anywhere
  found: |
    FillControls.tsx has NO Prev button at all - only Fill, Next, and Mark Error.
    App.tsx has no handlePrev function, even though background.ts handles ROW_PREV message (line 406-426).
    The Prev button was never rendered in the popup UI.
  implication: Even the ROW_PREV handler in the background is dead code from the popup's perspective - there is no UI element to trigger it.

## Resolution

root_cause: |
  TWO ISSUES FOUND:

  1. **Next button gated by fillStatus (PRIMARY):** In FillControls.tsx line 36, the Next button
     is only enabled when `fillStatus === 'success' || fillStatus === 'partial' || fillStatus === 'failed'`.
     After selecting a batch, fillStatus is 'idle', so the button is disabled. This was intentional
     for the COPILOTO mode (fill-then-advance), but prevents free row navigation (browsing data,
     skipping rows).

  2. **No Prev button exists (SECONDARY):** The popup UI has no Prev button at all. The background
     script has a ROW_PREV handler (background.ts line 406-426), but no UI triggers it. Users
     cannot go back to a previous row.

  **Root file:** apps/extension/entrypoints/popup/components/FillControls.tsx
  **Root line:** Line 36 (`const canConfirm = fillStatus === 'success' || fillStatus === 'partial' || fillStatus === 'failed'`)
  **Secondary file:** apps/extension/entrypoints/popup/App.tsx (no Prev button, no handlePrev)

fix: |
  Two approaches depending on product intent:

  **Option A: Add separate Prev/Next navigation buttons to RowIndicator**
  - Add Prev/Next arrow buttons flanking the "Row X of Y" display in RowIndicator.tsx
  - These would be enabled whenever rowTotal > 1 (independent of fillStatus)
  - Keep FillControls Next as a "confirm and advance" action
  - Cleanest separation: RowIndicator = navigation, FillControls = fill workflow

  **Option B: Relax FillControls Next button condition**
  - Change `canConfirm` to also allow navigation when a batch is selected (hasBatch)
  - Add a Prev button to FillControls
  - Simpler change but muddies the fill workflow semantics

  Recommended: Option A - separate navigation concerns from fill workflow concerns.

verification:
files_changed: []
