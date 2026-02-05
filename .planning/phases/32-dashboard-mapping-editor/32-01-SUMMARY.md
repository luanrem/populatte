---
phase: 32-dashboard-mapping-editor
plan: 01
subsystem: api
tags: [react-query, zod, dnd-kit, shadcn, api-client]

# Dependency graph
requires:
  - phase: 31-dashboard-management
    provides: Mapping list UI and basic mapping endpoints
provides:
  - Step API endpoints with CRUD and reorder operations
  - Mapping detail schema with steps array
  - React Query hooks for mapping and step operations
  - shadcn components for editor UI (collapsible, switch, command)
  - dnd-kit for drag-and-drop functionality
affects: [32-02, 32-03, 32-04]

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core"
    - "@dnd-kit/sortable"
    - "@dnd-kit/utilities"
    - "@radix-ui/react-collapsible"
    - "@radix-ui/react-switch"
    - "cmdk"
  patterns:
    - "Step entity schema with selector types and fallbacks"
    - "Mapping detail response with embedded steps array"
    - "React Query mutations with cache invalidation pattern"

key-files:
  created:
    - apps/web/lib/api/schemas/step.schema.ts
    - apps/web/lib/api/endpoints/steps.ts
    - apps/web/lib/query/hooks/use-steps.ts
    - apps/web/components/ui/collapsible.tsx
    - apps/web/components/ui/switch.tsx
    - apps/web/components/ui/command.tsx
  modified:
    - apps/web/package.json
    - apps/web/lib/api/schemas/mapping.schema.ts
    - apps/web/lib/api/endpoints/mappings.ts
    - apps/web/lib/query/hooks/use-mappings.ts
    - apps/web/lib/api/endpoints/index.ts
    - apps/web/lib/api/schemas/index.ts
    - apps/web/lib/query/hooks/index.ts

key-decisions:
  - "Skipped next-navigation-guard due to Next.js 16 incompatibility"

patterns-established:
  - "Step schema mirrors backend entity with Zod validation"
  - "Mapping detail includes steps array for editor view"
  - "Step mutations invalidate parent mapping query"

# Metrics
duration: 4min
completed: 2026-02-04
---

# Phase 32 Plan 01: API Layer & Dependencies Summary

**dnd-kit packages, shadcn components, Step CRUD endpoints, mapping detail schema, and React Query hooks for mapping editor**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-05T00:00:00Z
- **Completed:** 2026-02-05T00:04:26Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Installed dnd-kit packages for drag-and-drop step reordering
- Added shadcn collapsible, switch, and command components
- Created complete Step API layer with Zod schemas and endpoints
- Extended mapping schemas with detail view and update operations
- Created React Query hooks for all mapping and step operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and add shadcn components** - `07e1b4f` (chore)
2. **Task 2: Create step API endpoints and schemas** - `9f69b96` (feat)
3. **Task 3: Extend mapping schemas/endpoints and create all React Query hooks** - `6cf2efb` (feat)

## Files Created/Modified

- `apps/web/lib/api/schemas/step.schema.ts` - Step entity Zod schemas and types
- `apps/web/lib/api/endpoints/steps.ts` - Step CRUD and reorder endpoints
- `apps/web/lib/query/hooks/use-steps.ts` - useCreateStep, useUpdateStep, useDeleteStep, useReorderSteps
- `apps/web/lib/api/schemas/mapping.schema.ts` - Added mappingDetailSchema, successTriggerSchema, updateMappingRequestSchema
- `apps/web/lib/api/endpoints/mappings.ts` - Added getById and update endpoints
- `apps/web/lib/query/hooks/use-mappings.ts` - Added useMapping and useUpdateMapping hooks
- `apps/web/components/ui/collapsible.tsx` - shadcn collapsible component
- `apps/web/components/ui/switch.tsx` - shadcn switch component
- `apps/web/components/ui/command.tsx` - shadcn command component for searchable combobox
- `apps/web/package.json` - Added dnd-kit dependencies

## Decisions Made

- **Skipped next-navigation-guard:** Package has peer dependency requiring Next.js 14/15, incompatible with current Next.js 16. Unsaved changes detection can be implemented with browser's beforeunload event.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Skipped incompatible next-navigation-guard package**

- **Found during:** Task 1 (Install dependencies)
- **Issue:** next-navigation-guard requires Next.js 14/15 as peer dependency, project uses Next.js 16
- **Fix:** Skipped installation - unsaved changes can be handled via beforeunload event or React Router patterns
- **Files modified:** None (package not installed)
- **Verification:** Other dependencies installed successfully, app compiles
- **Committed in:** 07e1b4f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor - unsaved changes detection will need alternative implementation in future plans if required.

## Issues Encountered

None - all core functionality implemented as planned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API layer complete for mapping editor operations
- All React Query hooks ready for UI components
- shadcn components available for editor interface
- dnd-kit ready for step drag-and-drop
- Ready for Plan 02 (Mapping Editor Page Structure)

---
*Phase: 32-dashboard-mapping-editor*
*Completed: 2026-02-04*
