---
phase: 33-extension-capture-mode
plan: 04
subsystem: extension
tags: [capture-mode, message-relay, content-script, popup, chrome-storage, wxt]

# Dependency graph
requires:
  - phase: 33-01
    provides: CaptureMode class and content script capture foundation
  - phase: 33-02
    provides: Capture message types and mapping/batch API functions
  - phase: 33-03
    provides: CapturePanel, StepList, StepConfig UI components
provides:
  - Complete capture mode flow from popup to content script
  - Background script message relay for capture commands
  - Storage-based step synchronization between content and popup
  - Post-save success state with dashboard link and population entry
affects: [34-population-mode, extension-production]

# Tech tracking
tech-stack:
  added: []
  patterns: [storage-based-sync, background-message-relay, chrome-extension-messaging]

key-files:
  modified:
    - apps/extension/entrypoints/content.ts
    - apps/extension/entrypoints/background.ts
    - apps/extension/entrypoints/popup/App.tsx
    - apps/extension/entrypoints/popup/components/capture/CapturePanel.tsx
    - apps/extension/src/content/capture/capture-mode.ts
    - apps/api/src/presentation/dto/step.dto.ts

key-decisions:
  - "Use chrome.storage.local for step synchronization (popup cannot receive messages when closed)"
  - "Background script saves steps to storage (content scripts have reliable storage access)"
  - "Popup polls storage every 500ms during capture mode"
  - "Module-level captureMode instance persists across messages, cleaned up on CAPTURE_STOP"

patterns-established:
  - "Storage-based sync between popup and content script for state that must persist across popup close/reopen"
  - "Background script as message router between popup and content scripts"
  - "CAPTURE_MODE_STATE storage key for persisting capture session"

# Metrics
duration: ~35min
completed: 2026-02-05
---

# Phase 33 Plan 04: Capture Flow Integration Summary

**End-to-end capture mode wiring with background message relay, storage-based step sync, and post-save success state with dashboard link**

## Performance

- **Duration:** ~35 min (including checkpoint verification and 7 bug fixes)
- **Started:** 2026-02-05T12:50:00Z
- **Completed:** 2026-02-05T13:25:00Z
- **Tasks:** 3/3 (original) + 7 bug fixes
- **Files modified:** 7

## Accomplishments

- Wired capture mode handlers in content script (CAPTURE_START, CAPTURE_STOP, CAPTURE_HIGHLIGHT, CAPTURE_REMOVE_STEP)
- Added background script message relay between popup and content scripts
- Integrated CapturePanel into popup App.tsx with "Criar Mapping" button
- Implemented storage-based step synchronization for reliable state persistence
- Added loading state during save and success state with action buttons
- Fixed backend step DTO validation to accept optional fields

## Task Commits

Original plan tasks committed atomically:

1. **Task 1: Add capture mode handlers to content script** - `269b11f` (feat)
2. **Task 2: Add capture message relay to background script** - `5059f89` (feat)
3. **Task 3: Wire capture mode into popup App with loading and success states** - `626aae4` (feat)

**Plan metadata:** `ec93c63` (docs: complete plan)

## Bug Fix Commits

During checkpoint verification, 7 issues were discovered and fixed:

| # | Commit | Issue | Fix |
|---|--------|-------|-----|
| 1 | `0103ba4` | Capture mode state lost on popup close/reopen | Added storage persistence for capture mode state |
| 2 | `b2ae5de` | Captured steps not appearing in popup list | Fixed message listener and state update |
| 3 | `20caf06` | Steps lost between popup close/open | Implemented storage-based sync with polling |
| 4 | `35fe2f8` | Content script storage access unreliable | Moved step storage to background script |
| 5 | `4354aeb` | Columns not loading, dashboard link wrong, state not refreshing | Fixed fetch timing, URL construction, and state reload |
| 6 | `3c85b5e` | Columns dropdown not working, popup too narrow, save detection failing | Fixed dropdown state, popup width, and hasMapping logic |
| 7 | `59d2255` | Steps not saving to backend | Added logging, fixed backend DTO validation for optional fields |

## Files Created/Modified

- `apps/extension/entrypoints/content.ts` - Added capture mode message handlers
- `apps/extension/entrypoints/background.ts` - Added message relay and storage management
- `apps/extension/entrypoints/popup/App.tsx` - Integrated CapturePanel with capture mode flow
- `apps/extension/entrypoints/popup/components/capture/CapturePanel.tsx` - Added storage sync, success state UI
- `apps/extension/src/content/capture/capture-mode.ts` - Enhanced capture state management
- `apps/extension/entrypoints/popup/components/index.ts` - Added capture module export
- `apps/api/src/presentation/dto/step.dto.ts` - Fixed optional field decorators for step creation

## Message Flow

```
User clicks "Criar Mapping" in popup
  -> App.tsx sends CAPTURE_START to background
  -> background.ts relays to content.ts
  -> content.ts activates CaptureMode
  -> User clicks element on page
  -> CaptureMode sends ELEMENT_CAPTURED to runtime
  -> background.ts saves step to chrome.storage.local
  -> popup polls storage every 500ms
  -> CapturePanel adds step to list
  -> User clicks "Save"
  -> App.tsx calls createMappingWithSteps API
  -> App.tsx sends CAPTURE_STOP to cleanup
  -> CapturePanel shows success state
```

## Decisions Made

- **Storage-based sync for steps:** Chrome extension popups cannot receive messages when closed, so steps must persist to chrome.storage.local. Background script handles storage writes for reliability.
- **Polling instead of listeners:** Popup polls storage every 500ms during capture mode because storage.onChanged doesn't reliably fire for popup contexts.
- **Module-level captureMode instance:** Persists across message events in content script, properly cleaned up on CAPTURE_STOP.
- **Backend DTO fix:** Added `@IsOptional()` decorators to step DTO fields that should be nullable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Capture mode state lost on popup close/reopen**
- **Found during:** Checkpoint verification
- **Issue:** Capture mode boolean wasn't persisted, so reopening popup showed normal view
- **Fix:** Store capture mode state in chrome.storage.local with session key
- **Committed in:** `0103ba4`

**2. [Rule 1 - Bug] Captured steps not appearing in step list**
- **Found during:** Checkpoint verification
- **Issue:** Message listener not properly updating React state
- **Fix:** Fixed state update pattern in listener callback
- **Committed in:** `b2ae5de`

**3. [Rule 1 - Bug] Steps lost between popup close/open**
- **Found during:** Checkpoint verification
- **Issue:** Runtime messages don't reach popup when closed
- **Fix:** Implemented storage-based sync with polling interval
- **Committed in:** `20caf06`

**4. [Rule 1 - Bug] Storage access unreliable from content script**
- **Found during:** Checkpoint verification
- **Issue:** Content scripts have limited storage API access in some contexts
- **Fix:** Route step storage through background script which has full API access
- **Committed in:** `35fe2f8`

**5. [Rule 1 - Bug] Multiple UI issues post-fix**
- **Found during:** Checkpoint verification
- **Issue:** Columns fetch failing, dashboard link incorrect, state not refreshing after save
- **Fix:** Fixed async timing, URL path construction, and state reload after save
- **Committed in:** `4354aeb`

**6. [Rule 1 - Bug] Columns dropdown and popup sizing**
- **Found during:** Checkpoint verification
- **Issue:** Dropdown showing empty, popup too narrow for content
- **Fix:** Fixed dropdown state binding, increased popup min-width
- **Committed in:** `3c85b5e`

**7. [Rule 1 - Bug] Steps not persisting to backend**
- **Found during:** Checkpoint verification
- **Issue:** Backend rejecting step creation due to validation errors on optional fields
- **Fix:** Added @IsOptional() decorators to step.dto.ts, added detailed logging
- **Committed in:** `59d2255`

---

**Total deviations:** 7 auto-fixed bugs
**Impact on plan:** All fixes necessary for correct operation. Chrome extension messaging model required storage-based synchronization pattern not anticipated in original plan.

## Issues Encountered

- **Chrome extension messaging limitation:** Popup contexts cannot receive runtime messages when closed. This required redesigning the step sync to use storage instead of messages.
- **Content script storage access:** In some contexts, content scripts have limited chrome.storage access. Routing through background script resolved this.
- **Backend DTO validation:** NestJS class-validator was rejecting steps with undefined optional fields. Required adding explicit @IsOptional() decorators.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Capture mode feature is fully functional end-to-end
- Phase 33 complete - ready for Phase 34 (Population Mode)
- Mapping creation works with steps persisted to database
- Dashboard integration confirmed via "Editar no Dashboard" link
- "Comecar a Preencher" button ready to trigger population mode

---
*Phase: 33-extension-capture-mode*
*Completed: 2026-02-05*
