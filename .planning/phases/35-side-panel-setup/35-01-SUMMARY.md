---
phase: 35-side-panel-setup
plan: 01
subsystem: extension-ui
tags: [wxt, chrome-extension, sidepanel, react, manifest-v3]

# Dependency graph
requires:
  - phase: 28-capture-ui
    provides: Popup UI with all components (ConnectView, CapturePanel, selectors, fill controls)
provides:
  - Side Panel entrypoint with React UI (replaces popup)
  - WXT manifest configuration for sidePanel permission
  - setPanelBehavior for icon-click activation
  - Fluid dimensions (w-full min-h-screen) for Side Panel layout
affects: [35-02-sidepanel-state, 35-03-sidepanel-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WXT auto-detection: entrypoints/sidepanel/ directory generates side_panel.default_path"
    - "Side Panel activation: browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })"
    - "Fluid layout: w-full min-h-screen instead of fixed popup dimensions"

key-files:
  created:
    - apps/extension/entrypoints/sidepanel/index.html
    - apps/extension/entrypoints/sidepanel/main.tsx
    - apps/extension/entrypoints/sidepanel/App.tsx
    - apps/extension/entrypoints/sidepanel/components/ (13 files moved from popup)
  modified:
    - apps/extension/wxt.config.ts (added sidePanel permission)
    - apps/extension/entrypoints/background.ts (added setPanelBehavior)
  deleted:
    - apps/extension/entrypoints/popup/ (entire directory - clean break)

key-decisions:
  - "Deleted popup/ directory completely (no coexistence with sidepanel/)"
  - "Changed dimensions from w-[350px] h-[500px] to w-full min-h-screen for fluid Side Panel"
  - "Preserved all message passing logic (port-based refactor comes in Plan 02)"

patterns-established:
  - "WXT convention-based manifest generation: directory name determines entrypoint type"
  - "Side Panel as sole UI: no popup fallback, icon click opens/closes panel"

# Metrics
duration: 3min
completed: 2026-02-06
---

# Phase 35 Plan 01: Side Panel Setup Summary

**WXT sidepanel entrypoint with React UI, sidePanel permission, and icon-click activation replacing popup**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-06T02:53:36Z
- **Completed:** 2026-02-06T02:56:36Z
- **Tasks:** 2
- **Files modified:** 19 (17 moved, 2 config updated)

## Accomplishments
- Migrated entire popup UI to sidepanel entrypoint (13 component files + 3 entry files)
- WXT generates side_panel.default_path automatically from entrypoints/sidepanel/ convention
- Extension builds with sidePanel as sole UI (no popup, manifest verified)
- Fluid dimensions allow Side Panel to resize naturally (Chrome default ~320px, user-resizable)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sidepanel entrypoint and move popup components** - `fcfdaef` (feat)
2. **Task 2: Update WXT config and background for sidepanel activation** - `24b6abf` (feat)
3. **Cleanup: Remove popup entrypoint completely** - `34a02eb` (chore)

## Files Created/Modified
- `apps/extension/entrypoints/sidepanel/index.html` - HTML entrypoint (same structure as popup's)
- `apps/extension/entrypoints/sidepanel/main.tsx` - React mount point with StrictMode
- `apps/extension/entrypoints/sidepanel/App.tsx` - Main app component with fluid dimensions (w-full min-h-screen)
- `apps/extension/entrypoints/sidepanel/components/*.tsx` - All 9 root components moved from popup
- `apps/extension/entrypoints/sidepanel/components/capture/*.tsx` - All 3 capture components moved from popup
- `apps/extension/entrypoints/sidepanel/components/index.ts` - Component barrel export
- `apps/extension/entrypoints/sidepanel/components/capture/index.ts` - Capture barrel export
- `apps/extension/wxt.config.ts` - Added 'sidePanel' to permissions array
- `apps/extension/entrypoints/background.ts` - Added browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

## Decisions Made

**1. Deleted popup/ directory completely in separate commit**
- Rationale: Clean git history shows the move (Task 1 creates sidepanel), then config (Task 2), then cleanup (Task 3). Prevents manifest ambiguity if both popup/ and sidepanel/ exist simultaneously.
- Impact: WXT manifest no longer generates default_popup (verified in .output/chrome-mv3/manifest.json).

**2. Changed dimensions from w-[350px] h-[500px] to w-full min-h-screen**
- Rationale: Side Panel is fluid-width (Chrome default ~320px, user can resize). Fixed dimensions would clip or create unnecessary scrollbars.
- Applied to both views: Main app view (line 327 in App.tsx) and capture mode view (line 311).

**3. Preserved message passing logic unchanged**
- Rationale: Plan 02 handles the port-based communication refactor. This plan focuses solely on entrypoint migration.
- Message types still reference "Popup" (PopupToBackgroundMessage) - cosmetic, no functional impact.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing TypeScript errors:**
- `npm run type-check` shows errors in src/messaging/ and src/storage/ (browser namespace, import.meta, WXT types).
- These errors existed before this plan and are NOT related to sidepanel migration.
- Build succeeds (`npm run build` passes), manifest generates correctly.
- Verified: No new type errors introduced by sidepanel code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Per-Tab State & Port Communication):**
- Side Panel entrypoint exists and renders correctly
- WXT manifest has sidePanel permission and default_path
- Icon click activates Side Panel (setPanelBehavior configured)
- All components preserved with same state management (ready for port refactor)

**No blockers or concerns.**

---
*Phase: 35-side-panel-setup*
*Completed: 2026-02-06*

## Self-Check: PASSED

All files verified:
- apps/extension/entrypoints/sidepanel/index.html ✓
- apps/extension/entrypoints/sidepanel/main.tsx ✓
- apps/extension/entrypoints/sidepanel/App.tsx ✓
- apps/extension/entrypoints/sidepanel/components/ (13 files) ✓

All commits verified:
- fcfdaef (Task 1) ✓
- 24b6abf (Task 2) ✓
- 34a02eb (Cleanup) ✓
