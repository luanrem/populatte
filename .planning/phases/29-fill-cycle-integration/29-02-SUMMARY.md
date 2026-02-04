---
phase: 29
plan: 02
subsystem: extension-fill
tags: [fill-cycle, orchestration, row-api, content-script]

dependency_graph:
  requires: ["29-01"]
  provides: ["fill-orchestration", "row-fetch", "progress-tracking"]
  affects: ["29-03", "29-04"]

tech_stack:
  added: []
  patterns: ["fill-orchestration", "message-passing", "module-state"]

key_files:
  created:
    - apps/extension/src/api/rows.ts
  modified:
    - apps/extension/src/api/index.ts
    - apps/extension/entrypoints/background.ts
    - apps/extension/entrypoints/popup/App.tsx

decisions:
  - id: "29-02-01"
    decision: "Use currentMappingId module state for fill instead of preferences lookup"
    rationale: "Module state represents the current UI selection, which may differ from stored preferences when auto-selected"

metrics:
  duration: "3m 1s"
  completed: "2026-02-04"
---

# Phase 29 Plan 02: Fill Orchestration Implementation Summary

Fill cycle orchestration from button click through content script step execution with progress feedback.

## Summary

Implemented the complete fill orchestration flow in the extension background script. User clicking Fill now triggers FILL_START message, which fetches mapping steps and row data, sends FILL_EXECUTE to content script, and broadcasts progress updates back to the popup.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create rows API client | 83212e4 | rows.ts, index.ts |
| 2 | Implement FILL_START handler | 19ab7f4 | background.ts, messages.ts |
| 3 | Wire progress updates | 9305faf | background.ts, App.tsx |

## Decisions Made

### Decision 29-02-01: Use module state for mapping selection

**Context:** FILL_START handler needs the selected mapping ID. Options were:
- Look up from preferences (`prefs.lastMappingIdByProject[projectId]`)
- Use module state (`currentMappingId`)

**Decision:** Use `currentMappingId` module state.

**Rationale:** The module state represents the current UI selection. When a mapping is auto-selected (single match or returning to a URL), the UI shows it but preferences may not have it stored yet. Using module state ensures the fill uses what the user sees.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] fillStatus reset on row navigation**

- **Found during:** Task 3
- **Issue:** fillStatus wasn't reset to idle when navigating to next/prev row
- **Fix:** Added `currentFillStatus = 'idle'` in ROW_NEXT, ROW_PREV, and MARK_ERROR handlers
- **Files modified:** background.ts
- **Commit:** 9305faf

**2. [Rule 2 - Missing Critical] fillProgress cleared incorrectly**

- **Found during:** Task 3
- **Issue:** Popup was clearing fillProgress on every STATE_UPDATED, losing progress during active fill
- **Fix:** Only clear fillProgress/fillError when fillStatus is 'idle'
- **Files modified:** App.tsx
- **Commit:** 9305faf

## Verification

- TypeScript compiles without errors in modified files
- Extension builds successfully (262.13 kB)
- Fill flow architecture verified:
  1. FillControls.tsx onClick calls onFill prop
  2. App.tsx handleFill sends FILL_START to background
  3. Background validates selection, fetches mapping+row, sends FILL_EXECUTE to content
  4. Content executes steps, returns result
  5. Background updates fillStatus and broadcasts FILL_PROGRESS
  6. Popup displays progress and final status

## Next Phase Readiness

- FILL_START handler ready
- Row fetching works
- Progress updates flow to popup
- Fill status tracking complete

**Dependencies for 29-03:**
- Background FILL_START handler (this plan)
- API row status update endpoint (deferred, currently stub)
- Fill result handling in popup

## What Changed

### apps/extension/src/api/rows.ts (NEW)
```typescript
export interface RowData {
  id: string;
  data: Record<string, unknown>;
  fillStatus: 'PENDING' | 'VALID' | 'ERROR';
}

export async function fetchRowByIndex(
  projectId: string,
  batchId: string,
  rowIndex: number
): Promise<RowData>
```

### apps/extension/entrypoints/background.ts
- Added `currentFillStatus` module state
- Updated `buildState()` to return dynamic fillStatus
- Added FILL_START handler with full orchestration:
  - Validation of project/batch/mapping
  - Fetch mapping with steps
  - Fetch row data by index
  - Send FILL_EXECUTE to content script
  - Process result and broadcast progress
- Reset fillStatus on row navigation
