---
phase: 25-backend-extensions
plan: 02
subsystem: api
tags: [nestjs, drizzle, zod, row-status, fill-tracking]

# Dependency graph
requires:
  - phase: 02-data-ingestion
    provides: "Row entity and repository infrastructure"
  - phase: 21-batch-read
    provides: "Batch and project ownership validation patterns"
provides:
  - "PATCH endpoint for updating row fill status (PENDING, VALID, ERROR)"
  - "Fill status tracking columns in ingestion_rows table"
  - "UpdateRowStatusUseCase with ownership validation"
  - "Status transition rules (VALID is final, ERROR can reset to PENDING)"
affects: [29-fill-cycle, extension-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fill status tracking alongside validation status"
    - "Status transition rules enforced in use case layer"
    - "VALID status as final state preventing further updates"

key-files:
  created:
    - "apps/api/src/core/use-cases/row/update-row-status.use-case.ts"
    - "apps/api/src/core/use-cases/row/index.ts"
    - "apps/api/src/presentation/dto/row.dto.ts"
  modified:
    - "apps/api/src/core/entities/row.entity.ts"
    - "apps/api/src/core/repositories/row.repository.ts"
    - "apps/api/src/infrastructure/database/drizzle/schema/ingestion-rows.schema.ts"
    - "apps/api/src/infrastructure/database/drizzle/mappers/row.mapper.ts"
    - "apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts"
    - "apps/api/src/presentation/controllers/batch.controller.ts"
    - "apps/api/src/infrastructure/batch/batch.module.ts"

key-decisions:
  - "FillStatus enum separate from RowStatus (validation vs fill tracking)"
  - "VALID fill status is final - cannot be changed once set"
  - "ERROR status can be reset to PENDING for retry capability"
  - "fillErrorMessage and fillErrorStep are optional (nullable)"

patterns-established:
  - "Row status updates follow 404/403 ownership validation pattern"
  - "Fill tracking separate from validation tracking"
  - "Status transition rules enforced at use case level"

# Metrics
duration: 6m 5s
completed: 2026-02-03
---

# Phase 25 Plan 02: Row Status Update Endpoint Summary

**PATCH endpoint enabling extension to track fill results with PENDING/VALID/ERROR status and error details**

## Performance

- **Duration:** 6 min 5 sec
- **Started:** 2026-02-03T22:55:56Z
- **Completed:** 2026-02-03T23:02:01Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Row entity extended with fill status tracking (fillStatus, fillErrorMessage, fillErrorStep, fillUpdatedAt)
- PATCH /projects/:id/batches/:id/rows/:id/status endpoint with ownership validation
- Status transition rules preventing updates to completed (VALID) rows
- Database schema migration adding fill_status enum and columns to ingestion_rows

## Task Commits

Each task was committed atomically:

1. **Task 1: Row entity and repository updates** - `18e5b64` (feat)
2. **Task 2: Use case and controller endpoint** - `249f4e9` (feat)

## Files Created/Modified

### Created
- `apps/api/src/core/use-cases/row/update-row-status.use-case.ts` - Use case with ownership validation and status transition rules
- `apps/api/src/core/use-cases/row/index.ts` - Row use cases barrel export
- `apps/api/src/presentation/dto/row.dto.ts` - UpdateRowStatusDto with Zod validation

### Modified
- `apps/api/src/core/entities/row.entity.ts` - Added FillStatus enum and fill tracking fields
- `apps/api/src/core/repositories/row.repository.ts` - Added findById and updateStatus methods
- `apps/api/src/infrastructure/database/drizzle/schema/ingestion-rows.schema.ts` - Added fill_status enum and columns
- `apps/api/src/infrastructure/database/drizzle/mappers/row.mapper.ts` - Map fill tracking fields
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` - Implement findById and updateStatus
- `apps/api/src/presentation/controllers/batch.controller.ts` - Added PATCH endpoint
- `apps/api/src/infrastructure/batch/batch.module.ts` - Wire UpdateRowStatusUseCase
- `apps/api/src/core/use-cases/index.ts` - Export row use cases
- `apps/api/src/infrastructure/auth/extension-auth.service.ts` - Fixed blocking issue

## Decisions Made

**1. Separate FillStatus from RowStatus**
- RowStatus tracks validation state (DRAFT, VALID, WARNING, ERROR)
- FillStatus tracks extension fill operation state (PENDING, VALID, ERROR)
- These are independent concerns and tracked separately

**2. VALID as final state**
- Once fillStatus is set to VALID, it cannot be changed
- Enforced at use case level with BadRequestException
- Prevents accidental overwrites of successfully completed rows

**3. ERROR allows retry**
- ERROR -> PENDING transition allowed for retry capability
- Error details (fillErrorMessage, fillErrorStep) are optional
- Allows clearing error state when retrying

**4. Ownership validation pattern**
- Follows GetBatchUseCase pattern exactly
- Step-by-step validation: project exists → not deleted → ownership → batch → row
- Returns 404 for missing resources, 403 for unauthorized access
- Security audit log on 403

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed DrizzleService.db property access**
- **Found during:** Task 1 (Build verification)
- **Issue:** extension-auth.service.ts used `this.drizzleService.db` but property doesn't exist
- **Fix:** Changed to `this.drizzleService.getClient()` (correct method)
- **Files modified:** apps/api/src/infrastructure/auth/extension-auth.service.ts
- **Verification:** Build passed after fix
- **Committed in:** 18e5b64 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking issue preventing build. Fix necessary for plan execution.

## Issues Encountered

**Database migration already applied**
- Migration 0006 columns (fill_status, fill_error_message, fill_error_step, fill_updated_at) already existed
- Likely applied in previous plan run (25-01)
- Verified with ALTER TABLE IF NOT EXISTS - all columns present
- No impact on functionality

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plans:**
- Row status update endpoint fully functional
- Extension can now track fill operation results
- Status transitions enforced (VALID is final)
- Error tracking with message and step identifier

**Integration points for Phase 29 (Fill Cycle):**
- Extension will call PATCH endpoint after each fill attempt
- PENDING status indicates row ready for fill
- VALID status indicates successful fill (no retry)
- ERROR status with details allows retry and debugging

**No blockers or concerns**

---
*Phase: 25-backend-extensions*
*Completed: 2026-02-03*
