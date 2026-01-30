---
phase: 15-batch-grid
plan: 01
subsystem: ui
tags: [next.js, react, shadcn, batch-display, responsive-grid]

# Dependency graph
requires:
  - phase: 14-upload-modal
    provides: Upload modal integration and batch API hooks
  - phase: 13-batch-listing
    provides: BatchResponse and BatchListResponse types
provides:
  - BatchCard component with relative dates, mode badges, and row counts
  - BatchGrid component with loading skeletons and empty state
  - Responsive 3-column grid layout for batch history
  - Direct upload CTA in empty state
affects: [16-batch-detail, future-batch-operations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Relative date formatting in Portuguese using Intl.RelativeTimeFormat"
    - "Colored badge variants for LIST_MODE (blue) and PROFILE_MODE (purple)"
    - "Skeleton loading pattern matching grid layout"

key-files:
  created:
    - apps/web/components/projects/batch-card.tsx
    - apps/web/components/projects/batch-grid.tsx
  modified:
    - apps/web/components/projects/batch-empty-state.tsx
    - apps/web/app/(platform)/projects/[id]/page.tsx

key-decisions:
  - "Used Intl.RelativeTimeFormat('pt-BR') for Portuguese relative dates"
  - "Badge colors: blue for LIST_MODE, purple for PROFILE_MODE (matches design system)"
  - "6 skeleton cards during loading (same as ProjectGrid pattern)"

patterns-established:
  - "Batch card pattern: date → mode badge → row count, vertically stacked"
  - "BatchGrid encapsulates all batch display states (loading/empty/data)"
  - "Empty state includes direct CTA button, not just header reference"

# Metrics
duration: 4min
completed: 2026-01-30
---

# Phase 15 Plan 01: Batch Grid Summary

**Responsive batch card grid with Portuguese relative dates, colored mode badges, skeleton loading, and upload CTA in empty state**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-30T18:00:00Z
- **Completed:** 2026-01-30T18:04:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- BatchCard component displays batch history with clickable navigation to batch detail pages
- BatchGrid handles three states: loading (6 skeletons), empty (with upload CTA), data (responsive grid)
- Portuguese relative dates ("2 horas atrás", "ontem", "3 dias atrás") for batch creation times
- Colored mode badges distinguish LIST_MODE (blue) and PROFILE_MODE (purple) batches
- Empty state now has direct "Enviar planilha" button that opens upload modal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BatchCard component and BatchGrid with skeletons** - `2dc3009` (feat)
2. **Task 2: Update BatchEmptyState with upload CTA and wire BatchGrid into project detail page** - `b53b001` (feat)

## Files Created/Modified
- `apps/web/components/projects/batch-card.tsx` - Clickable card with relative date, mode badge, row count, chevron icon; links to `/projects/[id]/batches/[batchId]`
- `apps/web/components/projects/batch-grid.tsx` - Grid container with loading skeletons, empty state, and responsive 3-column layout
- `apps/web/components/projects/batch-empty-state.tsx` - Added onUploadClick prop and "Enviar planilha" button
- `apps/web/app/(platform)/projects/[id]/page.tsx` - Replaced inline batch rendering with BatchGrid component

## Decisions Made
- **Relative date formatting:** Used `Intl.RelativeTimeFormat('pt-BR')` for Portuguese relative dates with intelligent unit selection (minutes → hours → days → weeks → months)
- **Mode badge colors:** Blue for LIST_MODE, purple for PROFILE_MODE (consistent with design system color palette)
- **Empty state CTA:** Added direct "Enviar planilha" button to BatchEmptyState instead of only referencing header button - improves UX by reducing steps
- **Component abstraction:** BatchGrid encapsulates all batch display logic (loading/empty/data states), keeping project detail page clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed ProjectCard/ProjectGrid patterns successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Batch grid displays batch history with clear visual hierarchy
- Clicking a batch card navigates to `/projects/[id]/batches/[batchId]` route (ready for Phase 16: Batch Detail)
- Mode badges clearly distinguish LIST_MODE and PROFILE_MODE batches
- Empty state guides users to upload their first batch
- Responsive layout works across mobile, tablet, and desktop

**Ready for Phase 16 (Batch Detail):** Batch grid navigation links are wired to batch detail routes.

**Note:** Phase 16 will need to create the batch detail page at `/projects/[id]/batches/[batchId]` to complete the user journey.

---
*Phase: 15-batch-grid*
*Completed: 2026-01-30*
