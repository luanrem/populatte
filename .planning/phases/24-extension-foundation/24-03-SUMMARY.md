---
phase: 24-extension-foundation
plan: 03
subsystem: extension
tags: [messaging, type-safety, discriminated-unions, wxt, chrome-extension]

# Dependency graph
requires:
  - phase: 24-01
    provides: "WXT extension foundation with React, TypeScript, and Tailwind CSS"
  - phase: 24-02
    provides: "Type-safe storage abstraction layer using WXT storage.defineItem()"
provides:
  - "Type-safe message bus with discriminated union message types"
  - "Message handler registry pattern with createMessageRouter"
  - "Complete background service worker with storage + messaging integration"
  - "Popup-to-background and background-to-content communication infrastructure"
affects: ["24-04", "popup-ui", "auth-flow", "form-filling"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated union message types with explicit type field"
    - "Response wrapper pattern: { success: true, data } | { success: false, error }"
    - "Message handler registry with createMessageRouter for type-safe routing"
    - "State broadcasting from background to popup on changes"

key-files:
  created:
    - apps/extension/src/types/messages.ts
    - apps/extension/src/types/responses.ts
    - apps/extension/src/types/index.ts
    - apps/extension/src/messaging/send.ts
    - apps/extension/src/messaging/handlers.ts
    - apps/extension/src/messaging/index.ts
  modified:
    - apps/extension/entrypoints/background.ts
    - apps/extension/entrypoints/content.ts
    - apps/extension/entrypoints/popup/App.tsx
    - apps/extension/src/storage/auth.ts
    - apps/extension/src/storage/selection.ts
    - apps/extension/src/storage/preferences.ts

key-decisions:
  - "Use discriminated unions for all messages with explicit type field"
  - "Separate message types by direction (PopupToBackground, BackgroundToContent, etc.)"
  - "Configurable message timeout (default 10 seconds) with dev-only logging"
  - "Silent broadcast for state updates (popup may not be open)"
  - "Handler registry pattern for clean message routing in background"
  - "Complete background.ts replaces minimal version from 24-01"

patterns-established:
  - "Message naming: ACTION_VERB for commands, GET_NOUN for queries, NOUN_EVENT for broadcasts"
  - "Response helpers: success(data), ok(), error(message) for consistent error handling"
  - "State building pattern: async buildState() aggregates storage into ExtensionState"
  - "Relative imports from entrypoints to src modules (../src/messaging, ../../src/types)"

# Metrics
duration: 4m 56s
completed: 2026-02-03
---

# Phase 24 Plan 03: Messaging Infrastructure Summary

**Type-safe message bus with discriminated unions, handler registry, and complete background service worker integrating storage + messaging for popup-background-content communication**

## Performance

- **Duration:** 4 min 56 sec
- **Started:** 2026-02-03T18:57:17Z
- **Completed:** 2026-02-03T19:02:13Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Implemented type-safe messaging infrastructure with discriminated union message types
- Created message handler registry pattern with automatic error handling
- Replaced minimal background.ts with complete implementation integrating storage and messaging
- Established popup-to-background and background-to-content communication channels
- Extension builds successfully with complete messaging system (231.04 kB)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define message types** - `c3ca4c5` (feat)
2. **Task 2: Create messaging utilities** - `57682e5` (feat)
3. **Task 3: Wire up messaging in all contexts** - `bd4125e` (feat)

## Files Created/Modified
- `apps/extension/src/types/messages.ts` - Discriminated union message types organized by domain (auth, project, batch, row, fill)
- `apps/extension/src/types/responses.ts` - Response wrapper types (Response<T>, VoidResponse) with success/error pattern
- `apps/extension/src/types/index.ts` - Unified type exports
- `apps/extension/src/messaging/send.ts` - sendToBackground, sendToContent, broadcast functions with timeout handling
- `apps/extension/src/messaging/handlers.ts` - createMessageRouter, success, ok, error helper functions
- `apps/extension/src/messaging/index.ts` - Messaging module exports with usage documentation
- `apps/extension/entrypoints/background.ts` - Complete service worker with storage init + message routing
- `apps/extension/entrypoints/content.ts` - Message listener for PING and FILL_EXECUTE
- `apps/extension/entrypoints/popup/App.tsx` - State loading, refresh button, Test Connection button

## Decisions Made

Per CONTEXT.md architectural decisions:
- **Message types:** Discriminated unions with explicit type field for type safety
- **Response pattern:** { success: true, data } | { success: false, error } for consistent error handling
- **Message naming:** ACTION_VERB for commands, GET_NOUN for queries, NOUN_EVENT for broadcasts
- **Timeout handling:** Configurable timeouts (default 10s) with Promise rejection on timeout
- **Dev logging:** Console logging in development, silent in production via import.meta.env.DEV
- **Import strategy:** Relative imports from entrypoints (../src/messaging) due to WXT's @ alias pointing to extension root

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed WXT storage import path**
- **Found during:** Task 3 (Build verification)
- **Issue:** Storage files imported from 'wxt/storage' but WXT exports storage from 'wxt/utils/storage'
- **Fix:** Updated imports in auth.ts, selection.ts, preferences.ts to use 'wxt/utils/storage'
- **Files modified:** apps/extension/src/storage/*.ts
- **Verification:** Extension builds successfully (231.04 kB)
- **Committed in:** bd4125e (Task 3 commit)
- **Note:** This bug existed from Plan 24-02 but didn't surface until messaging integration required build

**2. [Rule 3 - Blocking] Resolved WXT @ alias path resolution**
- **Found during:** Task 3 (Build verification)
- **Issue:** WXT generates @ alias pointing to extension root, not src/. Entrypoints need relative paths.
- **Fix:** Changed imports in background.ts, content.ts, popup/App.tsx from @/storage to ../src/storage
- **Files modified:** apps/extension/entrypoints/*.ts, apps/extension/entrypoints/popup/App.tsx
- **Verification:** Extension builds without path resolution errors
- **Committed in:** bd4125e (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for build to succeed. WXT storage path was incorrect from 24-02. @ alias resolution required understanding WXT's generated tsconfig. No scope creep.

## Issues Encountered

**WXT path alias behavior:** WXT generates `.wxt/tsconfig.json` with `"@": [".."]` pointing to extension root, not src/. This required using relative imports from entrypoints. Within src/, modules can use @ alias for internal imports.

**Resolution:** Established pattern - entrypoints use relative paths (../src/messaging), src/ modules use @ alias (@/types, @/storage).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Messaging infrastructure is ready for auth and UI integration:
- Plan 24-04 will implement auth connection flow using sendToBackground({ type: 'AUTH_LOGIN' })
- Message types ready for project/batch/row selection
- Content script ready for fill execution messages
- Popup can display state and send commands to background
- Background can broadcast state updates to popup
- Type-safe communication prevents message type errors

**Blocker concerns:** None - extension builds and messaging infrastructure is complete.

**Key integration points for next phases:**
- Popup auth UI will use sendToBackground<AuthResponse>({ type: 'AUTH_LOGIN', payload: { code } })
- Background will call API and update storage, triggering STATE_UPDATED broadcast
- Popup listens for STATE_UPDATED to reflect auth state changes
- Content script FILL_EXECUTE handler ready for Phase 28 (form filling)

---
*Phase: 24-extension-foundation*
*Completed: 2026-02-03*
