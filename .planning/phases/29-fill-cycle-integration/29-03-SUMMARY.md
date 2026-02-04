---
phase: 29
plan: 03
subsystem: extension-fill
tags: [fill-cycle, row-status, api-integration, error-tracking]

dependency_graph:
  requires: ["29-02"]
  provides: ["row-status-persistence", "fill-error-tracking"]
  affects: ["29-04"]

tech_stack:
  added: []
  patterns: ["api-call-after-action", "error-recovery"]

key_files:
  created: []
  modified:
    - apps/extension/src/api/rows.ts
    - apps/extension/src/api/index.ts
    - apps/extension/entrypoints/background.ts

decisions:
  - id: "29-03-01"
    decision: "Row status update errors do not block fill flow"
    rationale: "User should see fill success/failure regardless of status persistence; status can be retried later"

metrics:
  duration: "1m 2s"
  completed: "2026-02-04"
---

# Phase 29 Plan 03: Row Status Updates Summary

Row status updates to VALID/ERROR after fill attempts, persisted via API with error tracking.

## Summary

Implemented row status persistence after fill operations. The extension now calls the backend API to update row fillStatus to VALID on successful fills or ERROR on failures. The MARK_ERROR button also now calls the API to persist the error status with a reason. Error details including the failing step ID are stored for debugging.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create updateRowStatus API function | f049b7e | rows.ts, index.ts |
| 2 | Wire MARK_ERROR to call API | 587a9af | background.ts |
| 3 | Update row status after fill attempt | 5df5818 | background.ts |

## Decisions Made

### Decision 29-03-01: Status update errors are non-blocking

**Context:** After fill execution, we update row status via API. What happens if that API call fails?

**Decision:** Log the error but do not fail the fill operation.

**Rationale:** The user has seen the fill result (success/failure) in the UI. The status persistence is important for tracking but should not block the user's workflow. If status update fails, the row can be retried or manually corrected.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles without errors in modified files
- Extension builds successfully (263.22 kB)
- API function signature matches backend endpoint:
  - PATCH `/projects/:projectId/batches/:batchId/rows/:rowId/status`
  - Body: `{ fillStatus, fillErrorMessage?, fillErrorStep? }`
- MARK_ERROR handler:
  - Fetches row ID from current selection
  - Calls updateRowStatus with ERROR and reason
  - Advances to next row regardless of API result
- FILL_START handler:
  - Updates row to VALID on success
  - Updates row to ERROR on failure with error message and failing step ID
  - Continues normal flow even if status update fails

## Next Phase Readiness

- Row status persists after fill operations
- Error tracking with step ID for debugging
- Retry mechanism available via row navigation

**Dependencies for 29-04:**
- Row status persistence (this plan)
- Fill execution (29-02)
- Progress counting will need row status queries

## What Changed

### apps/extension/src/api/rows.ts
```typescript
export async function updateRowStatus(
  projectId: string,
  batchId: string,
  rowId: string,
  status: 'PENDING' | 'VALID' | 'ERROR',
  errorMessage?: string,
  errorStep?: string
): Promise<void>
```

### apps/extension/entrypoints/background.ts
- MARK_ERROR handler now calls `updateRowStatus` with ERROR and reason
- FILL_START handler calls `updateRowStatus` after processing fill result
- Error step ID extracted from stepResults for failed fills
