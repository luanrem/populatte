---
phase: 11-repository-layer
plan: 01
subsystem: database
tags: [drizzle-orm, pagination, repository-pattern, soft-delete]

# Dependency graph
requires:
  - phase: 10-ingestion-pipeline
    provides: DrizzleService, batch/row repositories, soft-delete pattern
provides:
  - PaginatedResult<T> generic type for consistent pagination responses
  - Paginated read methods on batch and row repositories
  - Fixed soft-delete filtering on all read queries
  - Correct sort ordering (batches DESC, rows ASC with tiebreaker)
affects: [12-read-endpoints, frontend-data-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Parallel query pattern with Promise.all for paginated results (prevents N+1 queries)
    - Shared conditions variable between data and count queries (prevents inconsistency)
    - Tiebreaker sorting with id ASC for rows (prevents non-deterministic pagination)

key-files:
  created:
    - apps/api/src/core/entities/pagination.types.ts
  modified:
    - apps/api/src/core/repositories/batch.repository.ts
    - apps/api/src/core/repositories/row.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts

key-decisions:
  - "Use PaginatedResult<T> generic type returning only items and total (use case layer adds limit/offset to compose full response)"
  - "Batch ordering DESC by createdAt (newest first) - createdAt is unique enough via defaultNow + uuid"
  - "Row ordering ASC by sourceRowIndex with id ASC tiebreaker (prevents non-deterministic pagination)"
  - "Shared conditions variable between data and count queries (prevents Pitfall 5 from RESEARCH.md)"
  - "Always use count() helper from drizzle-orm (not raw SQL template)"

patterns-established:
  - "Paginated repository methods use Promise.all two-query pattern: parallel data fetch + count for optimal performance"
  - "All read queries filter soft-deleted records with isNull(deletedAt)"
  - "JSDoc comments on paginated methods require caller verification of parent entity existence"

# Metrics
duration: 2min 36s
completed: 2026-01-30
---

# Phase 11 Plan 01: Repository Layer Summary

**Paginated read methods for batches and rows with PaginatedResult<T> type, corrected DESC batch ordering, and complete soft-delete filtering across all repositories**

## Performance

- **Duration:** 2min 36s
- **Started:** 2026-01-30T12:37:27Z
- **Completed:** 2026-01-30T12:40:03Z
- **Tasks:** 2/2 completed
- **Files modified:** 6

## Accomplishments
- Created PaginatedResult<T> generic type providing consistent pagination interface across all repositories
- Implemented findByProjectIdPaginated() and findByBatchIdPaginated() with parallel Promise.all query pattern for optimal performance
- Fixed batch ordering from ASC to DESC (newest first) on findByProjectId() - matches user expectation for recent batches
- Added soft-delete filtering to ProjectRepository.findByIdOnly() - closes filtering gap
- Established tiebreaker sorting pattern on rows (sourceRowIndex ASC, id ASC) preventing non-deterministic pagination

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PaginatedResult type and extend abstract repositories** - `57fe332` (feat)
2. **Task 2: Implement Drizzle paginated methods, fix soft-delete and ordering** - `19385d6` (feat)

## Files Created/Modified
- `apps/api/src/core/entities/pagination.types.ts` - PaginatedResult<T> generic type with items and total
- `apps/api/src/core/entities/index.ts` - Export pagination types via barrel
- `apps/api/src/core/repositories/batch.repository.ts` - Added findByProjectIdPaginated abstract method with JSDoc
- `apps/api/src/core/repositories/row.repository.ts` - Added findByBatchIdPaginated abstract method with JSDoc
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts` - Implemented paginated query, fixed DESC ordering
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` - Implemented paginated query with dual sorting
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts` - Fixed soft-delete filtering on findByIdOnly

## Decisions Made

**1. PaginatedResult<T> returns only items + total**
- Rationale: Use case/controller layer will add limit and offset to compose full response shape. Keeps repository layer focused on data access only, not presentation concerns.

**2. Batches sorted by createdAt DESC (newest first)**
- Rationale: User expectation is to see most recent batches first. CreatedAt is unique enough via defaultNow() + uuid id, no tiebreaker needed.

**3. Rows sorted by sourceRowIndex ASC with id ASC tiebreaker**
- Rationale: Maintains original Excel row order. Tiebreaker prevents non-deterministic pagination per Pitfall 1 in RESEARCH.md.

**4. Shared conditions variable between data and count queries**
- Rationale: Prevents inconsistency between paginated results and total count (Pitfall 5 in RESEARCH.md). Single source of truth for filter conditions.

**5. Always use count() helper from drizzle-orm**
- Rationale: Type-safe and prevents SQL injection. Avoids raw SQL template string pattern.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as specified with TypeScript and lint passing cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 12 (Read Endpoints):**
- PaginatedResult<T> type available for use case layer responses
- BatchRepository.findByProjectIdPaginated() ready for GET /projects/:id/batches
- RowRepository.findByBatchIdPaginated() ready for GET /batches/:id/rows
- All read queries correctly filter soft-deleted records
- Correct sort ordering established (batches DESC, rows ASC)

**No blockers or concerns.**

---
*Phase: 11-repository-layer*
*Completed: 2026-01-30*
