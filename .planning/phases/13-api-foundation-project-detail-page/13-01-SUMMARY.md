---
phase: 13-api-foundation-project-detail-page
plan: 01
subsystem: api
tags: [react-query, zod, next-js, formdata, tanstack-query, breadcrumb, shadcn-ui]

# Dependency graph
requires:
  - phase: v2.0-batch-upload-endpoint
    provides: Batch upload API endpoint with multipart/form-data support
  - phase: v2.1-batch-read-layer
    provides: Batch list, detail, and row pagination endpoints
provides:
  - Frontend API client with FormData upload support
  - Zod validation schemas for batch responses
  - React Query hooks for batch operations (list, detail, rows, upload)
  - Project detail page shell at /projects/[id]
affects: [14-batch-upload-modal, 15-batch-grid-ui, 16-row-data-table]

# Tech tracking
tech-stack:
  added: [shadcn-ui-breadcrumb]
  patterns: [formdata-upload-pattern, zod-runtime-validation, react-query-cache-invalidation, next-15-async-params]

key-files:
  created:
    - apps/web/lib/api/schemas/batch.schema.ts
    - apps/web/lib/api/endpoints/batches.ts
    - apps/web/lib/query/hooks/use-batches.ts
    - apps/web/components/projects/batch-empty-state.tsx
    - apps/web/app/(platform)/projects/[id]/page.tsx
    - apps/web/components/ui/breadcrumb.tsx
  modified:
    - apps/web/lib/api/client.ts
    - apps/web/lib/api/schemas/index.ts
    - apps/web/lib/api/endpoints/index.ts
    - apps/web/lib/query/hooks/index.ts

key-decisions:
  - "FormData uploads skip Content-Type header to allow browser auto-generation of multipart boundary"
  - "Batch list hook uses fixed query key without limit/offset to simplify cache invalidation"
  - "Empty state directs users to existing button instead of duplicating CTA"
  - "Next.js 15 async params handled with use() hook in client component"

patterns-established:
  - "FormData upload pattern: skip Content-Type header for multipart boundaries"
  - "Zod safeParse pattern: all API responses validated with error logging"
  - "React Query cache invalidation: uploads invalidate batch list cache"
  - "Empty state pattern: illustrative icon with friendly copy, no duplicate actions"

# Metrics
duration: 4min
completed: 2026-01-30
---

# Phase 13 Plan 01: API Foundation & Project Detail Page Summary

**Frontend batch API plumbing with FormData upload fix, Zod validation, React Query hooks, and project detail page shell**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-30T15:02:09Z
- **Completed:** 2026-01-30T15:05:55Z
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 4

## Accomplishments
- Fixed API client to support FormData uploads without breaking multipart boundary
- Created complete Zod validation layer for batch responses (list, detail, rows)
- Built React Query hooks for all batch operations with cache invalidation
- Delivered project detail page with breadcrumb, header, empty state, and loading skeletons

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix FormData support in API client and create batch Zod schemas + endpoint factory** - `f12674c` (feat)
2. **Task 2: Create React Query hooks for batch operations** - `f73b633` (feat)
3. **Task 3: Create project detail page with header, breadcrumb, action button, and empty state** - `85823cc` (feat)

## Files Created/Modified

**Created:**
- `apps/web/lib/api/schemas/batch.schema.ts` - Zod schemas for batch list, batch detail, paginated rows with z.infer types
- `apps/web/lib/api/endpoints/batches.ts` - Batch endpoint factory with list, getById, listRows, upload methods
- `apps/web/lib/query/hooks/use-batches.ts` - React Query hooks: useBatches, useBatch, useBatchRows, useUploadBatch
- `apps/web/components/projects/batch-empty-state.tsx` - Empty state component with FileSpreadsheet icon
- `apps/web/app/(platform)/projects/[id]/page.tsx` - Project detail page with breadcrumb, header, and content zones
- `apps/web/components/ui/breadcrumb.tsx` - shadcn/ui breadcrumb component (via CLI)

**Modified:**
- `apps/web/lib/api/client.ts` - Fixed FormData Content-Type handling (line 83-85)
- `apps/web/lib/api/schemas/index.ts` - Added batch schema barrel export
- `apps/web/lib/api/endpoints/index.ts` - Added batches endpoint barrel export
- `apps/web/lib/query/hooks/index.ts` - Added use-batches barrel export

## Decisions Made

1. **FormData Content-Type handling:** Conditionally skip Content-Type header when body is FormData to allow browser auto-generation of multipart boundary. This is critical for file uploads to work correctly.

2. **Batch list query key structure:** Used `['projects', projectId, 'batches']` without limit/offset in the query key to simplify cache invalidation. The upload mutation can invalidate all batch list queries for a project without worrying about pagination parameters.

3. **Empty state CTA approach:** BatchEmptyState component guides users to the "Nova Importacao" button in the header instead of duplicating the action. This reduces UI clutter and maintains a single source of truth for the upload action.

4. **Next.js 15 async params:** Used React's `use()` hook to unwrap the params Promise in the client component, following Next.js 15's new async params pattern.

5. **Skeleton count:** Used 6 skeleton cards for batch grid loading state, matching the existing project grid pattern for consistency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all implementations followed established patterns from existing codebase (projects endpoints, use-projects hooks, project list page).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Project detail page shell is ready to host the upload modal (Phase 14)
- Batch list zone is ready for the batch grid component (Phase 15)
- React Query hooks are wired and tested, ready for consumption by UI components
- FormData upload fix ensures batch upload modal will work when implemented

**Blockers:** None

**Concerns:** None - all verification passed:
- Type checking: ✅ No errors
- Linting: ✅ No errors in modified files
- Patterns: ✅ Follows existing codebase patterns exactly

---
*Phase: 13-api-foundation-project-detail-page*
*Completed: 2026-01-30*
