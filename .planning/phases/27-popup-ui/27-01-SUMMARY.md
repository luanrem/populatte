---
phase: 27-popup-ui
plan: 01
subsystem: api
tags: [extension, api, fetch, projects, batches]

# Dependency graph
requires:
  - phase: 26-extension-auth
    provides: fetchWithAuth authenticated API client
provides:
  - fetchProjects() function for listing user projects
  - fetchBatches(projectId) function for listing batches with progress
  - GET_PROJECTS background handler
  - GET_BATCHES background handler with completed batch filtering
  - BatchWithProgress type for progress tracking
affects: [27-02, 27-03, popup-selection-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "API functions in src/api/ with fetchWithAuth"
    - "Background handlers with try/catch and sendResponse pattern"

key-files:
  created:
    - apps/extension/src/api/projects.ts
    - apps/extension/src/api/batches.ts
  modified:
    - apps/extension/src/api/index.ts
    - apps/extension/src/types/responses.ts
    - apps/extension/entrypoints/background.ts

key-decisions:
  - "MVP progress: pendingCount=rowCount, doneCount=0 (real progress deferred to Phase 29)"
  - "Completed batches filtered from GET_BATCHES response per CONTEXT.md"

patterns-established:
  - "API functions follow auth.ts pattern with error message extraction"
  - "Background handlers follow AUTH_LOGIN pattern with nested try/catch"

# Metrics
duration: 1m 35s
completed: 2026-02-04
---

# Phase 27 Plan 01: API Handlers Summary

**Project and batch API functions with background handlers for popup selection dropdowns**

## Performance

- **Duration:** 1m 35s
- **Started:** 2026-02-04T02:02:29Z
- **Completed:** 2026-02-04T02:04:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created fetchProjects() to GET /projects with authentication
- Created fetchBatches(projectId) to GET /projects/:id/batches with progress fields
- Added GET_PROJECTS handler returning project list
- Added GET_BATCHES handler with completed batch filtering
- Added BatchWithProgress type extending BatchSummary

## Task Commits

Each task was committed atomically:

1. **Task 1: Create project and batch API functions** - `834e954` (feat)
2. **Task 2: Add GET_PROJECTS and GET_BATCHES handlers** - `166c480` (feat)

## Files Created/Modified
- `apps/extension/src/api/projects.ts` - fetchProjects() function
- `apps/extension/src/api/batches.ts` - fetchBatches() function with progress
- `apps/extension/src/api/index.ts` - Export new functions
- `apps/extension/src/types/responses.ts` - BatchWithProgress type
- `apps/extension/entrypoints/background.ts` - GET_PROJECTS and GET_BATCHES handlers

## Decisions Made
- MVP progress tracking: pendingCount equals rowCount, doneCount equals 0 (real status tracking deferred to Phase 29 when row fill status is implemented)
- Completed batches (where doneCount === rowCount) filtered from GET_BATCHES response per CONTEXT.md decision to hide finished batches from dropdown

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- API handlers ready for popup UI integration
- Popup can now fetch projects and batches via message passing
- Progress fields (pendingCount, doneCount) available for batch dropdown display

---
*Phase: 27-popup-ui*
*Completed: 2026-02-04*
