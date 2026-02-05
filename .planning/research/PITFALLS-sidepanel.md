# Side Panel Integration Pitfalls

**Domain:** Adding Chrome Side Panel to existing extension (popup + background + content script)
**Researched:** 2026-02-05
**Confidence:** HIGH for API constraints (official Chrome docs), MEDIUM for workaround patterns (community-verified)
**Context:** Populatte extension uses WXT framework, React, MV3. Currently has popup + background + content script. Adding Side Panel to solve popup-closes-on-click during capture mode.

---

## Critical Pitfalls

Issues that cause fundamental breakage, require architecture rethinking, or produce user-visible failures.

---

### CP-01: Action Click Conflict -- default_popup vs openPanelOnActionClick

**What goes wrong:**
When the manifest defines `action.default_popup`, the `chrome.action.onClicked` event NEVER fires. This means `setPanelBehavior({ openPanelOnActionClick: true })` has no effect because the popup always intercepts the icon click. The Side Panel never opens via the toolbar icon, and developers waste hours debugging why the API call "does nothing."

**Why it happens:**
Chrome's action click handling is exclusive: if `default_popup` is set, clicking the icon opens the popup and suppresses `action.onClicked`. The `openPanelOnActionClick` behavior depends on `action.onClicked` internally. These two mechanisms cannot coexist on the same click event.

**Populatte-specific risk:**
Populatte currently has `action.default_title` set (no `default_popup` in manifest -- WXT generates it from the popup entrypoint). The built manifest at `.output/chrome-mv3/manifest.json` shows `"default_popup": "popup.html"`. This means the popup will intercept all icon clicks.

**Prevention:**
Choose ONE primary action-click behavior and implement the other via explicit navigation:

Option A (Recommended for Populatte): Keep popup as primary click target. Add a "Open in Side Panel" button inside the popup that calls `chrome.sidePanel.open({ windowId })`. The popup closes after triggering the side panel.

Option B: Remove default_popup, use `openPanelOnActionClick: true`, and provide popup-like functionality within the side panel itself.

Option C: Dynamically switch between popup and side panel using `chrome.action.setPopup({ popup: "" })` to clear the popup when side panel mode is desired, and restore it when not. This is fragile and not recommended.

**Warning signs:**
- Side panel never opens from toolbar icon despite `setPanelBehavior` call
- `action.onClicked` listener never fires
- Users report "clicking the icon only shows the popup"

**Recovery cost:** LOW -- This is a design decision, not a code rewrite. But making the wrong choice early cascades into UX confusion.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Must decide popup/sidepanel interaction model before any UI work.

**Sources:**
- [chrome.action API](https://developer.chrome.com/docs/extensions/reference/api/action) -- "The action.onClicked event won't be sent if the extension action has specified a popup to show on click"
- [chrome.sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

---

### CP-02: Global Side Panel Leaks When Manifest Declares default_path

**What goes wrong:**
If the manifest includes `"side_panel": { "default_path": "sidepanel.html" }` AND you try to open per-tab panels with `sidePanel.open({ tabId })`, the panel appears on ALL tabs instead of just the target tab. Tab-specific behavior is silently overridden by the global default.

**Why it happens:**
The manifest-level `default_path` creates a global side panel fallback. When Chrome sees both a global declaration and a per-tab `open()`, the global wins. This was confirmed as a bug/design limitation and the workaround is to NOT declare `default_path` in the manifest if per-tab behavior is desired.

**Populatte-specific risk:**
If we want the Side Panel to show different content per tab (e.g., different mapping context per website), the manifest-level declaration will break this. For Populatte's form-filling use case where mappings are URL-specific, per-tab differentiation matters.

**Prevention:**
1. Do NOT include `"side_panel": { "default_path": ... }` in the manifest if you need per-tab panels
2. Instead, use `chrome.sidePanel.setOptions({ path: "sidepanel.html", enabled: true })` in the background script to set the panel dynamically
3. In WXT: Configure through the background script initialization rather than the sidepanel entrypoint's HTML meta tags

If global behavior is acceptable (same Side Panel on all tabs, internal state management via messaging), then the manifest declaration is fine and simpler.

**Warning signs:**
- Side panel appears on tabs where it should not
- Closing side panel on one tab closes it everywhere
- Users see stale content from other tabs

**Recovery cost:** MEDIUM -- Requires refactoring how the panel is opened and potentially restructuring the manifest.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Architectural decision about global vs per-tab.

**Sources:**
- [GitHub: Opening SidePanel with tabId Results in Global SidePanel #987](https://github.com/GoogleChrome/chrome-extensions-samples/issues/987) -- Confirmed: removing manifest default_path fixes per-tab behavior

---

### CP-03: Side Panel Has No Close Event (Pre-Chrome 142)

**What goes wrong:**
Before Chrome 142, there is no `sidePanel.onClosed` event. The background script cannot know when the user closes the side panel (clicking X, switching to another extension's panel, etc.). This means capture mode can remain "active" in the content script even after the user closes the side panel, leading to ghost highlights, orphaned event listeners, and confusing UX.

**Why it happens:**
The Side Panel API was shipped incrementally. `open()` came in Chrome 116, `close()` in Chrome 141, `onClosed` in Chrome 142. Many users run older Chrome versions.

**Populatte-specific risk:**
Capture mode currently relies on the popup closing to trigger cleanup (via session storage checks on re-open). With a persistent Side Panel, capture mode state could persist indefinitely after the panel closes, leaving the content script in capture mode with no UI to control it.

**Prevention:**
Use the `runtime.connect` port pattern to detect panel lifecycle:

```typescript
// In sidepanel.tsx (on mount)
const port = chrome.runtime.connect({ name: 'sidepanel' });

// In background.ts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    // Side panel is open
    port.onDisconnect.addListener(() => {
      // Side panel closed -- cleanup capture mode, etc.
      handleSidePanelClosed();
    });
  }
});
```

For Chrome 142+, prefer the native `sidePanel.onClosed` event. Implement both paths with feature detection.

**Warning signs:**
- Content script stays in capture mode after side panel closes
- Highlight badges persist on page with no way to dismiss
- "phantom" captured elements appear when reopening panel

**Recovery cost:** MEDIUM -- Requires adding port-based lifecycle tracking and cleanup logic.

**Phase to address:** Phase 1 (Side Panel Foundation) -- The port connection should be established from the very first Side Panel implementation.

**Sources:**
- [Chrome Side Panel: Simulate close event](https://dev.to/latz/chrome-side-panel-simulate-close-event-354h)
- [sidePanel lifecycle events - w3c/webextensions #517](https://github.com/w3c/webextensions/issues/517)
- [chrome.sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) -- onClosed added Chrome 142

---

### CP-04: Broadcast Messages Reach BOTH Popup AND Side Panel

**What goes wrong:**
`chrome.runtime.sendMessage()` (used by `broadcast()` in background.ts) delivers messages to ALL extension contexts that have a `runtime.onMessage` listener: popup, side panel, options page, and any other extension pages. If both popup and side panel are open simultaneously and both listen for `STATE_UPDATED`, both will process the message and potentially trigger conflicting state updates, duplicate API calls, or visual glitches.

**Why it happens:**
`runtime.sendMessage` is a broadcast mechanism to the extension's own contexts. Unlike `tabs.sendMessage` which targets a specific tab, there is no built-in way to target a specific extension page. Both popup and side panel are extension pages running in the same origin.

**Populatte-specific risk:**
HIGH. The current `broadcast()` function in `src/messaging/send.ts` uses `browser.runtime.sendMessage()` which will reach both contexts. The popup's `App.tsx` listens on `browser.runtime.onMessage` for `STATE_UPDATED` and `FILL_PROGRESS`. If the Side Panel also listens (which it must), both will react to every broadcast.

Specific failure modes:
- Both popup and side panel send `GET_STATE` on mount, causing duplicate API calls
- Both react to `ELEMENT_CAPTURED`, potentially showing duplicate step entries
- Both react to `FILL_PROGRESS`, but only one is visible, wasting CPU

**Prevention:**
1. **Add sender identification to messages**: Include a `target` field in broadcast messages (`target: 'sidepanel' | 'popup' | 'all'`) and have each context check before processing
2. **Use named ports instead of sendMessage for targeted communication**: Establish separate named ports (`sidepanel-port`, `popup-port`) and send messages through the correct port
3. **Context-aware listener**: Each context should include its identity when registering and check `message.target` before processing

Recommended pattern:
```typescript
// In broadcast()
export async function broadcast(
  message: { type: string; payload: unknown },
  target: 'sidepanel' | 'popup' | 'all' = 'all'
): Promise<void> {
  try {
    await browser.runtime.sendMessage({ ...message, target });
  } catch { /* context not open */ }
}

// In listener (side panel or popup)
const MY_CONTEXT = 'sidepanel'; // or 'popup'
browser.runtime.onMessage.addListener((message) => {
  if (message.target && message.target !== MY_CONTEXT && message.target !== 'all') {
    return false; // Not for us
  }
  // Process message...
});
```

**Warning signs:**
- Duplicate step entries in capture mode when both popup and side panel are open
- Console shows double handling of messages
- Race conditions where popup and side panel both try to update the same storage key

**Recovery cost:** LOW if caught early (add target field to message protocol). MEDIUM if discovered after building parallel UIs that assume exclusive message receipt.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Update message bus protocol before building Side Panel UI.

**Sources:**
- [Message passing - Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- Populatte codebase: `apps/extension/src/messaging/send.ts` line 97-107

---

## Moderate Pitfalls

Issues that cause degraded UX, technical debt, or require non-trivial workarounds.

---

### MP-01: Side Panel Width Cannot Be Controlled Programmatically

**What goes wrong:**
There is no API to set, control, or persist the Side Panel width. The minimum width is enforced by Chrome (approximately 320px) and users can manually resize, but:
- The width resets to default when the panel is closed and reopened
- The width resets in incognito mode
- Extensions cannot detect the current width
- Extensions cannot enforce a "collapsed" or "narrow" mode via API

**Populatte-specific risk:**
The planned "collapsed mode" (showing only step numbers/icons in a narrow strip) CANNOT be achieved by programmatically resizing the Side Panel. A "collapsed mode" must be implemented purely within the existing panel width using CSS responsive design (showing/hiding content based on internal state, not actual panel width).

**Prevention:**
1. Design the Side Panel UI to work well at the Chrome-enforced minimum width (~320px)
2. Implement "collapsed mode" as an internal UI state (e.g., hiding labels, showing only icons) rather than actual width reduction
3. Use CSS `container queries` or a manual toggle to switch between expanded and compact layouts within the same panel width
4. Do NOT rely on `window.innerWidth` for responsive behavior -- the user may resize at any time

**Warning signs:**
- Designs that assume specific pixel widths
- Plans for "narrow mode" that require panel resizing
- Users complaining that the panel is too wide for their screen

**Recovery cost:** LOW -- This is a design constraint to accept upfront, not a bug to fix.

**Phase to address:** Phase 2 (Side Panel UI) -- Design must account for this from the start.

**Sources:**
- [Programmatically control width of sidePanel](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/UcHL2GmjHiI)
- [Setting sidePanel default width #1011](https://github.com/GoogleChrome/chrome-extensions-samples/issues/1011)
- [side panel minimum width](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/xuk4ZuWTsBk)

---

### MP-02: Side Panel Persists Across Tab Switches -- Stale State

**What goes wrong:**
Unlike popups (which close and remount), the Side Panel stays alive when the user switches tabs. React component state from Tab A is still rendered when viewing Tab B. If the panel shows mapping information for Tab A's URL, switching to Tab B shows incorrect/stale data until the panel explicitly detects the tab change and refreshes.

**Why it happens:**
The Side Panel is a persistent document. React components are NOT unmounted/remounted on tab switch. This is the opposite behavior of a popup, which destroys all state on close.

**Populatte-specific risk:**
CRITICAL. The current popup design assumes fresh state on every open (`loadState()` in `useEffect([], ...)` runs once on mount). In the Side Panel, this mount happens ONCE and then never again. The mapping context, batch selection, row indicator, and fill status will all show stale data from whichever tab the panel was first opened on.

**Prevention:**
1. **Listen for tab activation events inside the Side Panel**:
```typescript
// In side panel React component
useEffect(() => {
  const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
    refreshStateForTab(activeInfo.tabId);
  };
  chrome.tabs.onActivated.addListener(handleTabActivated);
  return () => chrome.tabs.onActivated.removeListener(handleTabActivated);
}, []);
```

2. **Listen for tab URL changes**:
```typescript
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    refreshStateForCurrentTab();
  }
});
```

3. **Use `chrome.storage.onChanged` for reactive state**: Since background already updates storage, the Side Panel can listen for storage changes rather than relying on broadcast messages alone.

4. **Centralize state refresh**: Create a `useTabAwareState()` hook that combines initial load + tab switch + storage change detection.

**Warning signs:**
- Mapping name shows wrong mapping after switching tabs
- Row indicator shows data from a different batch
- Fill controls appear enabled on a tab with no matching mapping
- "It works the first time but shows wrong data on other tabs"

**Recovery cost:** MEDIUM -- Requires adding tab-awareness hooks throughout the Side Panel UI. If built from scratch with this in mind, it is straightforward. If retrofitted onto a popup-style architecture, requires significant refactoring.

**Phase to address:** Phase 1 (Side Panel Foundation) -- The state management hook must be tab-aware from day one.

**Sources:**
- [chrome.sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) -- Panel persists across tab navigation
- [Edge extension side panel populating same data to all tabs](https://learn.microsoft.com/en-us/answers/questions/1642972/edge-extension-side-panel-populating-same-data-to)

---

### MP-03: chrome.storage.onChanged Not Received When Side Panel Is Hidden

**What goes wrong:**
When the Side Panel is not visible (user switched to another extension's side panel, or the panel is in background), `chrome.storage.onChanged` events may not be delivered to the panel's JavaScript context. React state that depends on storage change listeners becomes stale.

**Why it happens:**
Chrome may suspend or deprioritize the Side Panel's JavaScript context when it is not visible, similar to how background tabs have reduced timer resolution. The `onChanged` listener exists but the event delivery is unreliable when the context is hidden.

**Populatte-specific risk:**
If capture mode writes `capturedSteps` to `chrome.storage.session` (current pattern from popup), the Side Panel might miss the `onChanged` event when it becomes visible again, showing an outdated step list.

**Prevention:**
1. **Register storage listener outside React lifecycle**: Add the listener at the top of the side panel's entry script, not inside a React component's `useEffect`
2. **Re-sync on visibility change**: Listen for `document.visibilitychange` and force a state refresh when the panel becomes visible:
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    syncAllStateFromStorage();
  }
});
```
3. **Prefer message-based updates over storage-based**: Use the port connection (from CP-03) for real-time updates, and storage as the fallback/persistence layer
4. **Always read from storage on re-render** rather than caching in React state indefinitely

**Warning signs:**
- Step list doesn't update after capturing elements while panel was in background
- State appears "frozen" until user interacts with the panel
- Works in development (panel always visible) but breaks in production

**Recovery cost:** LOW -- Adding a visibility change handler is straightforward.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Include visibility re-sync in the base state management hook.

**Sources:**
- [Issue with Side Panel Not Receiving chrome.storage.sync.onChanged Event When Not Visible](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/PoNIOuFdY28)

---

### MP-04: setOptions Race Condition -- First Open on New Tab Shows Stale Content

**What goes wrong:**
When calling `sidePanel.setOptions({ tabId, path: 'sidepanel.html?tabId=X' })` followed by `sidePanel.open({ tabId })`, the first open on a new tab may load the previous tab's path/parameters. Subsequent opens work correctly.

**Why it happens:**
There appears to be a timing issue between `setOptions` completing and `open` reading the configuration. The options update may not be fully propagated when `open` executes, especially on the first invocation for a new tab.

**Populatte-specific risk:**
If we use URL parameters to pass tab-specific context (e.g., `sidepanel.html?tabId=123`), the first open on a new tab might load with the wrong tab ID, showing the wrong mapping context.

**Prevention:**
1. **Avoid relying on URL parameters for critical state**: Instead, have the Side Panel query the background for current tab context on mount
2. **If using URL parameters, add a mount-time verification**: Read `chrome.tabs.query({ active: true, currentWindow: true })` inside the panel and compare with URL parameters. If mismatched, refresh.
3. **Use global panel with internal tab tracking** instead of per-tab panels with URL parameters -- simpler and avoids this race entirely.

**Warning signs:**
- Side panel shows wrong tab ID or mapping on first open
- "Works on second try" behavior
- Intermittent wrong-context display

**Recovery cost:** LOW -- Add a verification step on panel mount.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Design the tab-context mechanism to avoid this race.

**Sources:**
- [Side Panel Opens with Stale Configuration Despite Updated setOptions Calls](https://learn.microsoft.com/en-us/answers/questions/2148171/side-panel-opens-with-stale-configuration-despite)

---

### MP-05: Side Panel Keeps Service Worker Alive Indirectly -- Changed Behavior Assumptions

**What goes wrong:**
An open Side Panel communicates with the service worker via `runtime.sendMessage` and port connections. These API calls reset the service worker's 30-second idle timer. Developers may start relying on the Side Panel keeping the service worker alive, then encounter failures when the Side Panel is closed (service worker terminates unexpectedly).

Conversely, the Side Panel itself does NOT directly prevent service worker termination. Only active API calls and port connections do. A silent Side Panel with no ongoing communication will NOT keep the service worker alive.

**Populatte-specific risk:**
The current architecture stores some ephemeral state in service worker memory (module-level variables in background.ts: `currentMappingMatches`, `currentFillStatus`, `currentRowData`, etc.). With the popup, this was somewhat acceptable because the popup is open briefly and the service worker stays alive during that window. With a persistent Side Panel, the assumption changes: the user may leave the Side Panel open for hours, but the service worker could still terminate during idle periods between user actions.

**Prevention:**
1. **Maintain the port connection** (from CP-03) as a keepalive mechanism -- port connections keep the service worker alive
2. **Send periodic heartbeat messages** through the port every 25 seconds to prevent idle termination:
```typescript
// In sidepanel.tsx
const port = chrome.runtime.connect({ name: 'sidepanel' });
setInterval(() => port.postMessage({ type: 'heartbeat' }), 25000);
```
3. **Continue treating service worker memory as ephemeral**: Do not introduce new module-level state that relies on the service worker being "always alive" because the Side Panel is open
4. **Test with service worker deliberately terminated**: Use Chrome DevTools > Application > Service Workers > "Stop" to verify the Side Panel recovers gracefully

**Warning signs:**
- Side panel works perfectly in development but fails after idle in production
- "Could not establish connection" errors after extended idle
- Features work right after opening panel but break 5+ minutes later

**Recovery cost:** LOW -- Adding port heartbeat is simple. The real cost is if new code assumes service worker permanence.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Establish the keepalive port pattern immediately.

**Sources:**
- [Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Longer extension service worker lifetimes](https://developer.chrome.com/blog/longer-esw-lifetimes)

---

### MP-06: window.close() in Side Panel Closes ALL Panel Instances

**What goes wrong:**
Calling `window.close()` from inside the Side Panel closes every instance of the panel across all tabs/windows, not just the current one. This is different from popup behavior where `window.close()` only closes the popup that called it.

**Why it happens:**
If using a global panel (same HTML path for all tabs), all panels share the same execution context. `window.close()` closes the hosting document, which affects all instances sharing that document.

**Prevention:**
1. **Never use `window.close()` directly in the Side Panel**: Use `chrome.sidePanel.close({ windowId })` (Chrome 141+) for targeted closing
2. **For tab-specific closing**, use `chrome.sidePanel.close({ tabId })` instead
3. **For programmatic "hide"**: Use `sidePanel.setOptions({ enabled: false })` to disable the panel rather than closing it

**Warning signs:**
- User closes side panel on one tab, it disappears from all tabs
- "Close panel" button has unexpected side effects

**Recovery cost:** LOW -- Replace `window.close()` with the proper API call.

**Phase to address:** Phase 2 (Side Panel UI) -- When implementing any close/minimize functionality.

**Sources:**
- [How to close the Chrome SidePanel?](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/YAfMKV-GN4I)
- [chrome.sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) -- close() added Chrome 141

---

## Minor Pitfalls

Issues that cause annoyance, minor bugs, or require small adjustments.

---

### mP-01: WXT Side Panel Entrypoint Requires Explicit Vite Input Configuration

**What goes wrong:**
WXT automatically handles the popup entrypoint via `entrypoints/popup/index.html`. For the side panel, WXT recognizes the `entrypoints/sidepanel/index.html` pattern and adds it to the manifest. However, in some WXT versions, the sidepanel HTML may not be included in the build output, similar to CRXJS issues.

**Prevention:**
1. Create the entrypoint at `entrypoints/sidepanel/index.html` following WXT conventions
2. Verify the build output includes the sidepanel HTML: check `.output/chrome-mv3/` for `sidepanel.html`
3. If missing, add explicit rollup input in `wxt.config.ts`:
```typescript
vite: () => ({
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'entrypoints/sidepanel/index.html'),
      },
    },
  },
}),
```
4. Ensure `"sidePanel"` is in the permissions array in the manifest config

**Warning signs:**
- Build succeeds but side panel shows blank/404
- `sidepanel.html` missing from `.output/` directory
- Chrome DevTools shows "Could not load sidepanel" error

**Recovery cost:** LOW -- Configuration fix only.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Verify build output immediately after creating the entrypoint.

**Sources:**
- [WXT Entrypoints Documentation](https://wxt.dev/guide/essentials/entrypoints.html)
- [CRXJS sidepanel.html not in dist folder #839](https://github.com/crxjs/chrome-extension-tools/issues/839) -- Same class of issue

---

### mP-02: Shared Component Extraction Creates Import Path Confusion

**What goes wrong:**
When extracting components shared between popup and side panel (e.g., `ProjectSelector`, `BatchSelector`, `ConnectedIndicator`), import paths break or create circular dependencies. Components currently live in `entrypoints/popup/components/` and import from relative paths. Moving them to `src/components/` requires updating all imports.

**Populatte-specific risk:**
The popup has 10+ components in `entrypoints/popup/components/` that will need to be shared. The barrel export at `entrypoints/popup/components/index.ts` re-exports everything. Moving these to a shared location requires:
- Moving files from `entrypoints/popup/components/` to `src/components/`
- Updating all imports in popup's `App.tsx`
- Creating new imports in sidepanel's `App.tsx`
- Ensuring the `@` alias resolves correctly from both entrypoints

**Prevention:**
1. Create `src/components/` as the shared component directory
2. Move components in a single atomic operation (not incrementally)
3. Update the barrel export to maintain backward compatibility
4. Test both popup and side panel builds after the move
5. Use the existing `@` alias (`'@': './src'`) for all shared imports

**Warning signs:**
- TypeScript "module not found" errors after file moves
- Different resolution behavior between popup and side panel
- Build succeeds but runtime "Failed to fetch module" errors

**Recovery cost:** LOW -- Import path fixes are mechanical.

**Phase to address:** Phase 1 (Side Panel Foundation) -- Component extraction should happen before building new Side Panel UI.

---

### mP-03: Side Panel CSS Conflicts With Popup Styles

**What goes wrong:**
If popup and side panel share the same Tailwind configuration but are loaded in different-sized containers, responsive utilities behave differently. Popup has a fixed 350x500px container; Side Panel has a variable-width container (~320-600px). Components designed for popup's fixed dimensions may overflow or underflow in the Side Panel.

**Prevention:**
1. Design shared components with flexible widths (`w-full` instead of `w-[350px]`)
2. Remove hardcoded popup dimensions from shared components
3. Apply container-specific sizing only at the top-level layout component of each entrypoint
4. Test components at Side Panel's minimum width (~320px) and a comfortable width (~400px)

**Warning signs:**
- Horizontal scrollbar appearing in Side Panel
- Components looking cramped or stretched
- Fixed-width elements breaking layout

**Recovery cost:** LOW -- CSS adjustments.

**Phase to address:** Phase 2 (Side Panel UI) -- When adapting popup components for Side Panel layout.

---

### mP-04: Side Panel Open Requires User Gesture (Cannot Auto-Open)

**What goes wrong:**
`chrome.sidePanel.open()` can only be called in response to a user action (click, keyboard shortcut, etc.). Attempting to open the Side Panel programmatically (e.g., when a matching URL is detected) will fail silently or throw an error.

**Populatte-specific risk:**
A desired workflow might be: "When user navigates to a URL with a matching mapping, auto-open the Side Panel." This is NOT possible with the current API.

**Prevention:**
1. Do NOT attempt auto-open based on URL detection
2. Use badge text/color to signal that a mapping exists (already implemented)
3. Let the user explicitly open the Side Panel via icon click or keyboard shortcut
4. Consider using a content-script-injected overlay button (small floating "Open Populatte" button) as a visual cue, which then triggers `sidePanel.open()` via background message in response to the user clicking it

**Warning signs:**
- "sidePanel.open() may only be called in response to a user gesture" error in console
- Feature request to "auto-open panel" that silently fails

**Recovery cost:** LOW -- Design around the constraint.

**Phase to address:** Phase 2 (Side Panel UI) -- UX design must not assume auto-open capability.

---

### mP-05: Side Panel Layout Position (Left/Right) Is User-Controlled

**What goes wrong:**
Since Chrome 140, users can position the side panel on the left or right side. `chrome.sidePanel.getLayout()` returns the current position. If the UI assumes a fixed position (e.g., pointing arrows "to the left" to reference the webpage), the visual cues may be incorrect.

**Prevention:**
1. Avoid directional language or icons that assume panel position
2. If directional hints are necessary, use `getLayout()` to determine position and adjust dynamically
3. Design the Side Panel UI to be position-agnostic

**Warning signs:**
- Users report confusing directional cues
- "Click on the page to the right" instruction when panel is on the right side

**Recovery cost:** LOW -- UI text/icon adjustments.

**Phase to address:** Phase 2 (Side Panel UI) -- Informational, not blocking.

**Sources:**
- [chrome.sidePanel.getLayout()](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) -- Chrome 140+

---

## Performance Considerations

---

### PERF-01: Persistent Side Panel Memory Footprint

**What goes wrong:**
Unlike popups (which unmount and free memory on close), the Side Panel remains in memory for the entire browsing session. React component trees, event listeners, interval timers, and cached data accumulate. Over extended sessions (hours), memory usage grows if not managed.

**Prevention:**
1. **Cleanup effects properly**: All `useEffect` hooks must return cleanup functions
2. **Avoid setInterval without cleanup**: Especially for polling/heartbeat -- always clear on unmount
3. **Lazy-load heavy components**: Tab content (Steps list, Recent fills, Settings) should mount only when their tab is active
4. **Limit cached data**: Don't cache entire row datasets in React state -- fetch on demand
5. **Monitor with Chrome Task Manager**: Periodically check the Side Panel's memory footprint during development

**Warning signs:**
- Chrome Task Manager shows Side Panel memory growing over time
- Sluggish UI after extended use
- "Aw, Snap!" page crash from Side Panel consuming too much memory

**Recovery cost:** MEDIUM if discovered late -- Requires auditing all components for memory leaks.

**Phase to address:** Phase 2 (Side Panel UI) -- Implement lazy loading and proper cleanup from the start.

---

## Phase-Specific Warning Matrix

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| Phase 1: Foundation | CP-01 (action click conflict) | CRITICAL | Design decision: popup opens side panel via button |
| Phase 1: Foundation | CP-02 (global panel leak) | CRITICAL | Choose global vs per-tab strategy upfront |
| Phase 1: Foundation | CP-03 (no close event) | CRITICAL | Implement port-based lifecycle detection |
| Phase 1: Foundation | CP-04 (broadcast to both) | CRITICAL | Add target field to message protocol |
| Phase 1: Foundation | MP-05 (service worker keepalive) | MODERATE | Establish port heartbeat pattern |
| Phase 1: Foundation | mP-01 (WXT build config) | MINOR | Verify build output immediately |
| Phase 1: Foundation | mP-02 (component extraction) | MINOR | Move shared components atomically |
| Phase 2: UI | MP-01 (width control) | MODERATE | Design within constraints, no programmatic resize |
| Phase 2: UI | MP-02 (stale state on tab switch) | MODERATE | Tab-aware state hook from day one |
| Phase 2: UI | MP-03 (storage onChanged hidden) | MODERATE | Visibility change re-sync |
| Phase 2: UI | mP-03 (CSS conflicts) | MINOR | Flexible widths, no hardcoded popup sizes |
| Phase 2: UI | mP-04 (no auto-open) | MINOR | Badge + manual open UX |
| Phase 2: UI | PERF-01 (memory footprint) | MODERATE | Lazy loading, proper cleanup |
| Phase 3: Integration | MP-04 (setOptions race) | MODERATE | Mount-time context verification |
| Phase 3: Integration | MP-06 (window.close scope) | MODERATE | Use sidePanel.close() API |

---

## Summary of Recommended Architecture Decisions

Based on these pitfalls, the following decisions should be made BEFORE implementation:

1. **Popup + Side Panel coexistence model**: Keep popup as the icon-click target. Add an "Open Side Panel" button in popup for capture mode. Side Panel becomes the primary UI for capture and fill workflows.

2. **Global vs Per-Tab Side Panel**: Use a GLOBAL side panel (declare `default_path` in manifest) with internal tab-context tracking via `tabs.onActivated` and `tabs.onUpdated` listeners within the panel. This avoids CP-02 and MP-04 complexities while still supporting tab-specific content.

3. **Lifecycle detection**: Use `runtime.connect` port pattern with heartbeat for:
   - Detecting panel open/close state (CP-03)
   - Keeping service worker alive (MP-05)
   - Real-time communication channel (complementing broadcast)

4. **Message targeting**: Add `target` field to the broadcast protocol to prevent duplicate processing when both popup and side panel are open (CP-04).

5. **State management**: Create a `useTabAwareState()` hook that combines:
   - Initial state load from background
   - Tab activation/URL change listeners (MP-02)
   - Visibility change re-sync (MP-03)
   - Port-based real-time updates

6. **Collapsed mode**: Implement as internal CSS state toggle within fixed panel width, not as programmatic resize (MP-01).

---

## Chrome Version Requirements

| Feature | Minimum Chrome Version | Status |
|---------|----------------------|--------|
| sidePanel API basic | 114 | Stable, safe to use |
| sidePanel.open() | 116 | Stable, safe to use |
| sidePanel.close() | 141 | Recent, check user base |
| sidePanel.onOpened | 141 | Recent, check user base |
| sidePanel.onClosed | 142 | Very recent, provide fallback |
| sidePanel.getLayout() | 140 | Recent, optional feature |

**Recommendation:** Target Chrome 116+ as minimum (covers `open()` API). Use `runtime.connect` port pattern as primary lifecycle detection (works on all versions). Use native `onClosed`/`onOpened` events only as enhancement with feature detection.
