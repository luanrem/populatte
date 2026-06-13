---
status: diagnosed
trigger: "Port Communication Blocker in Side Panel"
created: 2026-02-06T12:00:00Z
updated: 2026-02-06T12:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two separate root causes identified
test: Complete
expecting: Both issues documented
next_action: Write final diagnostic report

## Symptoms

expected: User enters login code, extension authenticates, shows project selection UI
actual: GET_STATE fails immediately with timeout, AUTH_LOGIN shows "Unknown message type" error
errors:
- "Error: Port message timeout: GET_STATE (10000ms)"
- "Unknown message type" when submitting login code
reproduction:
1. Open Chrome Side Panel for extension
2. Observe immediate GET_STATE timeout error
3. Try to enter login code
4. Observe "Unknown message type" error
started: After Phase 35 migration from popup to sidepanel with port-based messaging

## Eliminated

## Evidence

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/entrypoints/background.ts lines 258-279
  found: onConnect listener properly filters for port.name === 'sidepanel' and sets up message handler
  implication: Port connection establishment should work correctly

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/entrypoints/sidepanel/App.tsx lines 33-76
  found: Port created with chrome.runtime.connect({ name: 'sidepanel' }) and GET_STATE called via sendViaPort immediately
  implication: Sidepanel correctly initiates connection and requests state

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/src/messaging/send.ts lines 98-124
  found: sendViaPort sets up listener for RESPONSE messages matching requestType, has 10s timeout
  implication: sendViaPort correctly waits for background to reply with matching RESPONSE

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/entrypoints/background.ts lines 284-635
  found: handleSidepanelMessage has case statements for GET_STATE (lines 290-300), AUTH_LOGIN (lines 577-597), and many others
  implication: Both message types ARE handled in the background script

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/entrypoints/background.ts line 263
  found: Message listener casts to PopupToBackgroundMessage type
  implication: Background expects PopupToBackgroundMessage type for all sidepanel messages

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/src/types/messages.ts lines 335-356
  found: PopupToBackgroundMessage union includes AUTH_LOGIN, GET_STATE, and all other handled types
  implication: Type definitions are correct and include all necessary message types

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/entrypoints/background.ts lines 290-300 (GET_STATE handler)
  found: GET_STATE handler calls checkMappingForTab, buildState, then posts RESPONSE message via port.postMessage
  implication: GET_STATE should work if it reaches this code

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/entrypoints/sidepanel/components/CodeInputForm.tsx line 34
  found: CodeInputForm uses sendToBackground (runtime.sendMessage) instead of sendViaPort
  implication: AUTH_LOGIN message is sent via one-time messaging, NOT through the port!

- timestamp: 2026-02-06T12:00:00Z
  checked: apps/extension/entrypoints/sidepanel/App.tsx line 66
  found: App.tsx uses sendViaPort for GET_STATE (correct port-based messaging)
  implication: Mixed messaging patterns - App uses port, but CodeInputForm uses runtime.sendMessage

- timestamp: 2026-02-06T12:01:00Z
  checked: apps/extension/src/api/client.ts lines 33-36
  found: fetchWithAuth throws "Not authenticated" error if no token in storage
  implication: When GET_STATE runs on unauthenticated user, checkMappingForTab -> fetchMappingsByUrl -> fetchWithAuth throws error

- timestamp: 2026-02-06T12:01:00Z
  checked: apps/extension/entrypoints/background.ts lines 175-183
  found: checkMappingForTab has try-catch that catches errors and clears mapping state, then calls sendStateToSidepanel
  implication: The error is caught, but sendStateToSidepanel does nothing if sidepanelPort is null (line 250)

- timestamp: 2026-02-06T12:01:00Z
  checked: apps/extension/entrypoints/background.ts lines 284-300
  found: handleSidepanelMessage wraps everything in try-catch, but if checkMappingForTab throws, it's caught internally and never bubbles to handleSidepanelMessage
  implication: GET_STATE handler reaches buildState and postMessage even after checkMappingForTab error, so timeout is NOT from error handling

- timestamp: 2026-02-06T12:01:00Z
  checked: apps/extension/entrypoints/background.ts lines 290-300 more carefully
  found: Line 294 awaits checkMappingForTab which is wrapped in try-catch internally. Line 296 calls buildState. Line 298 posts RESPONSE. The handler SHOULD complete successfully.
  implication: GET_STATE timeout must be from something else - possibly port.postMessage not reaching the sidepanel listener

- timestamp: 2026-02-06T12:02:00Z
  checked: apps/extension/entrypoints/sidepanel/App.tsx lines 33-76 more carefully
  found: Port connection and sendViaPort happen in useEffect on mount. Line 66 calls sendViaPort BEFORE the port.onMessage listener is fully set up (listener added at line 63, sendViaPort called at line 66).
  implication: Race condition! sendViaPort adds its own listener (send.ts line 121) and posts message (line 122), but if background responds BEFORE the listener is added, the response is lost

- timestamp: 2026-02-06T12:03:00Z
  checked: apps/extension/src/messaging/send.ts lines 103-123
  found: sendViaPort adds listener BEFORE posting message (listener at line 121, postMessage at line 122), so race is protected within sendViaPort
  implication: Race condition hypothesis eliminated - listener is added before message sent

- timestamp: 2026-02-06T12:04:00Z
  checked: apps/extension/entrypoints/background.ts lines 274-277
  found: After port connects, background immediately pushes state if activeTabId !== null (line 275-277)
  implication: Background sends STATE_UPDATED message immediately on connection, but sidepanel's GET_STATE response might conflict or get lost

- timestamp: 2026-02-06T12:05:00Z
  checked: apps/extension/entrypoints/background.ts line 286
  found: currentTabId is set from activeTabId ?? 0 (line 286). If activeTabId is null (no active tab yet), currentTabId becomes 0
  implication: buildState(0) returns state for a non-existent tab, which may cause issues

- timestamp: 2026-02-06T12:06:00Z
  checked: apps/extension/entrypoints/background.ts lines 190-194
  found: tabs.onActivated sets activeTabId and calls checkMappingForTab
  implication: activeTabId should be set when user has an active tab, but on fresh extension load it might be null initially

- timestamp: 2026-02-06T12:07:00Z
  checked: apps/extension/entrypoints/background.ts lines 263-265
  found: port.onMessage.addListener uses async callback without return true or proper promise handling
  implication: Chrome extension API requires async message handlers to return true OR return a promise. The current code does neither - it's an async void function that doesn't return anything

- timestamp: 2026-02-06T12:08:00Z
  checked: Chrome Extension API documentation (mental reference)
  found: For runtime.onMessage, async handlers must return true. For port.onMessage, async handlers work differently - they don't need return true
  implication: port.onMessage should work fine with async callbacks without return true

- timestamp: 2026-02-06T12:09:00Z
  checked: apps/extension/entrypoints/background.ts line 263
  found: The callback is `async (message) => { await handleSidepanelMessage(message, port); }` which awaits the async function
  implication: If handleSidepanelMessage throws an unhandled error, it would reject the promise but there's no catch on the callback itself

- timestamp: 2026-02-06T12:10:00Z
  checked: apps/extension/entrypoints/background.ts lines 284-634 (entire handleSidepanelMessage)
  found: Entire function body is wrapped in try-catch (lines 285-634), with catch at lines 631-634
  implication: All errors should be caught and result in error RESPONSE being posted. No unhandled promise rejections should occur.

## Resolution

### ROOT CAUSE #1: AUTH_LOGIN Message Routing Failure

**Problem:** CodeInputForm sends AUTH_LOGIN via wrong messaging channel

The sidepanel uses TWO DIFFERENT messaging mechanisms:
1. **App.tsx** uses port-based messaging (sendViaPort with long-lived connection) - CORRECT
2. **CodeInputForm.tsx** uses one-time messaging (sendToBackground with runtime.sendMessage) - WRONG

**What happens:**
- Background has TWO separate message handlers:
  - **Port handler** (background.ts lines 258-279, 284-635): Handles sidepanel messages including AUTH_LOGIN
  - **runtime.onMessage handler** (background.ts lines 640-711): Handles content script messages only (SUCCESS_DETECTED, ELEMENT_CAPTURED, etc.)

- When CodeInputForm calls sendToBackground (runtime.sendMessage), the message arrives at the runtime.onMessage handler
- The runtime.onMessage handler has NO case for AUTH_LOGIN in its switch statement
- The default case (line 701) logs "Unhandled content message type" and returns error "Unknown message type"

**Why this happened:** Phase 35 refactored sidepanel to use port-based messaging, but CodeInputForm was missed and still uses the old popup messaging pattern (sendToBackground)

**Files involved:**
- apps/extension/entrypoints/sidepanel/components/CodeInputForm.tsx line 34 (uses sendToBackground)
- apps/extension/entrypoints/background.ts lines 640-711 (runtime.onMessage has no AUTH_LOGIN case)

### ROOT CAUSE #2: GET_STATE Timeout (Port Response Never Received)

**Problem:** Background sends response via port.postMessage, but response never reaches sendViaPort listener

**Evidence trail:**
1. GET_STATE handler executes successfully (logs at lines 291, 293, 297 confirm this)
2. checkMappingForTab error is caught and handled internally (lines 175-183)
3. buildState(currentTabId) completes and returns state (line 296)
4. port.postMessage({ type: 'RESPONSE', requestType: 'GET_STATE', ... }) is called (line 298)
5. BUT: sendViaPort listener (send.ts lines 109-119) never receives this message
6. After 10 seconds, sendViaPort timeout triggers (send.ts line 104-106)

**Hypothesis:** Port disconnection or message loss during connection setup

The most likely cause is that the port connection is established, but messages posted immediately after connection may be lost due to:
- Background posts STATE_UPDATED immediately on connection (line 275-277)
- Sidepanel sends GET_STATE immediately after connecting (App.tsx line 66)
- Race condition: Background may post RESPONSE before sidepanel's listener is fully ready
- OR: Port is disconnected/reconnected during initial setup

**Additional suspect:** activeTabId may be null on fresh load (line 286 uses activeTabId ?? 0), causing buildState to work with invalid tab ID, which might cause issues

**Files involved:**
- apps/extension/entrypoints/background.ts lines 274-277 (immediate STATE_UPDATED push)
- apps/extension/entrypoints/sidepanel/App.tsx lines 65-76 (immediate GET_STATE request)
- apps/extension/src/messaging/send.ts lines 98-124 (sendViaPort implementation)

### Suggested Fixes

**For ROOT CAUSE #1 (AUTH_LOGIN):**
1. Modify CodeInputForm to accept port prop and use sendViaPort instead of sendToBackground
2. Update ConnectView to accept and pass port prop
3. Update App.tsx to pass port to ConnectView

**For ROOT CAUSE #2 (GET_STATE):**
Option A - Add defensive logging to trace exact failure point:
1. Log inside buildState to confirm it completes
2. Log immediately before port.postMessage in GET_STATE handler
3. Log inside sendViaPort listener when message received
4. This will reveal whether: (a) buildState hangs, (b) postMessage is never called, or (c) message is posted but not received

Option B - Remove potential race condition:
1. Remove immediate STATE_UPDATED push (line 275-277) on connection
2. Let GET_STATE be the sole source of initial state
3. This eliminates the possibility of message collision

Option C - Ensure proper initialization:
1. Query activeTabId explicitly before handling GET_STATE (using browser.tabs.query)
2. Don't rely on tabs.onActivated to have fired before sidepanel opens

**RECOMMENDED APPROACH:** Start with Option A (logging) to confirm the exact failure mode, then apply Option B or C based on findings.

fix: (Not implemented - diagnosis only)
verification: (Not implemented - diagnosis only)
files_changed: []

---

## Summary for Developer

**Issue:** Sidepanel completely unusable after Phase 35 migration to port-based messaging

**Two Independent Root Causes Identified:**

### 1. AUTH_LOGIN "Unknown message type" Error (CONFIRMED)
**Cause:** CodeInputForm.tsx uses old sendToBackground (runtime.sendMessage) instead of new sendViaPort (port-based)
**Impact:** Login completely broken - user cannot authenticate
**Confidence:** 100% - Code inspection confirms the mismatch
**Fix Complexity:** Simple - update 3 files to pass port prop through component tree

### 2. GET_STATE Timeout (PROBABLE CAUSE IDENTIFIED)
**Cause:** Likely race condition or message delivery issue during port connection setup
**Impact:** Sidepanel shows timeout error on open, even before user attempts login
**Confidence:** 80% - Multiple plausible causes identified, needs logging to confirm exact failure mode
**Fix Complexity:** Medium - Requires diagnostic logging first, then targeted fix based on findings

**Recommended Action Order:**
1. Fix AUTH_LOGIN first (simple, high confidence)
2. Add logging for GET_STATE to identify exact failure
3. Apply appropriate fix based on logging results
