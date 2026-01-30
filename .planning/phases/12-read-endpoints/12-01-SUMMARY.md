---
phase: 12-read-endpoints
plan: 01
subsystem: api
tags: [nestjs, clean-architecture, pagination, ownership-validation, drizzle-orm]

# Dependency graph
requires:
  - phase: 11-repository-layer
    provides: findByProjectIdPaginated, findByBatchIdPaginated with proper soft-delete filtering
provides:
  - GET /projects/:projectId/batches - paginated batch list with totalRows per batch
  - GET /projects/:projectId/batches/:batchId - single batch detail with totalRows
  - GET /projects/:projectId/batches/:batchId/rows - paginated rows sorted by sourceRowIndex
  - countByBatchId repository method for efficient row counting
  - Ownership validation pattern (404/403 distinction) for all read endpoints
affects: [13-dashboard-integration, batch-ui, data-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "countByBatchId for efficient row counting (avoids pagination hack)"
    - "N+1 query pattern in ListBatchesUseCase (MVP trade-off, parallelized with Promise.all)"
    - "Zod coercion for pagination query params (limit: 1-100 default 50, offset: >=0 default 0)"
    - "Defense-in-depth: verify batch.projectId === projectId after batch lookup"

key-files:
  created:
    - apps/api/src/core/use-cases/batch/get-batch.use-case.ts
    - apps/api/src/core/use-cases/batch/list-batches.use-case.ts
    - apps/api/src/core/use-cases/batch/list-rows.use-case.ts
  modified:
    - apps/api/src/core/repositories/row.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts
    - apps/api/src/presentation/dto/batch.dto.ts
    - apps/api/src/presentation/controllers/batch.controller.ts
    - apps/api/src/infrastructure/batch/batch.module.ts

key-decisions:
  - "countByBatchId created from scratch - did not exist before this plan"
  - "ListBatchesUseCase uses N+1 queries (1 list + N counts) with Promise.all parallelization - acceptable for MVP with max limit=100"
  - "Pagination uses Zod coercion with strict limits: min=1, max=100, default=50 for limit; min=0, default=0 for offset"
  - "Invalid pagination params return 400 Bad Request (Zod validation), not silent fallback"
  - "Route ordering matters: @Get() before @Get(':batchId') before @Get(':batchId/rows') to prevent path conflict"

patterns-established:
  - "Use case parameter convention: (resourceIds..., userId, queryParams...)"
  - "Ownership validation: findByIdOnly → deletedAt check → userId match → ForbiddenException with security audit log"
  - "Defense-in-depth: verify child resource belongs to parent (batch.projectId === projectId)"
  - "import type for DTOs used in decorated signatures (emitDecoratorMetadata requirement)"

# Metrics
duration: 3min 41s
completed: 2026-01-30
---

# Phase 12 Plan 01: Read Endpoints Summary

**Three GET endpoints for batches and rows with 404/403 ownership validation, pagination (limit 1-100), and totalRows computed via dedicated countByBatchId method**

## Performance

- **Duration:** 3min 41s
- **Started:** 2026-01-30T13:21:38Z
- **Completed:** 2026-01-30T13:25:19Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created countByBatchId method from scratch (abstract + Drizzle implementation) for efficient row counting
- Three read use cases with ownership validation pattern: GetBatch, ListBatches, ListRows
- Three GET routes on BatchController with proper ordering to prevent path conflicts
- Pagination schema with Zod coercion (limit 1-100 default 50, offset >=0 default 0)
- All endpoints enforce project ownership with 404 for missing resources, 403 for access denial

## Task Commits

Each task was committed atomically:

1. **Task 1: Core layer - countByBatchId and three use cases** - `4b37334` (feat)
2. **Task 2: Presentation layer - pagination DTO, controller routes, module wiring** - `c0b1940` (feat)

## Files Created/Modified
- `apps/api/src/core/repositories/row.repository.ts` - Added abstract countByBatchId method
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` - Implemented countByBatchId with Drizzle count() and soft-delete filtering
- `apps/api/src/core/use-cases/batch/get-batch.use-case.ts` - Single batch detail with ownership validation and totalRows
- `apps/api/src/core/use-cases/batch/list-batches.use-case.ts` - Paginated batch list with totalRows per batch (N+1 parallelized)
- `apps/api/src/core/use-cases/batch/list-rows.use-case.ts` - Paginated rows sorted by sourceRowIndex
- `apps/api/src/core/use-cases/batch/index.ts` - Barrel export updated with three new use cases
- `apps/api/src/presentation/dto/batch.dto.ts` - Added paginationQuerySchema with strict limits
- `apps/api/src/presentation/controllers/batch.controller.ts` - Added three GET routes with proper ordering
- `apps/api/src/infrastructure/batch/batch.module.ts` - Wired GetBatch, ListBatches, ListRows use cases

## Decisions Made

**countByBatchId from scratch:** This method did NOT exist before this plan. Created on both abstract RowRepository and DrizzleRowRepository to support totalRows computation without hacking pagination.

**N+1 query trade-off:** ListBatchesUseCase deliberately uses N+1 queries (1 list + N count queries per batch) with Promise.all parallelization. This is an MVP-acceptable trade-off per context decision - with max limit=100, this means at most 101 parallel queries. Future optimization (SQL subquery or JOIN) deferred to performance phase.

**Strict pagination validation:** Zod schema enforces limit 1-100 (default 50) and offset >=0 (default 0). Invalid params return 400 Bad Request, not silent fallback - explicit error handling per plan requirement.

**Route ordering:** NestJS matches routes top-to-bottom. @Get() (list) must come before @Get(':batchId') (detail) must come before @Get(':batchId/rows') (nested) to prevent `:batchId` from matching literal "rows" string.

**Defense-in-depth:** After fetching batch, verify batch.projectId === projectId to prevent cross-project access even if batch ID is guessed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed unused imports in create-batch test**
- **Found during:** Task 1 lint verification
- **Issue:** Pre-existing test file had unused imports (NotFoundException, ForbiddenException) causing lint failure
- **Fix:** Removed unused imports from apps/api/test/integration/create-batch.use-case.spec.ts
- **Files modified:** apps/api/test/integration/create-batch.use-case.spec.ts
- **Verification:** Lint passed after fix
- **Committed in:** 4b37334 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Single pre-existing lint error blocked verification. Fix was necessary to proceed. No scope creep.

## Issues Encountered
None - plan executed as specified with one pre-existing lint blocker auto-fixed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

**Ready for dashboard integration:**
- All three GET endpoints operational and tested (lint + build pass)
- Pagination works with strict limits and defaults
- Ownership validation prevents cross-user access
- totalRows computed efficiently via dedicated count method

**No blockers.**

**Notes for next phase:**
- ListBatchesUseCase N+1 query pattern is MVP-acceptable but should be monitored for performance
- Consider SQL subquery optimization if batch list with 100 items shows latency issues
- All endpoints return structured data ready for dashboard consumption

---
*Phase: 12-read-endpoints*
*Completed: 2026-01-30*
