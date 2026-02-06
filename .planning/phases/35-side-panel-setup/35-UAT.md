---
status: diagnosed
phase: 35-side-panel-setup
source: [35-01-SUMMARY.md, 35-02-SUMMARY.md, 35-03-SUMMARY.md, 35-04-SUMMARY.md]
started: 2026-02-06T14:00:00Z
updated: 2026-02-06T14:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Icon Click Opens Side Panel
expected: Clicking the Populatte extension icon opens the Side Panel on the right side of the browser (not a popup). No timeout errors or "Unknown message type" errors appear. The UI loads cleanly.
result: pass

### 2. Side Panel Stays Open During Page Interaction
expected: With the Side Panel open, clicking on elements in the web page (links, buttons, form fields) does NOT close the Side Panel. It remains visible on the right side.
result: issue
reported: "after a while the extension shows: Error: Port message timeout: GET_STATE (10000ms). Service worker log: Attempting to use a disconnected port object at handleSidepanelMessage (background.ts:306)"
severity: blocker

### 3. Login Code Works in Side Panel
expected: On the connect/login view, entering a valid login code and submitting it successfully authenticates. The UI transitions from the connect view to the main view showing project/batch selectors.
result: pass

### 4. Project Selector Loads Projects
expected: After authentication, the project dropdown loads and displays available projects. Selecting a project works without errors or "Unknown message type" messages.
result: issue
reported: "Depois de um tempo nessa página, apareceu um erro no topo dela, em cima do Connected. Error: Port message timeout: GET_STATE (10000ms). Same disconnected port root cause."
severity: blocker

### 5. Batch Selector Loads Batches
expected: After selecting a project, the batch dropdown loads and displays available batches for that project. Selecting a batch works without errors.
result: pass

### 6. Side Panel Persists Across Page Navigation
expected: With the Side Panel open showing your selected project/batch, navigate to a different page (click a link or enter a new URL in the same tab). The Side Panel remains open and retains context.
result: pass

### 7. Per-Tab Independent State
expected: Open the Side Panel in Tab A with a specific project/batch. Open a new Tab B and open the Side Panel there. Each tab's Side Panel operates independently — switching between tabs shows the correct context for each tab.
result: skipped
reason: Per-tab state UI is Phase 36 scope (Tabs Structure), not testable in Phase 35

### 8. Side Panel Close and Reopen
expected: Close the Side Panel (click X or toggle via icon). Reopen it by clicking the extension icon. The panel reopens without needing to re-authenticate — your session is preserved.
result: pass

## Summary

total: 8
passed: 5
issues: 2
pending: 0
skipped: 1

## Gaps

- truth: "Side Panel stays open and functional without periodic GET_STATE timeout errors"
  status: failed
  reason: "User reported: after a while the extension shows Error: Port message timeout: GET_STATE (10000ms). Service worker shows: Attempting to use a disconnected port object at handleSidepanelMessage (background.ts:306). Background tries to send via stale port reference after service worker wakes or port disconnects. Affects Tests 2 and 4 (same root cause)."
  severity: blocker
  test: 2
  root_cause: "MV3 service worker termination breaks port connection. Three deficiencies: (1) App.tsx creates port once on mount (line 35) with no onDisconnect listener or reconnection logic. (2) send.ts sendViaPort (line 122) does not catch synchronous throw from port.postMessage() on disconnected port — waits 10s timeout instead. (3) background.ts sendStateToSidepanel (line 252) and catch block (line 641) call postMessage without try-catch on potentially disconnected port. No keepalive/heartbeat mechanism exists."
  artifacts:
    - path: "apps/extension/entrypoints/sidepanel/App.tsx"
      issue: "Port created once on mount (line 35), no onDisconnect listener, no reconnection"
    - path: "apps/extension/src/messaging/send.ts"
      issue: "sendViaPort (line 122) does not catch synchronous throw from port.postMessage()"
    - path: "apps/extension/entrypoints/background.ts"
      issue: "sendStateToSidepanel (line 252) and catch block (line 641) call postMessage without try-catch"
    - path: "apps/extension/wxt.config.ts"
      issue: "No alarms permission for keepalive"
  missing:
    - "App.tsx: Add port.onDisconnect listener that auto-reconnects and re-sends GET_STATE"
    - "send.ts: Wrap port.postMessage in try-catch, reject immediately on disconnected port"
    - "background.ts: Wrap all sidepanelPort.postMessage calls in try-catch, null out on disconnect"
    - "Add alarms-based keepalive/heartbeat to reduce SW termination frequency"
  debug_session: ".planning/debug/sidepanel-port-disconnect-idle.md"
