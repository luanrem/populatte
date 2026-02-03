---
phase: 22-mapping-crud
plan: 01
subsystem: api
tags: [nestjs, clean-architecture, use-cases, mapping, pagination, soft-delete]

# Dependency graph
requires:
  - phase: 21-domain-foundation
    provides: Mapping and Step entities, MappingRepository base, StepRepository
provides:
  - 5 mapping CRUD use cases with ownership validation
  - MappingRepository pagination with URL/isActive filters
  - Step count aggregation for list items
  - Defense-in-depth cross-project access prevention
affects: [22-02 (controllers), 23-step-crud, extension-mapping-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ownership validation: findByIdOnly -> 404/403 separation"
    - "Defense-in-depth: verify mapping.projectId === projectId"
    - "Inverted URL prefix matching: currentUrl LIKE storedUrl%"
    - "Paginated list with page field (1-indexed from offset/limit)"

key-files:
  created:
    - apps/api/src/core/use-cases/mapping/create-mapping.use-case.ts
    - apps/api/src/core/use-cases/mapping/list-mappings.use-case.ts
    - apps/api/src/core/use-cases/mapping/get-mapping.use-case.ts
    - apps/api/src/core/use-cases/mapping/update-mapping.use-case.ts
    - apps/api/src/core/use-cases/mapping/delete-mapping.use-case.ts
    - apps/api/src/core/use-cases/mapping/index.ts
  modified:
    - apps/api/src/core/repositories/mapping.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-mapping.repository.ts
    - apps/api/src/core/use-cases/index.ts

key-decisions:
  - "Use page (1-indexed) instead of offset in ListMappingsResult per CONTEXT.md"
  - "Inverted URL prefix matching enables extension to find mappings for current URL"
  - "findByIdWithDeleted enables proper 404 for already-deleted mappings in delete flow"

patterns-established:
  - "Mapping use case ownership pattern: findByIdOnly -> 404/403 -> defense-in-depth"
  - "Step count via countStepsByMappingId parallelized with Promise.all"

# Metrics
duration: 2min 19s
completed: 2026-02-03
---

# Phase 22 Plan 01: Mapping CRUD Use Cases Summary

**5 mapping use cases with ownership validation, pagination, URL/isActive filters, and defense-in-depth cross-project protection**

## Performance

- **Duration:** 2 min 19 s
- **Started:** 2026-02-03T12:49:43Z
- **Completed:** 2026-02-03T12:52:02Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Extended MappingRepository with pagination, URL filter, isActive filter, and step count methods
- Created 5 complete CRUD use cases following established 404/403 ownership validation pattern
- Implemented defense-in-depth cross-project access prevention in Get/Update/Delete use cases
- ListMappingsUseCase returns stepCount for each mapping via parallelized Promise.all

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend MappingRepository with pagination, URL filter, and isActive filter methods** - `f32ea52` (feat)
2. **Task 2: Create mapping use cases with ownership validation** - `87cf11a` (feat)

## Files Created/Modified

- `apps/api/src/core/repositories/mapping.repository.ts` - Added PaginatedMappings interface and 3 new abstract methods
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-mapping.repository.ts` - Implemented findByIdWithDeleted, findByProjectIdPaginated, countStepsByMappingId
- `apps/api/src/core/use-cases/mapping/create-mapping.use-case.ts` - Creates mapping with ownership validation
- `apps/api/src/core/use-cases/mapping/list-mappings.use-case.ts` - Paginated listing with URL/isActive filters and stepCount
- `apps/api/src/core/use-cases/mapping/get-mapping.use-case.ts` - Returns mapping with ordered steps array
- `apps/api/src/core/use-cases/mapping/update-mapping.use-case.ts` - Updates mapping fields with ownership check
- `apps/api/src/core/use-cases/mapping/delete-mapping.use-case.ts` - Soft-deletes mapping with proper 404 handling
- `apps/api/src/core/use-cases/mapping/index.ts` - Barrel export for all use cases
- `apps/api/src/core/use-cases/index.ts` - Added mapping export

## Decisions Made

- **Used `page` instead of `offset` in ListMappingsResult:** Per CONTEXT.md requirement, the result uses 1-indexed page number calculated as `Math.floor(offset / limit) + 1`
- **Inverted URL prefix matching:** The filter uses `currentUrl LIKE storedUrl%` so that extension can find mappings whose targetUrl is a prefix of the current page URL
- **findByIdWithDeleted for delete flow:** Enables proper 404 for mappings that are already soft-deleted, distinct from mappings that never existed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Use cases are ready for controller wiring in 22-02
- All 5 use cases export proper input/output types for DTO creation
- MappingWithSteps type ready for API responses
- MappingListItem type ready for list endpoint responses

---
*Phase: 22-mapping-crud*
*Completed: 2026-02-03*
