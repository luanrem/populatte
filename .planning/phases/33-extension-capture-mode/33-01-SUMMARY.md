---
phase: 33-extension-capture-mode
plan: 01
subsystem: extension
tags: [content-script, css-selector-generator, intersection-observer, dom-highlighting]

# Dependency graph
requires:
  - phase: 29-extension-popup
    provides: Extension popup foundation and messaging infrastructure
provides:
  - Content script capture module for element selection
  - CSS selector generation with fallbacks
  - Element highlighting overlay system
  - Badge tracking with IntersectionObserver
affects: [33-02, 33-03, 33-04, extension-population]

# Tech tracking
tech-stack:
  added: [css-selector-generator]
  patterns: [AbortController cleanup, IntersectionObserver positioning]

key-files:
  created:
    - apps/extension/src/content/capture/selector-gen.ts
    - apps/extension/src/content/capture/highlighter.ts
    - apps/extension/src/content/capture/badge-tracker.ts
    - apps/extension/src/content/capture/capture-mode.ts
    - apps/extension/src/content/capture/index.ts

key-decisions:
  - "Use css-selector-generator with blacklist for framework classes"
  - "IntersectionObserver for badge positioning (not polling)"
  - "AbortController for automatic event listener cleanup"
  - "Blue outline (#0066ff) with 150ms transitions"

patterns-established:
  - "Content script components use AbortController signal for cleanup"
  - "IntersectionObserver for efficient DOM position tracking"
  - "Selector generation with nth-child fallbacks for resilience"

# Metrics
duration: 4min
completed: 2026-02-05
---

# Phase 33 Plan 01: Content Script Capture Foundation Summary

**CSS selector generation with css-selector-generator, blue outline element highlighting, and badge positioning via IntersectionObserver**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-05T12:30:05Z
- **Completed:** 2026-02-05T12:33:53Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments
- Installed css-selector-generator library for robust CSS selector generation
- Created ElementHighlighter class with blue overlay on hover and tooltip with element info
- Created BadgeTracker using IntersectionObserver for efficient positioning
- Created CaptureMode coordinator to orchestrate all capture components

## Task Commits

Each task was committed atomically:

1. **Task 1: Install css-selector-generator and create selector wrapper** - `32842c8` (feat)
2. **Task 2: Create element highlighter with overlay and tooltip** - `43484c6` (feat)
3. **Task 3: Create badge tracker and capture mode coordinator** - `f4ca333` (feat)

## Files Created/Modified
- `apps/extension/package.json` - Added css-selector-generator dependency
- `apps/extension/src/content/capture/selector-gen.ts` - CSS selector generation with fallbacks
- `apps/extension/src/content/capture/highlighter.ts` - Blue outline overlay and tooltip on hover
- `apps/extension/src/content/capture/badge-tracker.ts` - Numbered badges with IntersectionObserver
- `apps/extension/src/content/capture/capture-mode.ts` - Main coordinator class
- `apps/extension/src/content/capture/index.ts` - Module exports

## Decisions Made
- Used css-selector-generator with blacklist patterns for React, Angular, Vue, and hashed classes
- Generate nth-child fallback selectors for resilience against dynamic pages
- Use AbortController signal for automatic event listener cleanup on deactivate
- IntersectionObserver instead of getBoundingClientRect polling for badge positioning
- Maximum safe z-index (2147483647) for overlays to appear above page content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript strict mode required using `.forEach()` instead of `for...of` on Map iterators
- Added getter methods `getCurrentTarget()` and `isActive()` to ElementHighlighter for API completeness

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Capture module ready for integration with popup UI
- Plan 33-02 can add message types and API functions to use capture
- Plan 33-03 will create popup UI components for capture mode

---
*Phase: 33-extension-capture-mode*
*Completed: 2026-02-05*
