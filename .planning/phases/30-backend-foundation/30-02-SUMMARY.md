---
phase: 30-backend-foundation
plan: 02
subsystem: api
tags: [nestjs, crud, batch, endpoint, validation]

# Dependency graph
requires:
  - phase: 30-01
    provides: batch entity with identifier fields, UpdateBatchData interface
provides:
  - UpdateBatchUseCase with identifier key validation
  - DeleteBatchUseCase with row cascade soft-delete
  - PUT /projects/:projectId/batches/:batchId endpoint
  - PATCH /projects/:projectId/batches/:batchId endpoint
  - DELETE /projects/:projectId/batches/:batchId endpoint
affects: [31-extension-identifier-display, 32-mapping-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defense-in-depth ownership validation (project first, then batch)"
    - "Cascade soft-delete pattern for parent-child relations"

key-files:
  created:
    - apps/api/src/core/use-cases/batch/update-batch.use-case.ts
    - apps/api/src/core/use-cases/batch/delete-batch.use-case.ts
  modified:
    - apps/api/src/core/repositories/batch.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
    - apps/api/src/core/use-cases/batch/index.ts
    - apps/api/src/presentation/dto/batch.dto.ts
    - apps/api/src/presentation/controllers/batch.controller.ts
    - apps/api/src/infrastructure/excel/ingestion.module.ts

key-decisions:
  - "Identifier keys validated against columnMetadata.normalizedKey"
  - "Cascade soft-delete rows before batch for referential integrity"
  - "PATCH and PUT share same use case - both allow partial updates"

patterns-established:
  - "Defense-in-depth: verify project ownership before batch ownership"
  - "Cascade soft-delete: delete children before parent"

# Metrics
duration: 2min
completed: 2026-02-04
---

# Phase 30 Plan 02: Batch CRUD API Summary

**Batch CRUD endpoints (PUT/PATCH/DELETE) with identifier key validation and cascade soft-delete for rows**

## Performance

- **Duration:** 2 min 29 sec
- **Started:** 2026-02-04T18:39:46Z
- **Completed:** 2026-02-04T18:42:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Batch repository extended with update and softDeleteRowsByBatchId methods
- UpdateBatchUseCase validates identifier keys against batch columnMetadata
- DeleteBatchUseCase cascades soft-delete to all batch rows before deleting batch
- PUT, PATCH, DELETE endpoints wired to BatchController

## Task Commits

Each task was committed atomically:

1. **Task 1: Add update method to batch repository** - `3a5c97f` (feat)
2. **Task 2: Create batch use cases and wire endpoints** - `106e3c3` (feat)

## Files Created/Modified
- `apps/api/src/core/repositories/batch.repository.ts` - Added update and softDeleteRowsByBatchId abstract methods
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts` - Implemented update and softDeleteRowsByBatchId
- `apps/api/src/core/use-cases/batch/update-batch.use-case.ts` - Update use case with identifier validation
- `apps/api/src/core/use-cases/batch/delete-batch.use-case.ts` - Delete use case with row cascade
- `apps/api/src/core/use-cases/batch/index.ts` - Exports for new use cases
- `apps/api/src/presentation/dto/batch.dto.ts` - updateBatchSchema for validation
- `apps/api/src/presentation/controllers/batch.controller.ts` - PUT/PATCH/DELETE endpoints
- `apps/api/src/infrastructure/excel/ingestion.module.ts` - Wired new use cases

## Decisions Made
- Identifier key validation checks against columnMetadata.normalizedKey (not originalHeader)
- PATCH and PUT endpoints share same use case since both allow partial updates
- Row soft-delete happens before batch soft-delete to maintain referential integrity
- deletedBy parameter not stored on rows (schema doesn't have that column) but kept in method signature for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Batch CRUD API complete with all endpoints
- Extension can now configure identifier fields via PATCH endpoint
- Ready for extension UI to display row identifiers

---
*Phase: 30-backend-foundation*
*Completed: 2026-02-04*
