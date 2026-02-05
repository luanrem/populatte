# Architecture Research: Chrome Side Panel Integration

**Domain:** Chrome Extension Side Panel (Manifest V3) for Populatte
**Researched:** 2026-02-05
**Confidence:** HIGH (verified against Chrome official docs and WXT framework docs)

## Executive Summary

This document defines the architecture for integrating Chrome's Side Panel API into the existing Populatte extension. The Side Panel provides a persistent UI surface that remains open during page navigations and tab switches -- solving the popup's fundamental limitation of closing on any outside click.

The core architectural challenge is **dual-surface coexistence**: both popup and Side Panel must work simultaneously, sharing React components and communicating with the same background service worker, while each surface has distinct lifecycle behavior and width constraints.

**Key findings:**
- Popup and Side Panel CAN coexist in the same extension. Both can be registered in manifest.json. They CANNOT both be open at the same time when `openPanelOnActionClick` is true, but with Populatte's approach (popup as default, Side Panel opened via button), they work independently.
- Side Panel communicates with background using the SAME `chrome.runtime.sendMessage()` API as popup. The existing messaging infrastructure requires zero changes.
- Side Panel persists across page navigations within a tab, making it ideal for the fill-cycle workflow.
- Default width is ~320px (user-resizable by dragging, but no programmatic width control). Design for 320px minimum.
- WXT supports Side Panel as a first-class entrypoint via `entrypoints/sidepanel/` directory.

## System Architecture with Side Panel

```
                                    BROWSER CONTEXT
    ================================================================================

    +-----------------------------------------------------------------------------+
    |                              CHROME EXTENSION                                |
    |                                                                              |
    |  +---------------+  +---------------+  +---------------+  +-------------+   |
    |  |    POPUP      |  |  SIDE PANEL   |  | SERVICE WORKER|  | CONTENT     |   |
    |  |  (React UI)   |  |  (React UI)   |  |  (Background) |  | SCRIPT      |   |
    |  |               |  |               |  |               |  |             |   |
    |  | 350x500 fixed |  | ~320px wide   |  | - API Client  |  | - DOM access|   |
    |  | Closes on     |  | Persistent    |  | - Auth/Token  |  | - Selectors |   |
    |  | outside click |  | across navs   |  | - State mgmt  |  | - Executor  |   |
    |  |               |  |               |  | - Orchestrate |  | - Capture   |   |
    |  +------+--------+  +------+--------+  +------+--------+  +------+------+   |
    |         |                  |                   |                  |          |
    |         |  chrome.runtime  |  chrome.runtime   |                  |          |
    |         |  .sendMessage()  |  .sendMessage()   |  chrome.tabs     |          |
    |         +----------------->|------------------>|  .sendMessage()  |          |
    |                            +------------------>|----------------->|          |
    |                                                |                            |
    |                          +---------------------+---------------------+      |
    |                          |         CHROME STORAGE                     |      |
    |                          |                                           |      |
    |                          |  session: capturedSteps, captureMode      |      |
    |                          |  local:   auth, selection, preferences    |      |
    |                          +-------------------------------------------+      |
    +-----------------------------------------------------------------------------+
```

## Critical Question: Popup + Side Panel Coexistence

**Confidence: HIGH** (verified via Chrome official documentation and multiple sources)

### Can Both Be Registered?

YES. The manifest supports both simultaneously:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_title": "Populatte"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "permissions": ["sidePanel", "storage", "activeTab", "scripting"]
}
```

### Can Both Be Open Simultaneously?

This depends on configuration:

- If `openPanelOnActionClick = true`: Clicking the extension icon opens the Side Panel instead of popup. You effectively choose one or the other per click.
- If `openPanelOnActionClick = false` (DEFAULT): Clicking the extension icon opens the popup. The Side Panel can be opened separately via `chrome.sidePanel.open()` from within the popup or from background script.

**Recommended approach for Populatte:** Keep `openPanelOnActionClick = false`. The popup remains the default quick-access surface. A button in the popup ("Open Side Panel" or "Pin to Side") calls `chrome.sidePanel.open()` via the background script, then the popup closes naturally as focus shifts. Users can also open the Side Panel from Chrome's built-in side panel menu.

### Practical Coexistence Behavior

1. User clicks extension icon -> Popup opens (existing behavior, unchanged)
2. User clicks "Open Side Panel" in popup -> Background opens Side Panel -> Popup closes (auto, on focus loss)
3. Side Panel stays open as user navigates pages -> Persistent fill workflow
4. User can always re-click extension icon for quick popup access even while Side Panel is open

**The popup naturally closes when Side Panel opens because focus shifts away from the popup.** This is desired behavior, not a limitation.

## Side Panel Lifecycle

**Confidence: HIGH** (verified via Chrome official docs)

### Mount Behavior

- Side Panel mounts when user opens it (via Chrome menu, extension icon if configured, or programmatically via `sidePanel.open()`)
- The Side Panel is a full extension page -- it has access to ALL Chrome extension APIs
- React app initializes fresh on mount (constructor, useEffect, etc.)

### Persistence Across Navigation

- **Same tab, page navigation:** Side Panel STAYS OPEN. React state is preserved. This is the key advantage over popup.
- **Tab switch:** Side Panel STAYS OPEN (global panel behavior). React state is preserved.
- **Tab close + new tab:** Side Panel stays open if configured globally (default). Panel re-renders for the new tab context.

### Unmount Behavior

- Side Panel unmounts when user explicitly closes it (X button or Chrome menu)
- Side Panel unmounts when navigating to a site where it's explicitly disabled via `setOptions({ enabled: false, tabId })`
- `chrome.sidePanel.onClosed` event fires (Chrome 142+) -- useful for cleanup

### State Implications

Because the Side Panel persists across navigations:
- **React state survives page changes** within the same panel session
- No need to re-fetch state from background on every navigation (unlike popup which re-mounts every open)
- Must LISTEN for tab URL changes to update mapping detection (already handled by background's `tabs.onUpdated` listener broadcasting `STATE_UPDATED`)

## Communication Architecture

**Confidence: HIGH** (Side Panel uses identical APIs to popup)

### Side Panel -> Background

```typescript
// IDENTICAL to popup's sendToBackground()
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  // handle response
});
```

The existing `sendToBackground()` function in `src/messaging/send.ts` works **without modification** for the Side Panel. Both popup and Side Panel are extension pages that use `chrome.runtime.sendMessage()`.

### Background -> Side Panel (Broadcasts)

The existing `broadcast()` function sends messages via `chrome.runtime.sendMessage()`, which delivers to ALL open extension pages. This means:
- If popup is open, popup receives the broadcast
- If Side Panel is open, Side Panel receives the broadcast
- If BOTH are open, BOTH receive the broadcast

**This is the correct behavior.** Both surfaces should stay in sync with the same state.

### Background -> Content Script

Unchanged. Uses `chrome.tabs.sendMessage(tabId, message)`.

### Content Script -> Background

Unchanged. Uses `chrome.runtime.sendMessage(message)`, which goes to background.

### Message Type Extension

The existing `PopupToBackgroundMessage` union type needs renaming or aliasing since Side Panel sends the same messages:

```typescript
// Option A: Rename to generic "UI to Background"
export type UIToBackgroundMessage = PopupToBackgroundMessage;

// Option B: Create alias (less disruptive)
export type SidePanelToBackgroundMessage = PopupToBackgroundMessage;
```

**Recommendation:** Option B for now. The message types are identical. No new message types are needed for basic Side Panel functionality. New message types will be added incrementally for Side Panel-specific features (HIGHLIGHT_STEP, etc.) as those features are built.

## WXT Side Panel Setup

**Confidence: HIGH** (verified via WXT docs and template repos)

### File Structure

WXT uses file-based routing. The Side Panel entrypoint follows this convention:

```
entrypoints/
  popup/
    App.tsx          # Existing popup React app
    main.tsx         # Existing popup entry point
    components/      # Existing popup components
  sidepanel/
    App.tsx          # New Side Panel React app
    main.tsx         # New Side Panel entry point (React mount)
    index.html       # HTML template for Side Panel
  background.ts      # Existing (shared between popup and sidepanel)
  content.ts         # Existing (unchanged)
```

WXT automatically:
- Adds `sidePanel` permission to manifest
- Registers `sidepanel.html` as `side_panel.default_path` in manifest
- Handles the build pipeline for the new entrypoint

### wxt.config.ts Changes

Minimal changes needed:

```typescript
export default defineConfig({
  manifest: {
    permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
    // Keep existing action config for popup
    action: {
      default_title: 'Populatte',
    },
    // WXT adds side_panel automatically from entrypoints/sidepanel/
  },
});
```

### Side Panel Entry Point (main.tsx)

```typescript
// entrypoints/sidepanel/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Side Panel HTML Template

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

## Component Sharing Strategy

### Current Component Inventory

Components currently in `entrypoints/popup/components/`:

| Component | Popup-Specific? | Share with Side Panel? | Notes |
|-----------|----------------|----------------------|-------|
| ConnectView | No | YES | Auth flow, identical in both |
| CodeInputForm | No | YES | Part of auth flow |
| ConnectedIndicator | No | YES | Status display |
| ProjectSelector | No | YES | Dropdown, identical |
| BatchSelector | No | YES | Dropdown, identical |
| MappingSelector | No | YES | Dropdown, identical |
| RowIndicator | No | YES | Row nav, identical |
| FillControls | No | YES | Fill buttons, identical |
| ErrorInput | No | YES | Error form, identical |
| CapturePanel | Partially | YES (enhanced) | Side Panel gets more space |
| StepList | No | YES | Used in capture and steps view |
| StepConfig | No | YES | Step configuration form |

**Key insight:** ALL existing components are presentation-only. They take props and fire callbacks. None of them import popup-specific code or depend on popup lifecycle. This makes extraction straightforward.

### Extraction Architecture

**Step 1: Move shared components to `src/components/`**

```
src/
  components/
    shared/
      ConnectView.tsx
      CodeInputForm.tsx
      ConnectedIndicator.tsx
      ProjectSelector.tsx
      BatchSelector.tsx
      MappingSelector.tsx
      RowIndicator.tsx
      FillControls.tsx
      ErrorInput.tsx
    capture/
      CapturePanel.tsx
      StepList.tsx
      StepConfig.tsx
    index.ts
```

**Step 2: Re-export from popup (backward compatibility)**

```typescript
// entrypoints/popup/components/index.ts
export { ConnectView } from '../../../src/components/shared/ConnectView';
export { ProjectSelector } from '../../../src/components/shared/ProjectSelector';
// ... etc
```

**Step 3: Import in Side Panel**

```typescript
// entrypoints/sidepanel/App.tsx
import { ConnectView, ProjectSelector, BatchSelector } from '../../src/components/shared';
```

### New Side Panel-Only Components

| Component | Purpose | Complexity |
|-----------|---------|------------|
| SidePanelLayout | Persistent layout wrapper with header/sections | Low |
| StepsListView | Always-visible steps for current mapping | Medium |
| RecentRowsPanel | History of recently processed rows | Medium |
| CollapsedView | Minimal view when Side Panel is narrow | Low |
| CaptureModeInline | Enhanced capture without modal constraint | Medium |

### Shared Hook: `useExtensionState`

Currently, the popup's `App.tsx` manually manages state loading, message listening, and action dispatching. This logic should be extracted into a shared hook:

```typescript
// src/hooks/useExtensionState.ts
export function useExtensionState() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial state from background
  useEffect(() => {
    loadState();

    // Listen for state updates
    const listener = (message: { type: string; payload: unknown }) => {
      if (message.type === 'STATE_UPDATED') {
        setState(message.payload as ExtensionState);
      }
      // ... other message types
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  // Action dispatchers
  const selectProject = (projectId: string) => sendToBackground({ type: 'PROJECT_SELECT', payload: { projectId } });
  const selectBatch = (batchId: string, rowTotal: number) => sendToBackground({ type: 'BATCH_SELECT', payload: { batchId, rowTotal } });
  const fill = () => sendToBackground({ type: 'FILL_START' });
  const nextRow = () => sendToBackground({ type: 'ROW_NEXT' });
  const prevRow = () => sendToBackground({ type: 'ROW_PREV' });
  // ... etc

  return {
    state, loading, error,
    selectProject, selectBatch, fill, nextRow, prevRow,
    // ... etc
  };
}
```

Both `popup/App.tsx` and `sidepanel/App.tsx` consume this hook, eliminating code duplication. This is the single most impactful refactor.

## Side Panel Width Constraints

**Confidence: HIGH** (verified via Chrome bug trackers and developer forums)

### Width Values

| Property | Value | Notes |
|----------|-------|-------|
| Default width | ~320px | Set by Chrome, not configurable by extension |
| Minimum width | ~240px | Chrome-enforced minimum (approximate, varies by version) |
| Maximum width | User-resizable | User drags to resize, no programmatic control |
| Reset behavior | Reverts to ~320px | On close/reopen or incognito |

### Design Implications

- **Design for 320px width as the baseline.** This is wider than the popup (350px with padding = ~310px usable), so most existing components will fit naturally.
- **No programmatic width control exists.** Cannot set, get, or respond to width changes via API.
- **Use CSS responsive patterns** (`min-width`, `max-width`, flexbox) to handle the user-resizable range of ~240px to ~600px+.
- **Collapsed mode** should trigger at narrow widths using CSS media queries or `ResizeObserver` in JavaScript.

### Collapsed Mode Architecture

Since there is no width API, detect width changes using `ResizeObserver`:

```typescript
// src/hooks/useContainerWidth.ts
export function useContainerWidth(ref: RefObject<HTMLElement>) {
  const [width, setWidth] = useState(320);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
```

Layout modes based on width:

| Width Range | Mode | Layout |
|-------------|------|--------|
| < 280px | Collapsed | Icon-only toolbar, minimal text |
| 280-400px | Compact | Standard layout (default 320px) |
| > 400px | Expanded | Side-by-side elements, more detail |

## Per-Tab Side Panel via `setOptions({ tabId })`

**Confidence: HIGH** (verified via Chrome official docs)

### How It Works

```typescript
chrome.sidePanel.setOptions({
  tabId: activeTabId,
  path: 'sidepanel.html',
  enabled: true,
});
```

- When `tabId` is specified, the options apply ONLY to that tab
- Different tabs can have different Side Panel states (enabled/disabled)
- A global default applies to tabs without specific options

### Populatte's Per-Tab Strategy

Populatte should use per-tab panel state to:

1. **Show Side Panel for mapped pages:** When background detects a URL-matched mapping, enable Side Panel for that tab
2. **Disable for irrelevant pages:** On chrome:// pages or pages with no mapping, optionally disable

```typescript
// In background.ts - already has tab listeners
browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url) {
    const hasMappings = await checkMappingsForUrl(changeInfo.url);
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: hasMappings, // Only enable where relevant
    });
  }
});
```

**However**, for MVP this is optional. The Side Panel can simply be globally available and show "no mapping for this page" state when on an unmapped URL, similar to the current popup behavior.

## Capture Mode in Side Panel vs Popup

### Current Capture Mode (Popup)

1. User clicks "Criar Mapping" in popup
2. Popup sends `CAPTURE_START` to background -> relayed to content script
3. Content script activates capture mode (hover highlighting, click capture)
4. Captured elements stored in `chrome.storage.session`
5. Popup reads storage changes via `chrome.storage.onChanged`
6. User configures steps, names mapping, saves via API

**Popup limitation:** Popup CLOSES when user clicks on the page to capture an element. The capture mode persists in storage, and the popup restores state when reopened, but the UX is jarring.

### Side Panel Capture Mode (Improved)

Because the Side Panel stays open during page interaction:

1. User clicks "Criar Mapping" in Side Panel
2. Side Panel sends `CAPTURE_START` to background -> relayed to content script
3. Content script activates capture mode
4. **User clicks elements on the page -- Side Panel STAYS OPEN**
5. Captured step appears immediately in Side Panel's step list
6. User configures step inline (no popup close/reopen cycle)
7. User sees full step list alongside the page at all times

**This is the killer UX improvement.** The entire capture workflow becomes seamless:
- See captured steps accumulate in real-time in Side Panel
- Configure each step immediately without losing context
- Drag-and-drop reorder steps while viewing the page
- Highlight elements on page by clicking steps in the list

### Communication Change for Capture

The existing storage-based sync (`chrome.storage.session` + `onChanged` listener) works identically in Side Panel. The backup message-based sync (`ELEMENT_CAPTURED` broadcast) also works because `chrome.runtime.sendMessage()` delivers to all open extension pages including Side Panel.

**No capture communication changes needed.** The existing architecture already supports the Side Panel use case.

## Data Flow Diagrams

### Flow 1: Fill Cycle in Side Panel

```
Side Panel                 Background               Content Script
    |                          |                          |
    |-- GET_STATE ------------>|                          |
    |<-- STATE_UPDATED --------|                          |
    |                          |                          |
    | [User selects project]   |                          |
    |-- PROJECT_SELECT ------->|                          |
    |<-- STATE_UPDATED --------|                          |
    |                          |                          |
    | [User selects batch]     |                          |
    |-- BATCH_SELECT --------->|                          |
    |<-- STATE_UPDATED --------|                          |
    |                          |                          |
    | [User clicks Fill]       |                          |
    |-- FILL_START ----------->|                          |
    |<-- FILL_PROGRESS --------|-- FILL_EXECUTE --------->|
    |<-- FILL_PROGRESS --------|<-- step results ---------|
    |<-- STATE_UPDATED --------|                          |
    |                          |                          |
    | [User navigates page]    |                          |
    | Side Panel STAYS OPEN    |                          |
    |<-- STATE_UPDATED --------|  [tab URL changed]       |
    | [updates mapping state]  |                          |
    |                          |                          |
    | [User clicks Next]       |                          |
    |-- ROW_NEXT ------------->|                          |
    |<-- STATE_UPDATED --------|                          |
```

### Flow 2: Capture Mode in Side Panel

```
Side Panel                 Background               Content Script
    |                          |                          |
    | [User clicks Capture]    |                          |
    |-- CAPTURE_START -------->|-- CAPTURE_START -------->|
    |                          |                          | [activates hover mode]
    |                          |                          |
    | [Side Panel stays open]  |                          | [user clicks element]
    |                          |<-- ELEMENT_CAPTURED -----|
    |                          |  [saves to storage]      |
    | [storage.onChanged fires]|                          |
    | [new step appears in UI] |                          |
    |                          |                          |
    | [User configures step]   |                          |
    | [inline in Side Panel]   |                          |
    |                          |                          |
    | [User clicks highlight]  |                          |
    |-- CAPTURE_HIGHLIGHT ---->|-- CAPTURE_HIGHLIGHT ---->|
    |                          |                          | [highlights element]
    |                          |                          |
    | [User saves mapping]     |                          |
    |-- API call (direct) ---->| [via API client]         |
    |-- CAPTURE_STOP --------->|-- CAPTURE_STOP --------->|
```

### Flow 3: Open Side Panel from Popup

```
Popup                      Background               Side Panel
    |                          |                        |
    | [User clicks "Pin"]      |                        |
    |-- OPEN_SIDE_PANEL ------>|                        |
    |                          |-- sidePanel.open() --->|
    |  [popup loses focus]     |                        | [mounts, loads state]
    |  [popup auto-closes]     |                        |-- GET_STATE ---------->|
    |                          |                        |<-- STATE_UPDATED ------|
```

## Background Script Changes

### New Message: OPEN_SIDE_PANEL

A single new message type enables the popup-to-Side Panel transition:

```typescript
// In messages.ts
export interface OpenSidePanelMessage {
  type: 'OPEN_SIDE_PANEL';
}

// In background.ts handler
case 'OPEN_SIDE_PANEL': {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
  sendResponse({ success: true });
  break;
}
```

### Background: setPanelBehavior on Install

```typescript
// In background.ts, inside onInstalled listener
browser.runtime.onInstalled.addListener((details) => {
  // Keep openPanelOnActionClick = false so popup remains default
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});
```

### Broadcast Awareness

The existing `broadcast()` function in `src/messaging/send.ts` already sends to all extension pages. When Side Panel is open, it automatically receives all `STATE_UPDATED`, `FILL_PROGRESS`, `ELEMENT_CAPTURED` broadcasts. No changes needed.

## Suggested Build Order Based on Dependencies

### Phase 1: Foundation (No UI Changes)

**Goal:** Set up Side Panel infrastructure without breaking existing popup.

1. **WXT entrypoint setup** - Create `entrypoints/sidepanel/` with index.html, main.tsx, basic App.tsx
2. **Manifest changes** - Add `sidePanel` permission (WXT auto-adds from entrypoint)
3. **Background: `setPanelBehavior`** - Configure on install
4. **Background: `OPEN_SIDE_PANEL` handler** - New message type
5. **Smoke test** - Verify Side Panel opens, shows basic content, receives state from background

**Dependencies:** None (additive only, popup unchanged)

### Phase 2: Component Extraction

**Goal:** Move shared components to `src/components/` so both surfaces can use them.

1. **Create `src/components/shared/`** - Move all shareable components
2. **Create `src/hooks/useExtensionState.ts`** - Extract state management hook from popup App.tsx
3. **Update popup imports** - Re-export from popup/components for backward compat
4. **Verify popup still works** - Regression test

**Dependencies:** Phase 1 (entrypoint exists to verify shared components work in both)

### Phase 3: Side Panel Core UI

**Goal:** Build the main Side Panel layout using shared components.

1. **SidePanelLayout** - Persistent header, scrollable content, footer
2. **Wire shared components** - ProjectSelector, BatchSelector, MappingSelector, RowIndicator, FillControls
3. **Fill cycle in Side Panel** - Full fill workflow
4. **"Open Side Panel" button in popup** - Transition mechanism
5. **Verify dual-surface** - Both popup and Side Panel work simultaneously

**Dependencies:** Phase 2 (components extracted)

### Phase 4: Side Panel-Specific Features

**Goal:** Features that leverage Side Panel's persistent nature.

1. **StepsListView** - Always-visible mapping steps
2. **Enhanced Capture Mode** - Inline capture with real-time step list
3. **RecentRowsPanel** - History of processed rows
4. **CollapsedView** - Narrow-width responsive layout

**Dependencies:** Phase 3 (core UI working)

### Phase 5: Polish

**Goal:** Refine the experience.

1. **Width-responsive layout** - ResizeObserver-based mode switching
2. **Per-tab panel state** - Enable/disable based on URL matching
3. **Keyboard shortcuts** - Quick fill, next row, etc.
4. **Animation/transitions** - Smooth mode switches

**Dependencies:** Phase 4 (features complete)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Duplicating State Logic

**What:** Copy-pasting the popup's state management code into the Side Panel App.tsx
**Why bad:** Two diverging copies of the same logic. Bugs fixed in one surface missed in the other.
**Instead:** Extract `useExtensionState` hook, use in both surfaces.

### Anti-Pattern 2: Side Panel-Specific Messages

**What:** Creating separate message types like `SIDEPANEL_GET_STATE`, `SIDEPANEL_FILL_START`
**Why bad:** The background shouldn't care which UI surface sent the message. Both are extension pages.
**Instead:** Use the same `PopupToBackgroundMessage` types. Rename to `UIToBackgroundMessage` if desired.

### Anti-Pattern 3: Coupling Components to Surface

**What:** Shared components that check `if (isSidePanel)` to change behavior.
**Why bad:** Violates open/closed principle. Components become fragile.
**Instead:** Use composition. Side Panel and popup compose the same atomic components differently (different layouts, different containers), but the components themselves are surface-agnostic.

### Anti-Pattern 4: Ignoring Width Constraints

**What:** Designing Side Panel UI assuming 350px (popup width).
**Why bad:** Side Panel defaults to ~320px and can be as narrow as ~240px.
**Instead:** Design mobile-first for 280px, enhance for wider. Use `ResizeObserver` not media queries (Side Panel width != viewport width).

### Anti-Pattern 5: Fighting Popup Lifecycle

**What:** Trying to keep popup open, or storing complex state in popup.
**Why bad:** Popup WILL close on outside click. This is by design.
**Instead:** Accept popup as ephemeral. Let Side Panel be the persistent surface. State lives in background + storage, never in the UI layer.

## Sources

- [Chrome sidePanel API Reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) - HIGH confidence, official docs
- [Chrome Side Panel Launch Blog](https://developer.chrome.com/blog/extension-side-panel-launch) - HIGH confidence, official blog
- [WXT Entrypoints Guide](https://wxt.dev/guide/essentials/entrypoints.html) - HIGH confidence, framework docs
- [WXT SidepanelEntrypointOptions API](https://wxt.dev/api/reference/wxt/interfaces/sidepanelentrypointoptions) - HIGH confidence, framework docs
- [Chrome Side Panel Width Discussion](https://github.com/GoogleChrome/chrome-extensions-samples/issues/1011) - MEDIUM confidence, GitHub issue
- [Side Panel Minimum Width Request](https://issues.chromium.org/issues/378404989) - MEDIUM confidence, Chromium bug tracker
- [Mellowtel Side Panel Guide](https://www.mellowtel.com/blog/how-to-open-chrome-extensions-side-panel-a-comprehensive-guide) - MEDIUM confidence, verified patterns
- [WXT Side Panel Template](https://github.com/evanlong-me/sidepanel-extension-template) - MEDIUM confidence, community template
- [Chrome Side Panel Reflections](https://annjose.com/post/chrome-side-panel/) - LOW confidence, individual blog

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Coexistence (popup + panel) | HIGH | Verified via Chrome official docs + multiple sources |
| Communication (same APIs) | HIGH | Chrome docs confirm Side Panel = extension page with full API access |
| WXT setup | HIGH | WXT docs + template repos confirm file-based entrypoint |
| Width constraints | HIGH | Chrome bug trackers confirm 320px default, no programmatic control |
| Lifecycle (persistence) | HIGH | Chrome docs confirm persistence across navigations |
| Component sharing pattern | MEDIUM | Based on codebase analysis, not yet proven in practice |
| Collapsed mode | MEDIUM | ResizeObserver approach is standard but untested in this context |
| Per-tab state | MEDIUM | API exists and is documented, but edge cases may surface |
