# Phase 35: Side Panel Setup - Research

**Researched:** 2026-02-05
**Domain:** Chrome Extension Side Panel API + WXT Framework
**Confidence:** HIGH

## Summary

This phase replaces the Chrome extension popup with a persistent Side Panel as the sole extension UI. The research covers three domains: (1) WXT framework sidepanel entrypoint setup, (2) Chrome `sidePanel` API capabilities including per-tab behavior, lifecycle detection, and `openPanelOnActionClick`, and (3) the migration strategy from the existing popup architecture to sidepanel.

The standard approach is straightforward: WXT auto-detects a `sidepanel/` directory in `entrypoints/` and generates the correct manifest entries (including the `sidePanel` permission). The background script calls `browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` to enable icon-click toggling. Per-tab state is managed in-memory in the background script using a `Map<number, TabState>`, not via Chrome's `setOptions` per-tab mechanism (which creates separate panel instances). Lifecycle detection uses long-lived ports (`chrome.runtime.connect`) from the sidepanel to the background, with `onDisconnect` firing when the panel closes.

**Primary recommendation:** Create `entrypoints/sidepanel/` (mirroring current popup structure), switch background to port-based communication for the sidepanel, add per-tab state as a `Map<tabId, TabState>` in the background script, and remove the popup entrypoint entirely.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Icon click toggles the Side Panel (standard Chrome toggle behavior)
- No splash/branding screen -- jump straight to content on open
- Chrome controls animation and panel position (always right side)
- Use Chrome's default resizable panel width behavior (user can drag to resize, Chrome remembers)
- Per-tab context -- each tab has its own independent panel state (project/batch/row)
- Switching to a tab with no prior extension usage shows fresh/default state
- Soft resume when returning to a previously active tab -- restore project/batch/row selection but not scroll position or transient UI state
- Show confirmation dialog only if there's an active fill or capture session when closing
- Background script keeps API connection alive after panel close -- reopening is instant, no re-auth
- Immediate cleanup of all state when a browser tab is closed (tab ID gone = state gone)
- Remove popup entirely -- clean break, Side Panel is the only UI
- Reuse existing React components -- move them into the new Side Panel entrypoint, same code in new container
- Manifest and WXT config changes (side_panel permission, entrypoint registration) are part of this phase

### Claude's Discretion
- Initial panel state before connection (connection prompt vs full skeleton with banner)
- Tab switch transition behavior (instant swap vs brief skeleton)
- Page navigation detection (whether to show context-aware messages when URL changes)
- Message protocol choice (keep chrome.runtime.sendMessage or switch to long-lived ports for persistent panel)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.13 (installed) | Extension framework with sidepanel entrypoint | Already used, auto-handles manifest generation |
| Chrome sidePanel API | MV3, Chrome 114+ | Side Panel rendering and lifecycle | Native Chrome API, required for side panel |
| React | 19.2.0 (installed) | UI rendering in sidepanel | Already used in popup, reuse as-is |
| @wxt-dev/module-react | ^1.1.5 (installed) | React integration for WXT | Already configured in wxt.config.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrome.runtime.connect/Port | MV3 native | Long-lived connection for lifecycle detection | Sidepanel-to-background communication |
| chrome.tabs.onActivated | MV3 native | Tab switch detection | Update per-tab state display |
| chrome.tabs.onRemoved | MV3 native | Tab close detection | Clean up per-tab state |
| chrome.sidePanel.onOpened | Chrome 141+ | Detect panel open | Optional enhancement (port connect already covers this) |
| chrome.sidePanel.onClosed | Chrome 142+ | Detect panel close | Optional enhancement (port disconnect already covers this) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Port-based lifecycle (recommended) | sidePanel.onClosed (Chrome 142+) | onClosed is newer/cleaner but Chrome 142+ only (Oct 2025). Port pattern works everywhere Chrome sidePanel is supported (114+). Use ports as primary, onClosed as fallback enhancement |
| In-memory Map for per-tab state | chrome.storage.session with tabId keys | Storage adds unnecessary async overhead for ephemeral per-tab state; Map is synchronous and automatically GC'd |
| chrome.sidePanel.setOptions per-tab | Single global panel + app-level tab routing | setOptions creates separate DOM instances per tab, wastes memory. A single panel instance with app-level state switching is simpler and matches standard patterns |

**No new installations needed.** All required libraries are already in the project.

## Architecture Patterns

### Recommended Entrypoint Structure
```
entrypoints/
  sidepanel/              # NEW - replaces popup/
    index.html            # Same structure as popup/index.html
    main.tsx              # Same as popup/main.tsx
    App.tsx               # Adapted from popup/App.tsx (remove fixed dimensions)
    components/           # Moved from popup/components/
      index.ts
      ConnectView.tsx
      CodeInputForm.tsx
      ConnectedIndicator.tsx
      ProjectSelector.tsx
      BatchSelector.tsx
      MappingSelector.tsx
      RowIndicator.tsx
      ErrorInput.tsx
      FillControls.tsx
      capture/
        CapturePanel.tsx
        StepConfig.tsx
        StepList.tsx
        index.ts
  background.ts           # MODIFIED - add port handling, per-tab state, setPanelBehavior
  content.ts              # UNCHANGED
  popup/                  # DELETED
```

### Pattern 1: WXT Sidepanel Entrypoint Registration
**What:** WXT auto-detects `entrypoints/sidepanel/index.html` and generates `side_panel.default_path` in manifest.json, plus auto-adds the `sidePanel` permission.
**When to use:** Always -- this is how WXT handles sidepanel registration.
**Example:**
```html
<!-- entrypoints/sidepanel/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Populatte</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```
Source: [WXT Entrypoints Documentation](https://wxt.dev/guide/essentials/entrypoints.html)

### Pattern 2: openPanelOnActionClick in Background Script
**What:** Call `browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` in the background script so clicking the extension icon toggles the Side Panel.
**When to use:** During background script initialization.
**Critical note:** You CANNOT have a popup entrypoint when using `openPanelOnActionClick: true`. The popup must be removed first.
**Example:**
```typescript
// In background.ts defineBackground(() => { ... })
browser.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Populatte] Failed to set panel behavior:', error));
```
Source: [Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

### Pattern 3: Port-Based Lifecycle Detection
**What:** The sidepanel opens a long-lived port to the background script on mount. When the panel closes, the port disconnects, triggering `onDisconnect` in the background. This is the standard pattern for detecting sidepanel lifecycle.
**When to use:** Sidepanel init (on React mount) and background script connection handler.
**Example:**
```typescript
// === SIDEPANEL SIDE (in App.tsx or main.tsx) ===
const port = chrome.runtime.connect({ name: 'sidepanel' });

// Send init message with current tab context
port.postMessage({ type: 'PANEL_INIT', tabId: currentTabId });

// Listen for state updates from background
port.onMessage.addListener((msg) => {
  if (msg.type === 'STATE_UPDATED') {
    // Update React state
  }
});

// === BACKGROUND SIDE ===
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    console.log('[Background] Side panel connected');

    port.onMessage.addListener((msg) => {
      if (msg.type === 'PANEL_INIT') {
        // Panel opened, send current state for the active tab
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Background] Side panel disconnected (closed)');
      // Cleanup: check if active fill/capture session needs handling
    });
  }
});
```
Source: [Chrome Side Panel Close Detection](https://medium.com/@latzikatz/chrome-side-panel-simulate-close-event-c76081f53b97), [Dev.to Side Panel Guide](https://dev.to/jgrisafe/interacting-with-web-content-using-chromes-new-side-panel-extension-feature-4ock)

### Pattern 4: Per-Tab State Map in Background
**What:** A `Map<number, TabState>` in the background script stores per-tab context (selected project, batch, row, mapping state, fill status). When the sidepanel requests state, the background looks up state by the active tab ID. When a tab is closed (`tabs.onRemoved`), that entry is deleted.
**When to use:** All tab-aware state management.
**Critical insight:** The Side Panel is a SINGLE HTML document shared across tabs. Chrome does NOT create separate panel instances per tab by default. The extension must manage per-tab context entirely in the background script and push the correct state when the user switches tabs.
**Example:**
```typescript
// Background script
interface TabState {
  projectId: string | null;
  batchId: string | null;
  rowIndex: number;
  rowTotal: number;
  fillStatus: FillStatus;
  mappingId: string | null;
  mappingName: string | null;
  hasMapping: boolean;
  availableMappings: Array<{ id: string; name: string }>;
  identifierFieldKey: string | null;
  secondaryFieldKey: string | null;
  identifierPrimary: string | null;
  identifierSecondary: string | null;
  currentRowData: Record<string, unknown> | null;
  batchIdentifierFieldKey: string | null;
  batchSecondaryFieldKey: string | null;
}

const tabStates = new Map<number, TabState>();

function getTabState(tabId: number): TabState {
  let state = tabStates.get(tabId);
  if (!state) {
    state = createDefaultTabState();
    tabStates.set(tabId, state);
  }
  return state;
}

// Clean up on tab close
browser.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
  console.log('[Background] Tab closed, state cleaned:', tabId);
});

// Push correct state on tab switch
browser.tabs.onActivated.addListener(async (activeInfo) => {
  const state = getTabState(activeInfo.tabId);
  // Push state to sidepanel via port
  if (sidepanelPort) {
    sidepanelPort.postMessage({
      type: 'STATE_UPDATED',
      payload: await buildStateForTab(activeInfo.tabId),
    });
  }
});
```

### Pattern 5: Removing Popup and wxt.config Changes
**What:** Delete `entrypoints/popup/` directory entirely, update `wxt.config.ts` to remove any popup-related `action.default_popup` references (WXT auto-generates this from the popup entrypoint, so deleting the directory is sufficient), and ensure `action` manifest key remains (needed for `openPanelOnActionClick`).
**When to use:** During migration.
**Example:**
```typescript
// wxt.config.ts - UPDATED
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  dev: {
    server: { port: 3003 },
  },
  manifest: {
    name: 'Populatte',
    description: 'Automate web form filling from your data',
    permissions: ['storage', 'activeTab', 'scripting'],
    // WXT auto-adds 'sidePanel' permission when entrypoints/sidepanel/ exists
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Populatte',
      // NO default_popup - removed for openPanelOnActionClick
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': './src',
        '@populatte/types': '../../packages/types/src',
      },
    },
  }),
});
```

### Anti-Patterns to Avoid
- **Creating multiple panel instances via setOptions per tab:** Chrome's `setOptions({ tabId, path })` creates separate DOM instances per tab, which wastes memory and complicates state management. Use a single global panel with app-level state routing instead.
- **Keeping popup alongside sidepanel:** You cannot use `openPanelOnActionClick: true` while a popup entrypoint exists. WXT auto-generates `default_popup` when it detects `entrypoints/popup/`, which conflicts.
- **Using chrome.runtime.sendMessage for sidepanel-to-background:** The popup used `sendMessage` because it was ephemeral. The sidepanel is persistent, so use a long-lived port for bidirectional communication. This also enables lifecycle detection.
- **Storing per-tab state in chrome.storage:** Per-tab state is ephemeral (lives only while the tab exists). Using `chrome.storage.local` or `chrome.storage.session` adds unnecessary async overhead. An in-memory `Map` is simpler and automatically cleaned up.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest side_panel entry | Manual manifest.json edits | WXT auto-detection via `entrypoints/sidepanel/` directory | WXT generates the correct manifest fields for Chrome and Firefox automatically |
| Panel open/close detection | Custom polling or visibility hacks | Port connect/disconnect pattern | Chrome guarantees `onDisconnect` fires when the panel page unloads |
| sidePanel permission | Manual manifest permission | WXT auto-adds when sidepanel entrypoint exists | Documented WXT behavior, no manual config needed |
| Tab close cleanup | Custom timer-based cleanup | `browser.tabs.onRemoved` listener | Native Chrome event, fires reliably when tab is closed |
| Sidepanel HTML/JS bundling | Manual build configuration | WXT entrypoint detection | WXT handles Vite bundling for sidepanel just like popup |

**Key insight:** WXT's convention-over-configuration approach means most of the manifest/build work is handled by placing files in the right directory structure. The main custom work is the background script refactoring for port-based communication and per-tab state.

## Common Pitfalls

### Pitfall 1: Popup Entrypoint Conflicts with openPanelOnActionClick
**What goes wrong:** If `entrypoints/popup/` still exists when you add `entrypoints/sidepanel/`, WXT generates both `default_popup` and `side_panel` in the manifest. Chrome shows the popup on icon click instead of toggling the sidepanel, because `default_popup` takes precedence over `openPanelOnActionClick`.
**Why it happens:** WXT auto-detects all entrypoints. Having both popup and sidepanel directories generates conflicting manifest entries.
**How to avoid:** Delete `entrypoints/popup/` completely before creating `entrypoints/sidepanel/`. Do not try to keep both.
**Warning signs:** Clicking extension icon shows a small popup window instead of the side panel.

### Pitfall 2: Single Panel Instance Shared Across Tabs
**What goes wrong:** Developer assumes each tab gets its own panel instance with independent state. In reality, Chrome renders ONE panel document for the entire window. Switching tabs shows the same panel HTML/state.
**Why it happens:** Chrome's default side panel behavior is "global per window". The same document persists as you switch tabs.
**How to avoid:** The background script must maintain per-tab state and push the correct state to the sidepanel when `tabs.onActivated` fires. The sidepanel React app must accept state updates reactively.
**Warning signs:** User switches tabs but sees the same project/batch/row from the previous tab.

### Pitfall 3: Module-Level State Not Tab-Scoped
**What goes wrong:** The current background.ts stores state in module-level variables (`currentMappingId`, `currentFillStatus`, etc.) which are global singletons. With per-tab requirements, this state becomes incorrect when users have multiple tabs.
**Why it happens:** The popup-era design assumed one active tab context. Side Panel requires per-tab awareness.
**How to avoid:** Refactor all module-level state variables into the `TabState` Map. Every state access must be keyed by `tabId`.
**Warning signs:** Filling a form on Tab A, switching to Tab B, shows fill status from Tab A.

### Pitfall 4: Storage Selection State is Global
**What goes wrong:** The current `storage.selection` uses `chrome.storage.local` with a single key (`local:populatte:selection`). This stores one global selection (projectId, batchId, rowIndex). With per-tab state, this single selection becomes a bottleneck.
**Why it happens:** Popup-era design: one popup = one selection.
**How to avoid:** Move selection state into the per-tab `Map` for the active working state. Keep `chrome.storage.local` only for persistence/resume (save last-used per-tab state when a tab becomes inactive, restore it when re-activated). Alternatively, use a `Map<tabId, SelectionState>` stored in the session storage for cross-restart persistence.
**Warning signs:** Selecting a project on Tab A changes the project shown on Tab B.

### Pitfall 5: broadcast() via sendMessage Fails for Sidepanel
**What goes wrong:** The current `broadcast()` function uses `browser.runtime.sendMessage()` to push state updates. This works for popups (which listen via `onMessage`) but is unreliable for long-lived sidepanels. The sidepanel might miss messages if it opens after the message was sent, or during service worker restarts.
**Why it happens:** `runtime.sendMessage` is fire-and-forget with no guaranteed delivery.
**How to avoid:** With the port-based pattern, the background directly calls `port.postMessage()` to the connected sidepanel port. This is reliable because the port is a persistent bidirectional channel.
**Warning signs:** Side panel shows stale state until manually refreshed.

### Pitfall 6: beforeunload Confirmation Unreliable in Side Panel
**What goes wrong:** Attempting to use `window.onbeforeunload` to show a confirmation dialog when the panel closes. Chrome does NOT reliably fire `beforeunload` for side panel close.
**Why it happens:** Chrome's side panel close is controlled by the browser chrome, not by the web page lifecycle.
**How to avoid:** Instead of preventing close, detect close via port disconnect in the background, then handle any cleanup (e.g., stop active fill, notify content script). The confirmation dialog should be in-panel only (a React modal triggered by a close button if the extension adds one), not via browser beforeunload. For the locked decision "show confirmation only if active fill/capture," this means: the background detects disconnect, checks if fill/capture is active, and handles accordingly (e.g., stops the operation, or marks it as interrupted).
**Warning signs:** Panel closes without confirmation even during active fill.

## Code Examples

Verified patterns from official sources and codebase analysis:

### WXT Sidepanel index.html
```html
<!-- entrypoints/sidepanel/index.html -->
<!-- Source: WXT documentation pattern, identical structure to popup/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Populatte</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

### Sidepanel main.tsx (React mount)
```typescript
// entrypoints/sidepanel/main.tsx
// Source: mirrors existing popup/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../styles/globals.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
```

### Background: setPanelBehavior + Port Handling
```typescript
// In background.ts, inside defineBackground(() => { ... })
// Source: Chrome sidePanel API docs

// Enable icon-click toggle
browser.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[Populatte] setPanelBehavior failed:', err));

// Track sidepanel port
let sidepanelPort: chrome.runtime.Port | null = null;

browser.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidepanelPort = port;
    console.log('[Background] Side panel connected');

    port.onMessage.addListener(async (msg) => {
      // Handle messages from sidepanel via port
      // (replaces runtime.onMessage for sidepanel communication)
    });

    port.onDisconnect.addListener(() => {
      sidepanelPort = null;
      console.log('[Background] Side panel disconnected');
      // Cleanup: handle active fill/capture if needed
    });

    // Send initial state for active tab
    // ...
  }
});
```

### Per-Tab State Initialization from Persisted Storage
```typescript
// When a previously-used tab becomes active, restore its last state
// Source: Architecture decision for "soft resume"

browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  let tabState = tabStates.get(tabId);

  if (!tabState) {
    // First activation: try to load persisted selection from storage
    // (this enables "soft resume" across panel close/reopen)
    tabState = createDefaultTabState();
    tabStates.set(tabId, tabState);
  }

  // Re-check mapping for the tab's URL
  await checkMappingForTab(tabId);

  // Push state to sidepanel
  if (sidepanelPort) {
    const state = await buildStateForTab(tabId);
    sidepanelPort.postMessage({ type: 'STATE_UPDATED', payload: state });
  }
});
```

### Sidepanel App.tsx: Port Connection on Mount
```typescript
// entrypoints/sidepanel/App.tsx
// Source: Pattern from Chrome extension samples and dev.to guide

import { useEffect, useState, useRef } from 'react';

export default function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    // Open long-lived port to background
    const port = chrome.runtime.connect({ name: 'sidepanel' });
    portRef.current = port;

    // Request initial state
    port.postMessage({ type: 'GET_STATE' });

    // Listen for state updates pushed by background
    port.onMessage.addListener((msg) => {
      if (msg.type === 'STATE_UPDATED') {
        setState(msg.payload as ExtensionState);
      }
      if (msg.type === 'FILL_PROGRESS') {
        // Handle fill progress updates
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Sidepanel] Port disconnected');
      portRef.current = null;
    });

    return () => {
      port.disconnect();
    };
  }, []);

  // Send messages via port instead of sendToBackground
  function sendMessage(msg: PopupToBackgroundMessage) {
    portRef.current?.postMessage(msg);
  }

  // ... rest of component using sendMessage instead of sendToBackground
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `runtime.sendMessage` for popup communication | `runtime.connect` (Port) for persistent panel | Required for Side Panel pattern | Bidirectional, lifecycle-aware communication |
| Single global selection state | Per-tab `Map<tabId, TabState>` in background | Required for per-tab context | Each tab has independent state |
| Polling `runtime.getContexts()` for panel state | `sidePanel.onOpened`/`onClosed` events | Chrome 141-142 (Oct 2025) | Native lifecycle events, but port pattern still needed for wider compatibility |
| No panel close detection | Port `onDisconnect` fires on panel close | Available since MV3 | Reliable cleanup trigger |
| Module-level variables in background | Tab-keyed state Map | Required for this migration | All state lookups must include tabId |

**Deprecated/outdated:**
- `sidePanel.onOpened` (Chrome 141+) and `sidePanel.onClosed` (Chrome 142+): These are now available but the port-based pattern is still recommended because (a) it works on all Chrome versions supporting Side Panel (114+), and (b) the port itself is needed for communication anyway. These events can be used as supplementary signals.

## Claude's Discretion Recommendations

### 1. Initial Panel State Before Connection
**Recommendation: Full skeleton with connection banner.**
Show the full UI skeleton (header, placeholder areas for selectors) with a subtle banner/toast "Connecting..." that auto-dismisses when the port handshake completes. This avoids a jarring transition from a connection prompt to the full UI, and matches the "no splash" decision. The port handshake is near-instant (< 50ms), so the banner will barely be visible in practice.

### 2. Tab Switch Transition Behavior
**Recommendation: Instant swap with no skeleton.**
When the user switches tabs, the background pushes the new tab's state via the port. The React app should update state directly (setState), which causes an instant re-render. No skeleton/loading state is needed because the state is already in-memory in the background's `Map`. If state is null (fresh tab), show the default/empty state immediately.

### 3. Page Navigation Detection
**Recommendation: Yes, detect URL changes and re-check mappings.**
The background already listens to `tabs.onUpdated` with `changeInfo.url` to re-check mappings. This should continue working. When a URL changes in the active tab, the background re-evaluates mapping state for that tab and pushes updated state to the sidepanel. No additional "context-aware messages" UI is needed in this phase -- the mapping badge and available mappings list already communicate URL context.

### 4. Message Protocol Choice
**Recommendation: Switch to long-lived ports for sidepanel-to-background communication.**
Reasons:
- Ports provide lifecycle detection (core requirement SP-06)
- Ports enable bidirectional push without polling
- The current `broadcast()` function using `runtime.sendMessage` is fire-and-forget; ports are reliable
- Content script communication should remain as `runtime.sendMessage` / `tabs.sendMessage` (content scripts are ephemeral per page load, ports would disconnect on navigation)

**Hybrid approach:** Sidepanel uses Port for background communication. Background still uses `tabs.sendMessage` for content script communication (unchanged from current code).

## Open Questions

Things that could not be fully resolved:

1. **Confirmation dialog on panel close with active fill**
   - What we know: Chrome does not support `beforeunload` in side panels. Port disconnect is the only reliable signal.
   - What's unclear: The locked decision says "show confirmation dialog only if active fill/capture." But the panel is already closed by the time the background detects the disconnect.
   - Recommendation: Interpret this as: if a fill/capture was active when the panel closed, the background should gracefully stop the operation (not leave it in a broken state). On next panel open, if an interrupted operation is detected, show a toast/banner saying "Previous fill was interrupted." This achieves the spirit of the decision without fighting Chrome's panel lifecycle.

2. **WXT auto-add of sidePanel permission specifics**
   - What we know: WXT docs state the permission is auto-added when a sidepanel entrypoint exists.
   - What's unclear: Whether WXT also auto-generates `side_panel.default_path` in the manifest or just the permission.
   - Recommendation: Verify during implementation by building and inspecting the generated manifest. If WXT does not generate `side_panel.default_path`, add it manually in `wxt.config.ts` manifest section. LOW risk -- the WXT sidepanel template project confirms this works.

3. **Soft resume persistence scope**
   - What we know: User wants "soft resume" (restore project/batch/row when returning to a tab).
   - What's unclear: Whether tab state should survive browser restart or only live in memory.
   - Recommendation: For this phase, keep state in-memory only (Map). Tab state dies with the browser session. The existing `chrome.storage.local` selection/preferences can serve as a "last used" hint for the FIRST tab opened, but per-tab state is ephemeral. If persistence across browser restarts is needed, it can be added later.

## Sources

### Primary (HIGH confidence)
- [WXT Entrypoints Documentation](https://wxt.dev/guide/essentials/entrypoints.html) - Sidepanel entrypoint naming, auto-detection, manifest generation
- [WXT SidepanelEntrypointOptions](https://wxt.dev/api/reference/wxt/interfaces/sidepanelentrypointoptions) - Configuration interface for sidepanel
- [WXT Manifest Configuration](https://wxt.dev/guide/essentials/config/manifest) - Auto-generated permissions, custom manifest fields
- [Chrome sidePanel API Reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) - setPanelBehavior, setOptions, open/close, onOpened/onClosed events
- [Chrome runtime.Port MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/Port) - Port lifecycle, onDisconnect behavior
- Codebase analysis: `apps/extension/` - All current popup, background, storage, messaging, and type files

### Secondary (MEDIUM confidence)
- [WXT Sidepanel Extension Template (GitHub)](https://github.com/evanlong-me/sidepanel-extension-template) - Complete WXT + React + Tailwind sidepanel template project
- [Chrome Side Panel Close Detection (Medium)](https://medium.com/@latzikatz/chrome-side-panel-simulate-close-event-c76081f53b97) - Port-based close detection pattern
- [Chrome Side Panel Content Interaction (Dev.to)](https://dev.to/jgrisafe/interacting-with-web-content-using-chromes-new-side-panel-extension-feature-4ock) - Port communication and tab state management
- [w3c/webextensions Issue #515](https://github.com/w3c/webextensions/issues/515) - Per-tab panel instance discussion, workarounds

### Tertiary (LOW confidence)
- [Chrome 142 Release Notes](https://developer.chrome.com/release-notes/142) - Confirmed Chrome 142 stable release Oct 2025, but could not find explicit sidePanel API entries in release notes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - WXT 0.20.13 is already installed, Chrome sidePanel API is well-documented, React 19 in use
- Architecture (entrypoint setup): HIGH - WXT docs + template project confirm the pattern
- Architecture (per-tab state): HIGH - Chrome docs explicitly state single panel instance per window; Map-based state is standard
- Architecture (port lifecycle): HIGH - Multiple sources confirm port disconnect fires on panel close
- Pitfalls: HIGH - Identified from codebase analysis of current module-level state and storage patterns
- Confirmation dialog limitation: MEDIUM - Chrome docs silent on beforeunload for sidepanel, inferred from community reports

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (stable domain, Chrome sidePanel API mature since Chrome 114)
