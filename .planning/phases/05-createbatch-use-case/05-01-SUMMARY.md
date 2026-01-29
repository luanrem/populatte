---
phase: 05-createbatch-use-case
plan: 01
subsystem: api
tags: [nestjs, clean-architecture, use-case, transactional, cls, ownership-validation]

# Dependency graph
requires:
  - phase: 04-ingestion-module
    provides: IngestionService for orchestrating parse-then-persist flow
  - phase: 03-ingestion-service
    provides: Excel parsing strategies and ingestion service
  - phase: 02-backend-sync
    provides: BatchRepository and RowRepository
  - phase: 01-prerequisites
    provides: Project and Batch entities, repository abstractions
provides:
  - CreateBatchUseCase with @Transactional orchestration for atomic batch+row operations
  - ProjectRepository.findByIdOnly() method for ownership validation
  - Aligned BatchStatus enum to PROCESSING/COMPLETED/FAILED lifecycle states
affects: [06-integration-tests, 10-batch-controller]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use case layer with @Transactional() decorator for atomic operations"
    - "Two-step ownership validation: findByIdOnly -> check deletedAt -> check userId"
    - "Separate HTTP error codes: 404 (not found), 404 (archived), 403 (not owned)"
    - "Security audit logging at WARN level for unauthorized access attempts"

key-files:
  created:
    - apps/api/src/core/use-cases/batch/create-batch.use-case.ts
    - apps/api/src/core/use-cases/batch/index.ts
    - apps/api/drizzle/0002_rare_rawhide_kid.sql
  modified:
    - apps/api/src/core/repositories/project.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts
    - apps/api/src/core/entities/batch.entity.ts
    - apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts
    - apps/api/src/core/use-cases/index.ts
    - apps/api/src/infrastructure/excel/ingestion.module.ts

key-decisions:
  - "findByIdOnly queries without userId/deletedAt filters to enable separate error messages"
  - "@Transactional() on execute() method wraps all operations in single CLS-scoped transaction"
  - "BatchStatus.Processing replaces PendingReview for active ingestion lifecycle state"
  - "No try/catch around IngestionService.ingest() - @Transactional auto-rollbacks on exception"

patterns-established:
  - "Use case ownership validation: findByIdOnly -> deletedAt check -> userId check"
  - "Security audit logging for authorization failures before throwing exception"
  - "Use case layer registers in domain module (IngestionModule) for dependency injection"

# Metrics
duration: 3min 32s
completed: 2026-01-29
---

# Phase 5 Plan 1: CreateBatchUseCase Summary

**Transactional use case with two-step ownership validation producing separate 404/403 errors, delegating to IngestionService for atomic batch+row persistence**

## Performance

- **Duration:** 3min 32s
- **Started:** 2026-01-29T19:16:38Z
- **Completed:** 2026-01-29T19:20:10Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- CreateBatchUseCase validates project ownership with separate 404 (not found), 404 (archived), and 403 (not owned) errors
- @Transactional() decorator wraps full execute() method for atomic batch + all rows commit/rollback
- Security audit logging at WARN level for unauthorized batch creation attempts
- IngestionService.ingest() called within transactional boundary for delegation pattern
- BatchStatus enum aligned to PROCESSING/COMPLETED/FAILED lifecycle states across entity and schema
- ProjectRepository.findByIdOnly() enables ownership validation without filtering by userId or deletedAt

## Task Commits

Each task was committed atomically:

1. **Task 1: Repository findByIdOnly method and BatchStatus enum alignment** - `e796c0c` (feat)
2. **Task 2: CreateBatchUseCase with transactional orchestration and module wiring** - `aef43f7` (feat)

## Files Created/Modified
- `apps/api/src/core/repositories/project.repository.ts` - Added findByIdOnly() abstract method
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts` - Implemented findByIdOnly() querying by id only
- `apps/api/src/core/entities/batch.entity.ts` - Changed BatchStatus.PendingReview to BatchStatus.Processing
- `apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts` - Updated batchStatusEnum and default to PROCESSING
- `apps/api/drizzle/0002_rare_rawhide_kid.sql` - Migration for batch_status enum change
- `apps/api/src/core/use-cases/batch/create-batch.use-case.ts` - Use case with @Transactional, ownership validation, IngestionService delegation
- `apps/api/src/core/use-cases/batch/index.ts` - Barrel export for batch use cases
- `apps/api/src/core/use-cases/index.ts` - Added batch barrel to exports
- `apps/api/src/infrastructure/excel/ingestion.module.ts` - Registered CreateBatchUseCase as provider and export

## Decisions Made

**1. findByIdOnly for two-step validation**
- Query project by ID only (no userId filter, no deletedAt filter)
- Enables separate error messages: 404 (not found), 404 (archived), 403 (not owned)
- Follows security principle of least information disclosure

**2. @Transactional on execute() method**
- Wraps entire use case execution in single CLS-scoped transaction
- Batch insert + all row inserts participate in same transaction
- Any exception triggers automatic rollback
- No explicit try/catch needed - decorator handles rollback

**3. BatchStatus.Processing replaces PendingReview**
- Aligns entity and schema to PROCESSING/COMPLETED/FAILED lifecycle
- More accurate semantic meaning: batch is actively being processed during ingestion
- Migration generated to rename enum value in PostgreSQL

**4. No try/catch around IngestionService.ingest()**
- @Transactional() automatically rolls back on exception
- Adding try/catch would require explicit rethrow and risks swallowing errors
- Cleaner code by trusting decorator behavior

**5. Use case registered in IngestionModule**
- CreateBatchUseCase depends on IngestionService (only available in IngestionModule)
- ProjectRepository comes from global DrizzleModule
- Avoids circular imports by keeping batch ingestion concerns together
- Will be imported by batch controller in Phase 10

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing TypeScript error in list-mode.strategy.ts**
- Error unrelated to this phase's changes (Object.entries type issue)
- Our new files compile cleanly and pass ESLint
- Issue exists in existing codebase, not introduced by this phase

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 6 (Integration Tests):**
- CreateBatchUseCase complete with transactional orchestration
- Ownership validation produces correct error codes
- Security audit logging functional
- Use case exported from IngestionModule for testing

**Blockers/Concerns:**
None. All success criteria met.

---
*Phase: 05-createbatch-use-case*
*Completed: 2026-01-29*
