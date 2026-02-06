---
phase: 35
plan: 03
subsystem: extension-sidepanel-messaging
tags: [extension, port-communication, race-condition-fix, authentication-flow]
requires: [35-02]
provides:
  - Race-free sidepanel initialization
  - Port-based AUTH_LOGIN routing
  - Robust GET_STATE handler with tab initialization
affects: []
tech-stack:
  added: []
  patterns:
    - "Port-based messaging for all sidepanel operations"
    - "Request-driven state loading (no push-on-connect)"
key-files:
  created: []
  modified:
    - apps/extension/entrypoints/sidepanel/components/CodeInputForm.tsx
    - apps/extension/entrypoints/sidepanel/components/ConnectView.tsx
    - apps/extension/entrypoints/sidepanel/App.tsx
    - apps/extension/entrypoints/background.ts
key-decisions:
  - decision: "Remove immediate STATE_UPDATED push on sidepanel connect"
    rationale: "Caused race condition with GET_STATE handler, sidepanel always requests state explicitly"
    alternatives: ["Coordinate push/request timing", "Add debouncing"]
    outcome: "Clean request-response pattern, no race conditions"
  - decision: "Initialize activeTabId in GET_STATE handler if null"
    rationale: "Fresh extension load may not have activeTabId set before sidepanel connects"
    alternatives: ["Require tab activation before sidepanel open", "Return error if no tab"]
    outcome: "Sidepanel works immediately on extension load"
metrics:
  duration: 116s
  completed: 2026-02-06
---

# Phase 35 Plan 03: Port Communication Bug Fixes Summary

Port-based AUTH_LOGIN routing and race-free GET_STATE initialization.

## Performance

**Execution time:** 1m 56s
**Build time:** ~1.3s per build (3 builds total)
**Commits:** 2 atomic task commits

## Accomplishments

Fixed two critical blocker bugs in sidepanel port communication that made the extension completely unusable after Phase 35 migration:

1. **AUTH_LOGIN routing fixed** - CodeInputForm now uses port-based messaging (sendViaPort) instead of runtime.sendMessage, routing to the correct handler in background.ts

2. **GET_STATE race eliminated** - Removed immediate STATE_UPDATED push on connect that interfered with GET_STATE handler, sidepanel now gets state exclusively via GET_STATE request

3. **Tab initialization resilience** - GET_STATE handler queries active tab if activeTabId is null (fresh extension load scenario)

Result: Sidepanel opens without timeout errors, login codes work, full extension UI appears after authentication.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix AUTH_LOGIN routing - switch from sendToBackground to sendViaPort | c990240 | CodeInputForm.tsx, ConnectView.tsx, App.tsx |
| 2 | Fix GET_STATE timeout - eliminate race condition | f97d153 | background.ts |

## Files Created

None.

## Files Modified

**CodeInputForm.tsx**
- Added `port: chrome.runtime.Port` prop to interface
- Replaced `sendToBackground` import with `sendViaPort`
- Changed AUTH_LOGIN call from `sendToBackground` to `sendViaPort(port, ...)`

**ConnectView.tsx**
- Added `port: chrome.runtime.Port` prop to interface
- Passed `port` prop to CodeInputForm component

**App.tsx**
- Passed `port!` to ConnectView (non-null assertion safe because ConnectView only renders when state is truthy, after port-based GET_STATE succeeds)

**background.ts**
- Removed immediate `sendStateToSidepanel(activeTabId)` call on port connect (lines 274-277)
- Added comment explaining why immediate push was removed (race condition)
- Modified GET_STATE handler to initialize `activeTabId` via `tabs.query` if null
- Used `resolvedTabId` in GET_STATE handler instead of relying on global `activeTabId`

## Decisions Made

### 1. Port-based messaging for AUTH_LOGIN

**Context:** CodeInputForm was using runtime.sendMessage (sendToBackground) for AUTH_LOGIN, which routed to content-script handler that had no AUTH_LOGIN case.

**Decision:** Thread port through component tree (App -> ConnectView -> CodeInputForm) and use sendViaPort for AUTH_LOGIN.

**Alternatives considered:**
- Add AUTH_LOGIN case to content-script handler (wrong layer, violates architecture)
- Use hybrid approach (some messages via port, some via runtime.sendMessage) (inconsistent, confusing)

**Outcome:** Clean port-based messaging for all sidepanel operations, consistent with Phase 35 architecture.

### 2. Remove push-on-connect, use request-driven state

**Context:** Background pushed STATE_UPDATED immediately when sidepanel connected (lines 274-277), causing race with GET_STATE handler that sidepanel sends right after connecting.

**Decision:** Remove immediate push, sidepanel gets state exclusively via GET_STATE request.

**Alternatives considered:**
- Coordinate timing (add delay, debouncing) - fragile, doesn't eliminate root cause
- Filter STATE_UPDATED in sendViaPort listener - still leaves async work running concurrently

**Outcome:** Clean request-response pattern. Background only pushes STATE_UPDATED when state changes (after user actions), not on connect.

### 3. Initialize activeTabId in GET_STATE if null

**Context:** On fresh extension load, activeTabId may be null if tabs.onActivated hasn't fired before sidepanel connects.

**Decision:** Query active tab at start of GET_STATE handler if activeTabId is null.

**Alternatives considered:**
- Return error if no tab - poor UX, sidepanel would show error on first open
- Require manual tab activation - unnecessary user friction

**Outcome:** Sidepanel works immediately on extension load, no extra user action required.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - root causes were accurately diagnosed in debug session, fixes worked as expected on first implementation.

## Next Phase Readiness

**Phase 36 (Tabs Structure)** is ready to proceed.

**Delivered:**
- ✅ Sidepanel opens without GET_STATE timeout error
- ✅ User can enter login code and authenticate successfully
- ✅ After authentication, project/batch selectors and fill controls appear
- ✅ Extension is fully usable for end-to-end flow

**Known issues:** None blocking Phase 36.

**Technical debt:** None introduced.

## Self-Check: PASSED

All claimed files exist:
- ✅ apps/extension/entrypoints/sidepanel/components/CodeInputForm.tsx
- ✅ apps/extension/entrypoints/sidepanel/components/ConnectView.tsx
- ✅ apps/extension/entrypoints/sidepanel/App.tsx
- ✅ apps/extension/entrypoints/background.ts

All claimed commits exist:
- ✅ c990240 (fix(35-03): switch AUTH_LOGIN from sendToBackground to sendViaPort)
- ✅ f97d153 (fix(35-03): eliminate GET_STATE race condition)
