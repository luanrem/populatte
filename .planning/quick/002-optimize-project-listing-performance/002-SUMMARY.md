---
phase: quick
plan: 002
subsystem: api
tags: [drizzle, performance, optimization, column-selection]

# Dependency graph
requires:
  - phase: 13-project-listing
    provides: Project listing UI and API endpoints
provides:
  - ProjectSummary entity with 6 fields for list views
  - Column-level selection in Drizzle for optimized queries
  - Clear API contract separation between list and detail views
affects: [future-list-views, api-optimization-patterns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Column-level selection in Drizzle repositories for list vs detail views"
    - "ProjectSummary type flowing through all layers (entity → repository → use case → controller → web client)"

key-files:
  created: []
  modified:
    - apps/api/src/core/entities/project.entity.ts
    - apps/api/src/core/repositories/project.repository.ts
    - apps/api/src/core/use-cases/project/list-projects.use-case.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts
    - apps/api/src/infrastructure/database/drizzle/mappers/project.mapper.ts
    - apps/web/lib/api/schemas/project.schema.ts
    - apps/web/lib/api/endpoints/projects.ts
    - apps/web/components/projects/project-card.tsx
    - apps/web/components/projects/project-grid.tsx
    - apps/web/components/projects/project-form-dialog.tsx
    - apps/web/components/projects/delete-project-dialog.tsx
    - apps/web/app/(platform)/projects/page.tsx
    - apps/web/lib/query/hooks/use-projects.ts

key-decisions:
  - "Use ProjectSummary interface with exactly 6 fields (id, name, description, targetEntity, targetUrl, status) for list endpoints"
  - "Keep existing findAllByUserId method unchanged to avoid breaking other consumers"
  - "Apply summary type pattern to all layers for type safety from database to UI"

patterns-established:
  - "Pattern 1: Separate summary types for list views with column-level DB selection"
  - "Pattern 2: Zod schema separation for list vs detail API responses"

# Metrics
duration: 4m 1s
completed: 2026-01-30
---

# Quick Task 002: Optimize Project Listing Performance

**GET /projects now returns 6-column ProjectSummary instead of 10-column Project entity, reducing payload size with Drizzle column selection**

## Performance

- **Duration:** 4m 1s
- **Started:** 2026-01-30T19:47:02Z
- **Completed:** 2026-01-30T19:51:03Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- ProjectSummary interface added to core entity layer with exactly the 6 fields used by frontend
- findAllSummariesByUserId repository method with Drizzle column-level selection (only id, name, description, targetEntity, targetUrl, status)
- Complete type flow from database to UI components using ProjectSummaryResponse
- No breaking changes to existing getById endpoint (still returns full Project)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ProjectSummary entity and repository layer** - `372137b` (feat)
2. **Task 2: Wire summary type through use case and web client** - `bf4f521` (feat)

## Files Created/Modified

**Backend (API):**
- `apps/api/src/core/entities/project.entity.ts` - Added ProjectSummary interface
- `apps/api/src/core/repositories/project.repository.ts` - Added findAllSummariesByUserId abstract method
- `apps/api/src/core/use-cases/project/list-projects.use-case.ts` - Changed to return ProjectSummary[]
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts` - Implemented column selection query
- `apps/api/src/infrastructure/database/drizzle/mappers/project.mapper.ts` - Added toSummary mapper

**Frontend (Web):**
- `apps/web/lib/api/schemas/project.schema.ts` - Added projectSummaryResponseSchema and ProjectSummaryResponse type
- `apps/web/lib/api/endpoints/projects.ts` - Updated list() to validate with summary schema
- `apps/web/lib/query/hooks/use-projects.ts` - Changed useProjects to return ProjectSummaryResponse[]
- `apps/web/components/projects/project-card.tsx` - Updated to use ProjectSummaryResponse
- `apps/web/components/projects/project-grid.tsx` - Updated to use ProjectSummaryResponse
- `apps/web/components/projects/project-form-dialog.tsx` - Updated to use ProjectSummaryResponse
- `apps/web/components/projects/delete-project-dialog.tsx` - Updated to use ProjectSummaryResponse
- `apps/web/app/(platform)/projects/page.tsx` - Updated state and callbacks to use ProjectSummaryResponse

## Decisions Made

**1. Column-level selection over ORM abstraction**
- Used Drizzle's `.select({ id: projects.id, ... })` for precise column control
- Avoids fetching userId, createdAt, updatedAt, deletedAt which frontend never uses
- Rationale: Smaller payload size, clearer intent, better performance

**2. Keep both findAllByUserId and findAllSummariesByUserId**
- Did not remove or rename existing method
- Added new method alongside existing one
- Rationale: Avoid breaking changes in case other code depends on full Project entity from list

**3. Type safety through all layers**
- ProjectSummary in core entity
- Repository returns ProjectSummary[]
- Use case returns ProjectSummary[]
- Controller inherits type from use case
- Web validates with projectSummaryResponseSchema
- Components typed as ProjectSummaryResponse
- Rationale: Compile-time safety prevents accidental field access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues. TypeScript compilation, builds, and linting passed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Optimization pattern established for future list endpoints (batches, mappings, etc.)
- GET /projects endpoint optimized and ready for production traffic
- No blockers or concerns

---
*Quick Task: 002-optimize-project-listing-performance*
*Completed: 2026-01-30*
