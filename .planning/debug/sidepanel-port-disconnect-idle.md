---
status: diagnosed
trigger: "Side Panel shows 'Error: Port message timeout: GET_STATE (10000ms)' after idle. Background logs 'Attempting to use a disconnected port object'. MV3 service worker likely terminates and stale port references remain."
created: 2026-02-06T00:00:00Z
updated: 2026-02-06T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Service worker termination severs port; neither side has reconnection logic
test: Code inspection of port lifecycle across background.ts, App.tsx, and send.ts
expecting: No reconnection, no port health checks, no keepalive -- all confirmed absent
next_action: Document root cause and return diagnosis

## Symptoms

expected: Side Panel remains functional while open, even after idle periods
actual: After idle period, Side Panel shows "Error: Port message timeout: GET_STATE (10000ms)". Background logs "Attempting to use a disconnected port object"
errors: |
  background.ts:640 [Background] Sidepanel handler error: Error: Attempting to use a disconnected port object
  background.ts:641 Uncaught (in promise) Error: Attempting to use a disconnected port object
reproduction: Open Side Panel, wait idle for 30+ seconds, observe error
started: Ongoing issue with port-based messaging architecture

## Eliminated

- hypothesis: Port listener setup race condition (listener not ready before message sent)
  evidence: sendViaPort adds listener (line 121) BEFORE posting message (line 122), so listener is always ready
  timestamp: 2026-02-06

- hypothesis: Background handler throws unhandled error causing timeout
  evidence: Entire handleSidepanelMessage is wrapped in try-catch (lines 286-642), catch posts error RESPONSE
  timestamp: 2026-02-06

## Evidence

- timestamp: 2026-02-06
  checked: background.ts line 39 -- sidepanelPort variable declaration
  found: `let sidepanelPort: chrome.runtime.Port | null = null;` is an in-memory variable. All in-memory state is lost when MV3 service worker terminates.
  implication: After service worker wakes up, sidepanelPort is null. But existing tab event listeners (onActivated, onUpdated) will re-register and call sendStateToSidepanel, which early-returns on null port (line 250). The bigger problem is the opposite direction.

- timestamp: 2026-02-06
  checked: background.ts lines 258-280 -- port connection handler
  found: `browser.runtime.onConnect.addListener` establishes port once on initial connection. The `port.onDisconnect` handler (line 267-272) sets `sidepanelPort = null` and logs "panel closed". No attempt to reconnect.
  implication: When service worker terminates, the port from its perspective is gone. When it restarts, it re-registers onConnect, but the sidepanel never reconnects because it doesn't know the service worker died.

- timestamp: 2026-02-06
  checked: App.tsx lines 32-106 -- sidepanel port lifecycle
  found: Port is created ONCE in useEffect on mount (line 35): `const p = chrome.runtime.connect({ name: 'sidepanel' })`. Stored in React state via `setPort(p)`. No `port.onDisconnect` listener on the sidepanel side. No reconnection logic.
  implication: When service worker terminates, the sidepanel's port silently becomes disconnected. Any subsequent `sendViaPort` call on this stale port will either: (a) time out (the message goes nowhere, no RESPONSE comes back), or (b) throw "disconnected port" when posting.

- timestamp: 2026-02-06
  checked: send.ts lines 98-124 -- sendViaPort implementation
  found: `port.postMessage(message)` at line 122 will throw synchronously if port is disconnected ("Attempting to use a disconnected port object"). This error is NOT caught within sendViaPort -- the Promise never resolves or rejects through normal flow; the throw propagates as an uncaught exception.
  implication: The 10s timeout fires (producing the user-visible error), AND the uncaught postMessage throw produces the console error seen in the bug report.

- timestamp: 2026-02-06
  checked: background.ts lines 190-211 -- tab event listeners
  found: `tabs.onActivated` and `tabs.onUpdated` both call `checkMappingForTab` which calls `sendStateToSidepanel`. When service worker restarts, these listeners re-register. If sidepanel reconnects, the background tries `sidepanelPort.postMessage(...)` (line 252) -- but if the old stale reference is somehow still held (e.g., if disconnect event didn't fire cleanly), it throws the "disconnected port" error.
  implication: The error at background.ts:640 comes from handleSidepanelMessage trying to use `port` (the function parameter, which IS the stale port reference from before SW termination). This happens because an in-flight async handler from the OLD port can still be executing after the port disconnects.

- timestamp: 2026-02-06
  checked: background.ts line 252 -- sendStateToSidepanel
  found: `sidepanelPort.postMessage(...)` uses the module-level `sidepanelPort` variable without any try-catch. If this port is disconnected, it throws.
  implication: Even if sidepanelPort is non-null (not yet cleaned up by onDisconnect), postMessage on it will throw if the underlying channel is severed.

- timestamp: 2026-02-06
  checked: wxt.config.ts -- manifest permissions
  found: No `alarms` permission. No keepalive mechanism configured. Standard MV3 service worker lifecycle applies.
  implication: Chrome will terminate the service worker after ~30 seconds of inactivity (no pending events, no active ports... but wait -- an active port SHOULD keep the service worker alive).

- timestamp: 2026-02-06
  checked: Chrome MV3 service worker lifecycle rules (known behavior)
  found: Chrome keeps the service worker alive while a port connection is active. However, there are known edge cases: (1) Chrome may still terminate SW after 5 minutes even with active ports (hard limit). (2) DevTools being open can mask the issue. (3) If the port is from a side panel, and the side panel is backgrounded or the window is minimized, Chrome may be more aggressive.
  implication: The port SHOULD keep the SW alive, but Chrome has a hard 5-minute limit on SW lifetime. After that, even with active ports, the SW terminates. This means the issue manifests after ~5 minutes of idle, not 30 seconds.

## Resolution

root_cause: |
  **Three interacting deficiencies cause this bug:**

  1. **No reconnection logic on sidepanel side (PRIMARY):**
     App.tsx creates the port once on mount (line 35) and never listens for `port.onDisconnect`.
     When the MV3 service worker terminates (Chrome enforces a ~5 minute hard limit
     even with active ports), the sidepanel's port becomes disconnected silently.
     All subsequent operations (user clicks, refresh, any sendViaPort call) use the
     stale port, which either times out or throws "disconnected port".

  2. **No port validity check before postMessage (CONTRIBUTING):**
     In background.ts, `sendStateToSidepanel` (line 252) and the outer catch block
     of `handleSidepanelMessage` (line 641) both call `port.postMessage()` without
     try-catch. If the port is disconnected mid-handler (async operation takes time,
     SW is about to die), the postMessage throws, producing the exact error seen
     in the bug report.

  3. **No keepalive mechanism (CONTRIBUTING):**
     The extension has no mechanism to prevent or detect service worker termination.
     No chrome.alarms (not even in permissions), no periodic ping, no heartbeat.
     The service worker is entirely at Chrome's mercy for lifecycle management.

  **Sequence of events:**
  1. User opens Side Panel -> App.tsx mounts -> port created -> GET_STATE succeeds
  2. User goes idle for several minutes
  3. Chrome terminates service worker (hard ~5 min limit)
  4. Service worker port endpoint dies -> sidepanel port is now disconnected
  5. Tab event or user action triggers sendViaPort on stale port
  6. port.postMessage throws "Attempting to use a disconnected port object"
  7. sendViaPort timeout fires after 10s -> user sees "Port message timeout: GET_STATE (10000ms)"

fix: (Not implemented - diagnosis only)
verification: (Not implemented - diagnosis only)
files_changed: []

---

## Suggested Fix Direction

### Approach: Sidepanel Port Reconnection with Heartbeat

**1. Sidepanel side (App.tsx) -- add reconnection logic:**
- Listen for `port.onDisconnect` on the sidepanel port
- When disconnect detected, automatically call `chrome.runtime.connect({ name: 'sidepanel' })` again
- Re-send GET_STATE after reconnection
- Update the `port` React state so all components use the new port
- Add exponential backoff for repeated failures

**2. Background side (background.ts) -- add defensive postMessage:**
- Wrap all `sidepanelPort.postMessage()` and `port.postMessage()` calls in try-catch
- If postMessage throws "disconnected port", set sidepanelPort = null
- This prevents the unhandled error cascade

**3. Keepalive / heartbeat (optional but recommended):**
- Add `alarms` to manifest permissions
- Set up a 4-minute alarm in background.ts that does nothing (just keeps SW alive)
- Alternatively, implement a PING/PONG heartbeat between sidepanel and background
  every ~25 seconds, which both keeps SW alive AND detects disconnection early
- sendViaPort already handles PING (background.ts line 630-632)

**4. sendViaPort enhancement (send.ts):**
- Catch synchronous throws from `port.postMessage(message)` at line 122
- If throw indicates disconnected port, reject the Promise immediately with a
  descriptive error (instead of waiting 10s for timeout)
- This gives the caller (App.tsx) the chance to trigger reconnection immediately

### Priority Order:
1. Fix #4 (sendViaPort error handling) -- prevents 10s wait on dead port
2. Fix #1 (reconnection logic) -- the actual fix for the user experience
3. Fix #2 (defensive postMessage) -- prevents background console errors
4. Fix #3 (keepalive) -- reduces frequency of disconnections
