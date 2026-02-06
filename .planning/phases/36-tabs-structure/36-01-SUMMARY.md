---
phase: 36-tabs-structure
plan: 01
subsystem: ui
tags: [react, tabs, extension, sidepanel]

# Dependency graph
requires:
  - phase: 35-side-panel-setup
    provides: Port-based communication, per-tab state, connection stability
provides:
  - TabBar component with Preencher and Captura tabs
  - Tab-based layout architecture for Side Panel
  - Disabled state for Captura tab when not capturing
  - Pulsing badge for active capture mode
  - Auto-switch to Captura tab on capture mode entry
affects: [37-preencher-content, 39-captura-content]

# Tech tracking
tech-stack:
  added: []
  patterns: [tab-based UI architecture, controlled component pattern]

key-files:
  created:
    - apps/extension/entrypoints/sidepanel/components/TabBar.tsx
  modified:
    - apps/extension/entrypoints/sidepanel/App.tsx
    - apps/extension/entrypoints/sidepanel/components/index.ts

key-decisions:
  - "Tab bar uses shadcn-style aesthetic with Tailwind, not actual shadcn components (not installed)"
  - "Captura tab disabled state shows tooltip 'Inicie a captura primeiro'"
  - "Blue pulsing dot on Captura tab when capture is active"
  - "Auto-switch to Captura tab on capture mode entry and storage restoration"
  - "Fixed pre-existing port reference bugs (lines 270 and 321)"

patterns-established:
  - "Global header + global status + tab bar + per-tab content layout"
  - "Controlled tab component with activeTab state in parent"
  - "Tab state persists with capture mode (when restoring from storage, auto-switch to Captura)"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 36 Plan 01: Tabs Structure Summary

**Tab-based Side Panel UI with Preencher and Captura tabs, disabled state handling, pulsing capture badge, and auto-switch behavior**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T17:52:09Z
- **Completed:** 2026-02-06T17:54:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created TabBar component with two tabs (Preencher / Captura) using shadcn-style Tailwind classes
- Restructured App.tsx layout: global header → ConnectedIndicator → TabBar → per-tab content
- Implemented disabled state for Captura tab with tooltip when capture is not active
- Added blue pulsing dot badge on Captura tab when capture mode is active
- Auto-switch to Captura tab on capture mode entry and when restoring active capture from storage
- Fixed pre-existing port reference bugs (port → portRef.current on lines 270 and 321)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TabBar component with shadcn-style tabs** - `722ab8b` (feat)
2. **Task 2: Restructure App.tsx layout with tab bar and per-tab content** - `6cffad2` (feat)

## Files Created/Modified
- `apps/extension/entrypoints/sidepanel/components/TabBar.tsx` - Two-tab bar with icons, disabled state, pulsing badge
- `apps/extension/entrypoints/sidepanel/App.tsx` - Restructured layout with activeTab state, tab bar, per-tab content areas
- `apps/extension/entrypoints/sidepanel/components/index.ts` - Export TabBar

## Decisions Made

**Shadcn-style without shadcn components:** Used Tailwind classes to match shadcn/ui aesthetic rather than installing shadcn's actual Tabs component in the extension (extension doesn't have shadcn installed).

**Disabled tab tooltip:** Captura tab shows "Inicie a captura primeiro" tooltip when clicked while disabled (captureActive is false).

**Auto-switch behavior:** When capture mode starts (either via "Criar Mapping" button or restored from storage), automatically switch to Captura tab. When capture ends, stay on Captura tab (user manually switches).

**Bug fixes during refactor:** Fixed two pre-existing port reference bugs from the popup→sidepanel migration (lines 270 and 321 were referencing `port` instead of `portRef.current`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed port reference bugs on lines 270 and 321**
- **Found during:** Task 2 (App.tsx restructure)
- **Issue:** Lines 270 and 321 referenced `port` instead of `portRef.current` (pre-existing bug from popup→sidepanel migration)
- **Fix:** Changed `if (!port || ...` to `if (!portRef.current || ...` on line 270, and `if (!port) throw...` to `if (!portRef.current) throw...` on line 321
- **Files modified:** apps/extension/entrypoints/sidepanel/App.tsx
- **Verification:** Extension builds without errors
- **Committed in:** 6cffad2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was necessary for correct operation (pre-existing issue). No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tab structure established and working
- Ready for Phase 37 (Preencher content) to populate Preencher tab with proper fill workflow
- Ready for Phase 39 (Captura content) to finalize Captura tab content
- Current tab content is placeholder (existing components moved into tabs)

## Self-Check: PASSED

All created files and commits verified:
- ✓ apps/extension/entrypoints/sidepanel/components/TabBar.tsx
- ✓ Commit 722ab8b (Task 1)
- ✓ Commit 6cffad2 (Task 2)

---
*Phase: 36-tabs-structure*
*Completed: 2026-02-06*
