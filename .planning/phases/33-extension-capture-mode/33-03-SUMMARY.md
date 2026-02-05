---
phase: 33-extension-capture-mode
plan: 03
subsystem: extension-ui
tags: [dnd-kit, react, capture-mode, sortable-list, popup]

# Dependency graph
requires:
  - phase: 33-01
    provides: Content script capture foundation and badge tracker
  - phase: 33-02
    provides: Capture mode message types and API functions
provides:
  - CapturePanel component for capture mode UI container
  - StepList component with drag-and-drop reordering
  - StepConfig component for step configuration form
  - CaptureStep interface for step data structure
affects: [33-04, extension-popup, extension-capture-flow]

# Tech tracking
tech-stack:
  added: [@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities]
  patterns: [useSortable hook, arrayMove reordering, searchable dropdown]

key-files:
  created:
    - apps/extension/entrypoints/popup/components/capture/CapturePanel.tsx
    - apps/extension/entrypoints/popup/components/capture/StepList.tsx
    - apps/extension/entrypoints/popup/components/capture/StepConfig.tsx
    - apps/extension/entrypoints/popup/components/capture/index.ts

key-decisions:
  - "Use dnd-kit for drag-and-drop (same as web app)"
  - "PointerSensor with 150ms delay to distinguish drag from click"
  - "Searchable column dropdown for source selection"
  - "Wait presets: 500ms, 1s, 2s plus custom input"
  - "Validation on submit only (not inline)"

patterns-established:
  - "SortableStepItem subcomponent with useSortable hook"
  - "Config view replaces list view (modal-free)"
  - "ELEMENT_CAPTURED message listener in CapturePanel"

# Metrics
duration: 5min
completed: 2026-02-05
---

# Phase 33 Plan 03: Capture Mode UI Summary

**Capture panel with drag-and-drop step list using dnd-kit, step configuration form with searchable column dropdown, and cancel confirmation flow**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-05T12:39:00Z
- **Completed:** 2026-02-05T12:44:00Z
- **Tasks:** 3/3
- **Files modified:** 5

## Accomplishments
- Installed dnd-kit packages for accessible drag-and-drop
- Created StepList with SortableContext and useSortable hook
- Created StepConfig with action type radios, source mode toggle, and options
- Created CapturePanel container managing steps state and view switching
- Add Wait button for inserting manual delay steps

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dnd-kit dependencies** - `4062e3a` (feat)
2. **Task 2: Create StepList with drag-and-drop** - `3e12cab` (feat)
3. **Task 3: Create StepConfig and CapturePanel** - `f4e27b3` (feat)

## Files Created/Modified
- `apps/extension/package.json` - Added dnd-kit dependencies
- `apps/extension/entrypoints/popup/components/capture/StepList.tsx` - Sortable step list with drag handles
- `apps/extension/entrypoints/popup/components/capture/StepConfig.tsx` - Step configuration form
- `apps/extension/entrypoints/popup/components/capture/CapturePanel.tsx` - Main capture mode container
- `apps/extension/entrypoints/popup/components/capture/index.ts` - Module exports

## Decisions Made
- Used dnd-kit (same library as web app) for consistent DnD behavior
- PointerSensor with 150ms delay to distinguish drag intention from regular clicks
- Config panel replaces step list view (no modal overlay)
- Searchable dropdown for column selection with text filtering
- Wait action presets (500ms, 1s, 2s) plus custom input field
- Cancel confirmation only when steps exist (respects user effort)
- Validation on submit only (per CONTEXT.md spec)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing type-check errors in handlers.ts and send.ts (unrelated to our changes) - these are configuration issues with browser namespace and import.meta.env.DEV
- ESLint config missing in extension (no eslint.config.js) - pre-existing issue
- Both issues don't affect build which passes successfully

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Capture UI components ready for integration with popup App.tsx
- Plan 33-04 will wire up the capture flow and background handler
- CapturePanel listens for ELEMENT_CAPTURED messages and auto-opens config
- Components export via index.ts for clean imports

---
*Phase: 33-extension-capture-mode*
*Completed: 2026-02-05*
