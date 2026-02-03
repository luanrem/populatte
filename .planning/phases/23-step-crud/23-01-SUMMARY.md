---
phase: 23-step-crud
plan: 01
subsystem: api
tags: [nestjs, use-cases, crud, step, ownership-validation, defense-in-depth]

# Dependency graph
requires:
  - phase: 22-mapping-crud
    provides: MappingRepository with findById for ownership validation
  - phase: 21-mapping-foundation
    provides: StepRepository base CRUD methods
provides:
  - CreateStepUseCase with auto-assigned stepOrder
  - UpdateStepUseCase with defense-in-depth validation
  - DeleteStepUseCase with hard delete
  - ReorderStepsUseCase with strict array validation
  - StepRepository.getMaxStepOrder for order management
affects: [23-02-step-controller, extension-step-api]

# Tech tracking
tech-stack:
  added: []
  patterns: [defense-in-depth ownership validation, sourceFieldKey/fixedValue mutual exclusion]

key-files:
  created:
    - apps/api/src/core/use-cases/step/create-step.use-case.ts
    - apps/api/src/core/use-cases/step/update-step.use-case.ts
    - apps/api/src/core/use-cases/step/delete-step.use-case.ts
    - apps/api/src/core/use-cases/step/reorder-steps.use-case.ts
    - apps/api/src/core/use-cases/step/index.ts
  modified:
    - apps/api/src/core/repositories/step.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-step.repository.ts
    - apps/api/src/core/use-cases/index.ts

key-decisions:
  - "Hard delete for steps (no soft-delete, unlike mappings)"
  - "StepOrder auto-increments on create using getMaxStepOrder"

patterns-established:
  - "Defense-in-depth: Validate step belongs to mapping before ownership chain"
  - "Mutual exclusion validation: sourceFieldKey and fixedValue cannot both be provided"
  - "Strict reorder: orderedStepIds must exactly match existing step IDs"

# Metrics
duration: 2min 47s
completed: 2026-02-03
---

# Phase 23 Plan 01: Step Use Cases Summary

**4 step CRUD use cases with defense-in-depth ownership validation and strict reorder array validation**

## Performance

- **Duration:** 2min 47s
- **Started:** 2026-02-03T13:28:34Z
- **Completed:** 2026-02-03T13:31:21Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extended StepRepository with getMaxStepOrder method for auto-incrementing stepOrder
- Updated reorder method to return Step[] for immediate feedback
- Created 4 step CRUD use cases with full ownership chain validation
- Implemented sourceFieldKey/fixedValue mutual exclusion validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend StepRepository** - `6e1dd08` (feat)
2. **Task 2: Create 4 step CRUD use cases** - `d7ea4e5` (feat)

## Files Created/Modified
- `apps/api/src/core/repositories/step.repository.ts` - Added getMaxStepOrder, updated reorder return type
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-step.repository.ts` - Implemented getMaxStepOrder with MAX aggregate
- `apps/api/src/core/use-cases/step/create-step.use-case.ts` - Create step with auto-assigned order
- `apps/api/src/core/use-cases/step/update-step.use-case.ts` - Update step with defense-in-depth validation
- `apps/api/src/core/use-cases/step/delete-step.use-case.ts` - Hard delete step with ownership validation
- `apps/api/src/core/use-cases/step/reorder-steps.use-case.ts` - Reorder steps with strict array validation
- `apps/api/src/core/use-cases/step/index.ts` - Barrel export for step use cases
- `apps/api/src/core/use-cases/index.ts` - Added step export

## Decisions Made
- Steps use hard delete (unlike mappings which use soft delete) since steps have no audit trail requirements
- StepOrder is auto-assigned as maxOrder + 1 on creation
- ReorderStepsUseCase validates exact match of orderedStepIds (no missing, no extra, no duplicates)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 4 use cases ready for controller wiring in Phase 23-02
- All use cases follow established MappingUseCase patterns
- Defense-in-depth ownership validation complete

---
*Phase: 23-step-crud*
*Completed: 2026-02-03*
