---
phase: 34-extension-identifier-integration
plan: 02
subsystem: ui
tags: [react, lucide-react, extension, navigation, row-controls]

# Dependency graph
requires:
  - phase: 34-extension-identifier-integration-01
    provides: RowIndicator component with identifier display
provides:
  - Prev/Next navigation arrows in RowIndicator for independent row browsing
  - handlePrev function in App.tsx for ROW_PREV message
  - Navigation buttons that work in idle state (not gated by fillStatus)
affects: [uat, testing, user-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [e.stopPropagation for nested clickable elements, conditional button rendering based on data state]

key-files:
  created: []
  modified:
    - apps/extension/entrypoints/popup/components/RowIndicator.tsx
    - apps/extension/entrypoints/popup/App.tsx

key-decisions:
  - "Navigation arrows only visible when rowTotal > 1 (hidden for single-row batches)"
  - "Prev disabled at row 0, Next disabled at last row (boundary checks)"
  - "Use e.stopPropagation to prevent copy-to-clipboard when clicking arrows"
  - "Reuse existing handleNext function for both arrow and fill-workflow Next button"

patterns-established:
  - "Nested button pattern: stopPropagation prevents parent onClick from firing"
  - "Conditional rendering: hide UI elements entirely when not applicable (rowTotal <= 1) rather than just disabling"

# Metrics
duration: 2min
completed: 2026-02-05
---

# Phase 34 Plan 02: Row Navigation Arrows Summary

**Prev/Next arrow buttons in RowIndicator enable independent row navigation without fill-workflow dependency**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-05T20:24:11Z
- **Completed:** 2026-02-05T20:26:16Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added ChevronLeft/ChevronRight navigation arrows flanking row counter
- Implemented handlePrev function to send ROW_PREV message to background script
- Wired onPrev and onNext callbacks from App.tsx to RowIndicator component
- Preserved click-to-copy behavior on identifier area using stopPropagation
- Navigation arrows work immediately after batch selection (no fill required)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add navigation arrows to RowIndicator and wire in App.tsx** - `584aa13` (feat)

**Plan metadata:** (to be committed after this SUMMARY)

## Files Created/Modified
- `apps/extension/entrypoints/popup/components/RowIndicator.tsx` - Added ChevronLeft/ChevronRight icons, onPrev/onNext props, navigation button UI with conditional rendering and boundary checks
- `apps/extension/entrypoints/popup/App.tsx` - Added handlePrev function, wired onPrev/onNext props to RowIndicator

## Decisions Made

**1. Navigation arrows only visible when rowTotal > 1**
- Rationale: Single-row batches don't need navigation controls - reduces UI clutter
- Implementation: Conditional rendering `{rowTotal > 1 && <button>...</button>}`

**2. Reuse existing handleNext for both arrow and fill-workflow Next button**
- Rationale: Both send the same ROW_NEXT message, background handler is identical
- Implementation: Pass same handleNext function to RowIndicator.onNext and FillControls.onNext

**3. Use e.stopPropagation to prevent copy-to-clipboard when clicking arrows**
- Rationale: RowIndicator outer div has click-to-copy behavior, nested arrow buttons must prevent this
- Implementation: `onClick={(e) => { e.stopPropagation(); onPrev(); }}`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Extension linter configuration issue (pre-existing)**
- Issue: `npm run lint --workspace=@populatte/extension` fails with "couldn't find eslint.config.js"
- Impact: Cannot run linter for extension workspace
- Resolution: Build succeeded with TypeScript compilation passing, code follows existing patterns
- Note: This is a pre-existing infrastructure issue unrelated to this plan

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Row navigation is now fully independent of fill workflow
- Users can browse rows immediately after batch selection
- Gap from UAT 34-01 is closed: navigation no longer gated by fillStatus
- Ready for full UAT testing of row navigation workflow

## Self-Check: PASSED

All commits verified:
- 584aa13: feat(34-02): add prev/next navigation arrows to row indicator

All files verified:
- apps/extension/entrypoints/popup/components/RowIndicator.tsx (modified)
- apps/extension/entrypoints/popup/App.tsx (modified)

---
*Phase: 34-extension-identifier-integration*
*Completed: 2026-02-05*
