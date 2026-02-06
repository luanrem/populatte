---
phase: 37-aba-preencher
plan: 01
subsystem: ui
tags: [react, dnd-kit, side-panel, extension, chrome-extension, lucide-react]

# Dependency graph
requires:
  - phase: 36-tabs-structure
    provides: Tab bar with Preencher/Captura tabs and state management
provides:
  - Compact Preencher tab layout optimized for 320px Side Panel width
  - Collapsible PreencherStepList component with drag-and-drop reordering
  - Mapping steps fetch integration via fetchMappingWithSteps
  - Invalid selector badges with hover tooltips
  - Per-step fill result indicators (success/failed)
  - Empty state UX for no batch selected
  - Sticky footer with row navigation and fill controls
affects: [37-02-element-highlighting, 38-validation-and-status, future-fill-workflow-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compact inline badges for status indicators (ConnectedIndicator)"
    - "Sticky footer pattern with scrollable content above"
    - "Collapsible sections with chevron toggle"
    - "CSS tooltip using group-hover for validation badges"
    - "Drag-and-drop using @dnd-kit/core and @dnd-kit/sortable (reuses capture pattern)"

key-files:
  created:
    - apps/extension/entrypoints/sidepanel/components/preencher/PreencherStepList.tsx
    - apps/extension/entrypoints/sidepanel/components/preencher/index.ts
  modified:
    - apps/extension/entrypoints/sidepanel/App.tsx
    - apps/extension/entrypoints/sidepanel/components/ConnectedIndicator.tsx
    - apps/extension/entrypoints/sidepanel/components/index.ts

key-decisions:
  - "Collapsed by default for steps list (per locked decision from phase planning)"
  - "Drag-and-drop reordering enabled (per locked decision from phase planning)"
  - "Per-step fill result indicators (check/cross) (per locked decision from phase planning)"
  - "No max height on steps list - entire panel scrolls (per locked decision from phase planning)"
  - "Red dot badge with hover tooltip for invalid selectors"
  - "Sticky footer contains RowIndicator + FillControls, always visible"
  - "Empty state shows Coffee icon with 'Selecione um projeto e batch para comecar'"

patterns-established:
  - "Pattern: preencher/ subdirectory for Preencher-specific components (parallel to capture/)"
  - "Pattern: Inline compact status indicators in header (dot + text)"
  - "Pattern: Sticky footer with scrollable middle section for side panel layout"
  - "Pattern: CSS tooltips using group/tooltip modifier and group-hover/tooltip:opacity transition"

# Metrics
duration: 3min
completed: 2026-02-06
---

# Phase 37 Plan 01: Preencher Tab Layout and Steps List Summary

**Compact Preencher tab layout with collapsible steps list, drag-and-drop reordering, invalid selector badges, and sticky fill controls optimized for 320px Side Panel**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-06T21:31:35Z
- **Completed:** 2026-02-06T21:34:43Z
- **Tasks:** 2
- **Files modified:** 3
- **Files created:** 2

## Accomplishments
- Restructured Preencher tab with compact layout: scrollable content + sticky footer for ~320px width
- Created collapsible PreencherStepList component with drag-and-drop reordering using @dnd-kit
- Connected mapping steps fetch (fetchMappingWithSteps) when mapping selected
- Invalid selector badges (red dot) with CSS hover tooltips showing selector value
- Per-step fill result indicators (green check for success, red cross for failed)
- Compact connection status indicator (inline dot + text in header)
- Empty state with Coffee icon when no batch selected

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure Preencher tab layout** - `9702b24` (feat)
2. **Task 2: Create PreencherStepList component** - `4dd3787` (feat)

## Files Created/Modified
- `apps/extension/entrypoints/sidepanel/components/preencher/PreencherStepList.tsx` - Collapsible steps list with drag-and-drop, validation badges, fill results
- `apps/extension/entrypoints/sidepanel/components/preencher/index.ts` - Barrel export for preencher components
- `apps/extension/entrypoints/sidepanel/components/ConnectedIndicator.tsx` - Converted to compact inline badge (dot + text)
- `apps/extension/entrypoints/sidepanel/App.tsx` - Restructured Preencher tab layout, added steps state and fetch logic
- `apps/extension/entrypoints/sidepanel/components/index.ts` - Added preencher components export

## Decisions Made

**Layout decisions (all per locked decisions from phase planning):**
- Steps list collapsed by default - prevents overwhelming UI, user expands when needed
- Drag-and-drop reordering enabled - allows users to adjust step order without re-capturing
- Per-step fill result indicators - provides granular feedback on fill success/failure
- No max height on steps list - entire panel scrolls (avoids nested scroll containers)
- Sticky footer pattern - RowIndicator and FillControls always visible at bottom

**Component architecture decisions:**
- Created preencher/ subdirectory parallel to capture/ for tab-specific components
- Reused @dnd-kit pattern from capture/StepList.tsx for consistency
- Used CSS tooltip (group-hover pattern) instead of native title for instant display
- Inline compact ConnectedIndicator in header (dot + text) vs block element below header

**State management decisions:**
- mappingSteps fetched in useEffect when state.mappingId changes
- stepValidation Map<string, boolean> for per-step validation status (populated in Plan 02)
- fillResultsMap Map<string, 'success' | 'failed'> for per-step fill results (populated in Plan 02)
- handleStepReorder updates local state immediately (optimistic, no API call yet)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Element Highlighting):**
- PreencherStepList renders with onStepClick prop wired to handleStepHighlight stub
- Step validation state exists (stepValidation Map) ready to receive validation results
- Fill results state exists (fillResultsMap Map) ready to receive fill execution results

**Ready for Plan 03 (Real-time Validation):**
- stepValidation Map initialized and passed to PreencherStepList
- Invalid selector badges render when validation.get(stepId) === false
- Summary count "X de Y passos com problema" displays in collapsed header

**Handoff to Plan 02:**
- Implement handleStepHighlight to send HIGHLIGHT_ELEMENT message to content script
- Implement validation check on mapping load (query all selectors on page)
- Populate stepValidation Map with validation results
- Implement fill result tracking to populate fillResultsMap on FILL_PROGRESS completion

## Self-Check: PASSED

All key files and commits verified.

---
*Phase: 37-aba-preencher*
*Completed: 2026-02-06*
