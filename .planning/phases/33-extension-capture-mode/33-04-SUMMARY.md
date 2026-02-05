---
phase: 33
plan: 04
subsystem: extension
tags: [capture-mode, messaging, popup, content-script]

dependencies:
  requires: [33-01, 33-02, 33-03]
  provides: [capture-mode-integration, end-to-end-capture-flow]
  affects: [34-population-mode]

tech-stack:
  added: []
  patterns: [message-relay, module-level-state, loading-states, success-states]

key-files:
  created: []
  modified:
    - apps/extension/entrypoints/content.ts
    - apps/extension/entrypoints/background.ts
    - apps/extension/entrypoints/popup/App.tsx
    - apps/extension/entrypoints/popup/components/index.ts
    - apps/extension/entrypoints/popup/components/capture/CapturePanel.tsx
    - apps/extension/src/content/capture/capture-mode.ts

decisions:
  - id: D33-04-01
    decision: "Module-level captureMode instance in content script"
    rationale: "Persists across messages, allows cleanup on CAPTURE_STOP"
  - id: D33-04-02
    decision: "Background relays capture messages to content script"
    rationale: "Popup cannot directly message content scripts, background acts as router"
  - id: D33-04-03
    decision: "Hardcoded dashboard URL"
    rationale: "Matches API pattern, avoids Vite env type issues"

metrics:
  duration: ~8min
  completed: 2026-02-05
---

# Phase 33 Plan 04: Capture Flow Integration Summary

**End-to-end capture mode wiring: popup entry, content script handlers, background relay, and success state.**

## What Was Built

This plan wired together all the capture mode components built in plans 33-01, 33-02, and 33-03 into a working end-to-end flow.

### 1. Content Script Handlers (Task 1)

Added message handlers to `content.ts`:
- `CAPTURE_START`: Creates and activates CaptureMode instance
- `CAPTURE_STOP`: Deactivates and cleans up CaptureMode
- `CAPTURE_HIGHLIGHT`: Scrolls to and highlights a captured element
- `CAPTURE_REMOVE_STEP`: Removes a step's badge from the page

Added `highlightStep` method to CaptureMode class for visual feedback when user clicks a step in the popup.

### 2. Background Script Relay (Task 2)

Added capture message relay to `background.ts`:
- Routes CAPTURE_START, CAPTURE_STOP, CAPTURE_HIGHLIGHT, CAPTURE_REMOVE_STEP from popup to content script via `tabs.sendMessage`
- Acknowledges ELEMENT_CAPTURED and ALREADY_CAPTURED messages from content script

### 3. Popup Integration (Task 3)

Updated `App.tsx` with:
- Capture mode state (captureMode, batchColumns, currentUrl)
- "Criar Mapping" button shown when batch selected but no mapping exists for current URL
- Entry handler that fetches batch columns and sends CAPTURE_START
- Exit handler that sends CAPTURE_STOP
- Save mapping handler that creates mapping via API and refreshes state

Updated `CapturePanel.tsx` with:
- Loading state (isSaving) with spinner during save
- Success state (savedMapping) with action buttons after save
- "Editar no Dashboard" link button
- "Começar a Preencher" button to exit capture mode

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Module-level captureMode instance | Persists across messages, cleaned up on CAPTURE_STOP |
| Background as message router | Popup cannot directly message content scripts |
| Hardcoded dashboard URL | Matches existing API URL pattern, avoids env type issues |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 269b11f | feat | Add capture mode handlers to content script |
| 5059f89 | feat | Add capture message relay to background script |
| 626aae4 | feat | Wire capture mode into popup App with loading and success states |

## Message Flow

```
User clicks "Criar Mapping" in popup
  -> App.tsx sends CAPTURE_START to background
  -> background.ts relays to content.ts
  -> content.ts activates CaptureMode
  -> User clicks element on page
  -> CaptureMode sends ELEMENT_CAPTURED to runtime
  -> popup receives via onMessage listener
  -> CapturePanel adds step to list
  -> User clicks "Save"
  -> App.tsx calls createMappingWithSteps API
  -> App.tsx sends CAPTURE_STOP to cleanup
  -> CapturePanel shows success state
```

## Files Changed

| File | Changes |
|------|---------|
| entrypoints/content.ts | Import CaptureMode, add module-level instance, handle 4 capture messages |
| entrypoints/background.ts | Add capture message relay cases in switch statement |
| entrypoints/popup/App.tsx | Add capture state, handlers, conditional render CapturePanel |
| entrypoints/popup/components/index.ts | Export capture module |
| entrypoints/popup/components/capture/CapturePanel.tsx | Add loading/success state, action buttons |
| src/content/capture/capture-mode.ts | Add highlightStep method |

## Pre-existing Issues

Type check fails due to pre-existing issues in `handlers.ts` and `send.ts` (not related to this plan):
- Unused type imports
- Missing `DEV` and `browser` type definitions

Lint fails due to ESLint v9 migration not completed.

## Verification Status

- [x] Content script handles capture messages and activates CaptureMode
- [x] Background relays messages between popup and content
- [x] Popup shows "Criar Mapping" button when batch selected and no mapping exists
- [x] CapturePanel receives ELEMENT_CAPTURED messages via browser.runtime.onMessage
- [x] Loading spinner shows during save operation
- [x] Success state shows with "Editar no Dashboard" and "Começar a Preencher" buttons

## Next Phase Readiness

Phase 33 is now complete. All capture mode components are wired:
- Element highlighting and capture
- Badge tracking
- Selector generation
- Step list with drag-and-drop
- Step configuration
- Save to API with loading/success states

Ready for Phase 34: Population Mode (fill cycle using created mappings).
