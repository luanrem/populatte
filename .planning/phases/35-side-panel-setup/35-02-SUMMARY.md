---
phase: 35-side-panel-setup
plan: 02
subsystem: extension-architecture
tags: [sidepanel, port-communication, per-tab-state, lifecycle]
requires: [35-01]
provides:
  - Port-based sidepanel communication with background script
  - Per-tab state isolation (mapping detection, fill status, row data)
  - Tab lifecycle management (cleanup on close, state push on switch)
  - Long-lived connection with disconnect detection
affects: [35-03, 35-04]
tech-stack:
  added: []
  patterns:
    - Chrome port API (chrome.runtime.connect, port.postMessage)
    - Per-tab state Map with getTabState helper
    - Request/response pattern via PortResponseMessage
    - Tab event listeners (onActivated, onUpdated, onRemoved)
key-files:
  created: []
  modified:
    - apps/extension/entrypoints/background.ts
    - apps/extension/entrypoints/sidepanel/App.tsx
    - apps/extension/src/messaging/send.ts
    - apps/extension/src/messaging/index.ts
    - apps/extension/src/types/messages.ts
decisions:
  - id: SP-03-port-lifecycle
    choice: "Port-based communication for sidepanel instead of broadcast"
    rationale: "Enables disconnect detection, per-tab state push, and eliminates broadcast to closed panels"
  - id: SP-04-per-tab-independence
    choice: "Map<tabId, TabState> for URL-dependent state, global storage for selection"
    rationale: "Each tab has independent mapping matches and fill status. Selection (project/batch/row) remains global as it represents user's working context."
  - id: SP-06-auth-persistence
    choice: "Background keeps API connection alive after panel close"
    rationale: "Reopening panel is instant — no re-auth needed. Auth state is not tab-specific."
metrics:
  duration: 6m 44s
  completed: 2026-02-06
  commits: 2
---

# Phase 35 Plan 02: Port Communication & Per-Tab State Summary

**One-liner:** Port-based messaging with per-tab state Map enables independent sidepanel state across browser tabs with clean lifecycle management.

## What Was Built

### Background Script Refactor
- **Replaced module-level singletons** with `Map<number, TabState>`
- **Per-tab state tracking:** Each tab stores its own mapping matches, fill status, identifier fields, and row data
- **Port connection handler:** `browser.runtime.onConnect` listens for sidepanel port, sends state on connection
- **Port disconnect detection:** Logs panel close but keeps auth/selection state (per locked decision)
- **Tab lifecycle cleanup:** `tabs.onRemoved` deletes tab state from Map
- **Active tab tracking:** `tabs.onActivated` pushes tab-specific state to sidepanel instantly
- **Message separation:** Sidepanel uses port (`handleSidepanelMessage`), content script uses `onMessage`

### Sidepanel Refactor
- **Port-based connection:** `chrome.runtime.connect({ name: 'sidepanel' })` creates long-lived port
- **sendViaPort utility:** Request/response pattern via `PortResponseMessage` type
- **State push listener:** Receives `STATE_UPDATED` and `FILL_PROGRESS` messages via `port.onMessage`
- **All handlers updated:** Project select, batch select, fill, row navigation use `sendViaPort(port, ...)`
- **Port disconnect on unmount:** Cleanup via `p.disconnect()` in useEffect return

### Messaging Infrastructure
- **sendViaPort function:** Awaits RESPONSE message matching request type, includes timeout logic
- **PortResponseMessage type:** `{ type: 'RESPONSE', requestType, success, data?, error? }`
- **Backward compatibility:** `sendToBackground`, `sendToContent`, `broadcast` remain for other contexts

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 56cec45 | Per-tab state Map and port-based sidepanel communication |
| 2 | 2041185 | Sidepanel port-based messaging |

## Deviations from Plan

None — plan executed exactly as written.

## Technical Decisions

**1. Selection state remains global (not per-tab)**
- **Context:** Research recommended keeping selection global, only URL-dependent state per-tab
- **Decision:** Project/batch/row selection stored in `chrome.storage.local` (shared across tabs)
- **Rationale:** Selection represents user's current working context. Mapping detection/fill status depend on tab's URL, so those are per-tab.
- **Impact:** User can switch tabs and see different mappings, but selection persists

**2. Background keeps auth alive after panel close**
- **Context:** Port disconnect indicates panel closed
- **Decision:** No auth cleanup in `onDisconnect` handler
- **Rationale:** Auth is not tab-specific. Reopening panel should be instant without re-authentication.
- **Impact:** User can close/reopen panel repeatedly without losing session

**3. Content scripts still use onMessage (not port)**
- **Context:** Content scripts send messages to background (ELEMENT_CAPTURED, SUCCESS_DETECTED)
- **Decision:** Keep `browser.runtime.onMessage` listener for content script messages
- **Rationale:** Content scripts don't need persistent connections. onMessage works fine for event-driven messages.
- **Impact:** Only sidepanel uses port. Content script architecture unchanged.

## Testing & Validation

### Build Verification
```bash
npm run build --workspace=apps/extension
# ✔ Built extension in 1.103 s
```

### Pattern Verification
- `tabStates` references: 6 (Map operations throughout background.ts)
- `onConnect` listeners: 1 (sidepanel port handler)
- `onRemoved` listeners: 1 (tab cleanup)
- `sidepanelPort?.postMessage`: 8 (state updates, fill progress, element captured)
- `chrome.runtime.connect`: 1 (in App.tsx)
- `sendViaPort` calls: 17 (all handlers in App.tsx)
- `p.disconnect()`: 1 (cleanup on unmount)

## Next Phase Readiness

**Blockers:** None

**Dependencies satisfied:**
- 35-01 (sidepanel entrypoint) ✅

**Provides for downstream:**
- 35-03: Per-tab state enables URL-specific mapping detection
- 35-04: Port lifecycle enables panel persistence across navigations

**Known issues:** None

## Lessons Learned

1. **Port API is cleaner than broadcast for 1:1 communication:** No need to filter messages, no risk of sending to closed panels
2. **Per-tab state requires careful tracking of activeTabId:** Must update on tab switch to push correct state
3. **Map.get() can return undefined:** `getTabState()` helper prevents repetitive null checks
4. **Request/response pattern via port requires listener management:** Must remove listener after response to prevent memory leaks

## Self-Check: PASSED

All created files verified to exist. All commit hashes confirmed in git log.
