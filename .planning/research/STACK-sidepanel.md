# Technology Stack: Chrome Side Panel Integration

**Project:** Populatte Extension - Side Panel UI
**Researched:** 2026-02-05
**Overall Confidence:** HIGH (verified against official Chrome docs, WXT docs, and existing codebase)

---

## 1. WXT Side Panel Entrypoint Convention

**Confidence: HIGH** (verified via [WXT entrypoints documentation](https://wxt.dev/guide/essentials/entrypoints.html) and [SidepanelEntrypointOptions API](https://wxt.dev/api/reference/wxt/interfaces/sidepanelentrypointoptions))

### Directory Convention

WXT auto-detects side panel entrypoints by directory name. Create:

```
entrypoints/
├── sidepanel/           <-- NEW: Side Panel UI
│   ├── index.html       <-- HTML entry (required)
│   ├── main.tsx         <-- React mount point
│   └── App.tsx          <-- Root component
├── popup/               <-- EXISTING: Keep as-is
│   ├── index.html
│   ├── main.tsx
│   └── App.tsx
├── background.ts        <-- EXISTING: Keep as-is
└── content.ts           <-- EXISTING: Keep as-is
```

**Naming rules:**
- Default side panel: `entrypoints/sidepanel/index.html` or `entrypoints/sidepanel.html`
- Named side panels (if needed): `entrypoints/{name}.sidepanel/index.html`
- WXT generates `sidepanel.html` in the build output

### What WXT Does Automatically

When you create `entrypoints/sidepanel/index.html`, WXT:

1. **Adds `"sidePanel"` permission** to the generated manifest automatically
2. **Adds `"side_panel"` manifest key** with `"default_path": "sidepanel.html"` automatically
3. **Bundles the React app** into the extension output just like popup

You do NOT need to manually add `sidePanel` to the permissions array in `wxt.config.ts`.

### WXT Config Changes Required

**Minimal change to `wxt.config.ts`**: None strictly required for side panel to appear. However, the current config already has `action: { default_title: 'Populatte' }` which is compatible. You must NOT add `openPanelOnActionClick: true` here since you want to keep the popup on icon click.

The generated manifest will look like:

```json
{
  "permissions": ["storage", "activeTab", "scripting", "sidePanel"],
  "action": { "default_title": "Populatte" },
  "side_panel": { "default_path": "sidepanel.html" }
}
```

### WXT SidepanelEntrypointOptions

Available meta-tag configuration in `index.html`:

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `defaultIcon` | `string \| Record<string, string>` | Extension icon | Side panel icon |
| `defaultTitle` | `string` | Extension name | Side panel title |
| `openAtInstall` | `boolean` | `false` | Firefox only, irrelevant for Chrome |
| `include` | `string[]` | All browsers | Browser targeting |
| `exclude` | `string[]` | None | Browser targeting |

**Recommendation:** No meta tags needed. Defaults are fine for Populatte.

### Known WXT Issues to Be Aware Of

1. **`import.meta.env.ENTRYPOINT` is `undefined`** in side panel context ([Issue #1611](https://github.com/wxt-dev/wxt/issues/1611)). Workaround: Do not rely on this env var. Instead, detect context by checking `window.location.pathname` if needed.

2. **Side panel shows on all pages by default.** The `side_panel.default_path` in manifest makes it globally available. This is fine for Populatte since users need the panel on any form page. If per-page restriction is needed later, handle in background script via `chrome.sidePanel.setOptions({ tabId, enabled })`.

3. **Type support for `browser.sidePanel`** was historically incomplete. Since WXT 0.20+ uses `@types/chrome` (project has v0.0.287), use `chrome.sidePanel` directly for full type support.

---

## 2. Chrome Side Panel API Reference

**Confidence: HIGH** (verified via [official Chrome documentation](https://developer.chrome.com/docs/extensions/reference/api/sidePanel))

### Version Requirements

| Feature | Minimum Chrome | Status |
|---------|---------------|--------|
| `chrome.sidePanel` namespace | Chrome 114 | Stable since May 2023 |
| `setOptions()` | Chrome 114 | Stable |
| `getOptions()` | Chrome 114 | Stable |
| `setPanelBehavior()` | Chrome 114 | Stable |
| `getPanelBehavior()` | Chrome 114 | Stable |
| `open()` | Chrome 116 | Stable since Aug 2023 |
| `close()` | Chrome 141 | Stable since Sep 2025 |

**Practical minimum: Chrome 116** for `sidePanel.open()`. Chrome 114-115 can still show the side panel via user-initiated menu click, but programmatic opening requires 116+. As of February 2026, Chrome stable is well past 141, so all methods are available.

### Required Permission

```json
{
  "permissions": ["sidePanel"]
}
```

WXT adds this automatically when sidepanel entrypoint exists.

### API Methods and Signatures

```typescript
// Set side panel options (global or per-tab)
chrome.sidePanel.setOptions(options: {
  tabId?: number;        // If provided, settings apply to this tab only
  path?: string;         // HTML page to display (relative to extension root)
  enabled?: boolean;     // Enable/disable for this tab
}): Promise<void>

// Get current options
chrome.sidePanel.getOptions(options: {
  tabId?: number;        // If provided, returns tab-specific options
}): Promise<{ path: string; enabled: boolean }>

// Control icon click behavior
chrome.sidePanel.setPanelBehavior(behavior: {
  openPanelOnActionClick?: boolean;  // true = icon click opens side panel
}): Promise<void>

// Get current behavior
chrome.sidePanel.getPanelBehavior(): Promise<{
  openPanelOnActionClick: boolean;
}>

// Open side panel programmatically (Chrome 116+)
// MUST be called synchronously in response to a user gesture
chrome.sidePanel.open(options: {
  windowId?: number;     // Window to open in
  tabId?: number;        // Tab to open for
}): Promise<void>

// Close side panel (Chrome 141+)
chrome.sidePanel.close(options: {
  windowId?: number;
  tabId?: number;
}): Promise<void>
```

### Critical Constraint: User Gesture Requirement

`chrome.sidePanel.open()` MUST be called **synchronously** within a user gesture handler. This means:

- It works in `chrome.action.onClicked` listener (action icon click)
- It works in `chrome.contextMenus.onClicked` listener
- It works synchronously in `chrome.runtime.onMessage` listener when triggered by a popup button click
- It does NOT work after `await` or in `.then()` callbacks
- It does NOT work in `setTimeout` or `setInterval`

**Pattern for opening side panel from popup button:**

```typescript
// In popup: Send message to background
document.getElementById('openPanel').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
});

// In background: Handle synchronously (no await before open())
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'OPEN_SIDE_PANEL') {
    // Get window ID synchronously from sender, then open
    chrome.sidePanel.open({ windowId: sender.tab?.windowId });
  }
});
```

**WARNING:** The message handler in background.ts currently wraps everything in `(async () => { ... })()`. For `sidePanel.open()`, this pattern BREAKS the user gesture chain. The `open()` call must happen synchronously at the top level of the `onMessage` listener, before any `await`.

---

## 3. Popup and Side Panel Coexistence

**Confidence: HIGH** (verified via [Chrome manifest docs](https://developer.chrome.com/docs/extensions/reference/manifest) and [Side Panel launch blog](https://developer.chrome.com/blog/extension-side-panel-launch))

### Can They Coexist? YES.

A Chrome extension can have BOTH a popup and a side panel. The manifest supports both simultaneously:

```json
{
  "action": {
    "default_title": "Populatte",
    "default_popup": "popup.html"   // Clicking icon opens popup
  },
  "side_panel": {
    "default_path": "sidepanel.html"  // Available in side panel menu
  }
}
```

**Current Populatte manifest** (via `wxt.config.ts`) has `action.default_title` but no `default_popup`. WXT auto-generates `default_popup: "popup.html"` from the popup entrypoint. This means:

- Clicking the extension icon opens the **popup** (existing behavior preserved)
- Side panel is accessible from Chrome's side panel menu (hamburger icon in side panel area)
- Side panel can also be opened programmatically via `chrome.sidePanel.open()`

### Behavioral Rules

| Action | Popup configured? | setPanelBehavior(openOnClick=true)? | Result |
|--------|-------------------|--------------------------------------|--------|
| Click icon | YES | NO | Popup opens |
| Click icon | YES | YES | Side panel opens (popup IGNORED) |
| Click icon | NO | YES | Side panel opens |
| Click icon | NO | NO | `action.onClicked` fires |

**Recommendation for Populatte:** Do NOT set `openPanelOnActionClick: true`. Keep the popup as the default icon-click behavior. Users who prefer the side panel can:
1. Open it from Chrome's side panel menu
2. Open it from a button inside the popup (which then closes)
3. Open it from a keyboard shortcut (configured via commands API)

### Communication Architecture

Both popup and side panel are extension pages. They share the SAME communication infrastructure:

```
                    ┌──────────┐
                    │ Popup    │ ──── browser.runtime.sendMessage ────┐
                    └──────────┘                                      │
                                                                      ▼
                    ┌──────────┐                              ┌──────────────┐
                    │ SidePanel│ ──── browser.runtime.sendMessage ──▶│  Background  │
                    └──────────┘                              │  Service     │
                                                              │  Worker      │
                    ┌──────────┐                              └──────┬───────┘
                    │ Content  │ ◀── browser.tabs.sendMessage ───────┘
                    │ Script   │
                    └──────────┘
```

**Key insight:** The existing `sendToBackground()`, `broadcast()`, and message type system work identically in the side panel context. The side panel can import the same `src/messaging/send.ts` and `src/types/messages.ts` modules.

However, `broadcast()` (which uses `browser.runtime.sendMessage`) reaches ALL open extension pages simultaneously -- both popup and side panel if both are open. The message type union `PopupToBackgroundMessage` should be renamed or aliased to reflect that it also covers side panel messages.

### State Sharing

Both popup and side panel access the same:
- `chrome.storage.session` (capture mode state)
- `chrome.storage.local` (persistent preferences)
- Background service worker (via `sendToBackground()`)
- `ExtensionState` object (via `GET_STATE` message)

**No new state management is needed.** The existing `storage/` and `messaging/` modules are reusable.

---

## 4. Recommended Stack for Side Panel

### No New Libraries Needed

| Concern | Solution | Library Needed? |
|---------|----------|----------------|
| Side panel UI | React 19 (existing) | NO |
| Styling | Tailwind CSS 4 (existing) | NO |
| Icons | lucide-react (existing) | NO |
| Tabs component | Custom with Tailwind or headless | See below |
| Animations/transitions | Tailwind CSS transitions | NO |
| Collapsed mode | CSS + state toggle | NO |
| State management | chrome.storage + messages (existing) | NO |
| Type safety | @types/chrome 0.0.287 (existing) | NO |

### Tab Components

For tabs in the side panel (switching between COPILOTO and Capture views):

**Option A: Headless UI from Radix (RECOMMENDED)**
The web app already uses Radix-based shadcn/ui. However, the extension is NOT using shadcn/ui -- it uses raw Tailwind. For consistency within the extension codebase:

**Option B: Custom tabs with Tailwind (RECOMMENDED)**
Build a simple `<Tabs>` component using Tailwind classes. The tabs UI is simple (2-3 tabs), not worth adding a library dependency.

```typescript
// Example: ~30 lines, zero dependencies
interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}
```

**Recommendation: Option B.** Keep the extension dependency-free for UI primitives. The popup already uses zero UI libraries, and the side panel should maintain the same pattern. Adding Radix or headless-ui to the extension would increase bundle size for a simple tab toggle.

### Animations and Transitions

For the collapsed/expanded side panel mode and smooth transitions:

**Tailwind CSS is sufficient.** Use:
- `transition-all duration-200` for expand/collapse
- `animate-pulse` or custom keyframes for loading states
- `transform translate-x` for slide-in effects

No animation library (framer-motion, react-spring) is warranted. The side panel UI is simple -- form selectors, step lists, and fill controls.

### Collapsed Mode

The "collapsed" side panel concept is a UI pattern within the side panel itself -- NOT a Chrome API feature. Chrome's side panel has a fixed width set by the user (draggable). The collapsed mode means rendering a minimal toolbar-like UI when the user toggles to compact view.

**Implementation:** Simple boolean state + conditional rendering. No special library needed.

---

## 5. Required Changes to Existing Codebase

### New Files to Create

| File | Purpose |
|------|---------|
| `entrypoints/sidepanel/index.html` | HTML entry point for side panel |
| `entrypoints/sidepanel/main.tsx` | React mount point (identical pattern to popup) |
| `entrypoints/sidepanel/App.tsx` | Root component for side panel UI |

### Existing Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `entrypoints/background.ts` | Add `OPEN_SIDE_PANEL` message handler | Programmatic open from popup |
| `src/types/messages.ts` | Add `OpenSidePanelMessage` type, rename union to `UIToBackgroundMessage` | Side panel sends same messages as popup |
| `src/messaging/send.ts` | No change needed | `sendToBackground` works from any extension page |

### Manifest Changes (Auto-Generated by WXT)

WXT automatically generates these when sidepanel entrypoint exists:

```diff
 {
   "permissions": ["storage", "activeTab", "scripting"],
+  "permissions": ["storage", "activeTab", "scripting", "sidePanel"],
   "action": {
     "default_title": "Populatte"
   },
+  "side_panel": {
+    "default_path": "sidepanel.html"
+  }
 }
```

### wxt.config.ts Changes

**None required for basic side panel support.** The current config is compatible as-is. WXT handles everything via the entrypoint directory convention.

Optional: Add `tabs` permission if implementing per-tab panel toggling:

```diff
 manifest: {
   name: 'Populatte',
   description: 'Automate web form filling from your data',
-  permissions: ['storage', 'activeTab', 'scripting'],
+  permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
   host_permissions: ['<all_urls>'],
   action: {
     default_title: 'Populatte',
   },
 },
```

Note: `tabs` permission is only needed if you want to enable/disable the side panel per-tab or read `tab.url` from the side panel context. The `activeTab` permission already covers most use cases from popup click context, but `tabs` is needed for the background listener on `tabs.onUpdated` for per-tab side panel control.

**Assessment:** The current config already uses `host_permissions: ['<all_urls>']` and the background script already listens to `tabs.onUpdated`, so `tabs` permission may already be implicitly available. Verify during implementation.

---

## 6. Shared Component Strategy

### Code Reuse Between Popup and Side Panel

The popup components in `entrypoints/popup/components/` are tightly coupled to the popup's 350x500px layout. For the side panel (which is ~400px wide, full-height):

**Recommended approach:** Extract shared logic into `src/` hooks, keep UI separate.

```
src/
├── hooks/                      <-- NEW: Shared React hooks
│   ├── use-extension-state.ts  <-- State management (shared)
│   ├── use-fill-controls.ts    <-- Fill logic (shared)
│   └── use-capture-mode.ts     <-- Capture logic (shared)
├── messaging/                  <-- EXISTING: Already shared
├── storage/                    <-- EXISTING: Already shared
├── api/                        <-- EXISTING: Already shared
└── types/                      <-- EXISTING: Already shared

entrypoints/
├── popup/
│   ├── components/             <-- Popup-specific UI (compact layout)
│   └── App.tsx                 <-- Uses hooks from src/hooks/
└── sidepanel/
    ├── components/             <-- Side panel-specific UI (full-height layout)
    └── App.tsx                 <-- Uses hooks from src/hooks/
```

**Why not share components directly?** The popup is constrained to 350x500px with compact styling. The side panel is full-height with room for more detail. Shared hooks + separate UI components gives maximum flexibility without premature abstraction.

---

## 7. What NOT to Add

| Technology | Why Not |
|------------|---------|
| **framer-motion** | Overkill for simple expand/collapse. Tailwind transitions suffice. Adds ~30KB to bundle. |
| **@headlessui/react** | Only needed for complex accessible components. Tab switching is trivial in this context. |
| **shadcn/ui in extension** | The extension uses raw Tailwind intentionally. Adding shadcn would require Radix, cn(), and component infrastructure. Not worth it for the simple extension UI. |
| **zustand/jotai/recoil** | Chrome extension state is already managed via `chrome.storage` + message bus. Adding a state library creates two sources of truth. |
| **react-router** | Side panel has simple view switching (tabs), not URL-based routing. |
| **@radix-ui/react-tabs** | Would add ~8KB for something achievable in 30 lines of Tailwind. |
| **Chrome Side Panel `close()` API** | Available since Chrome 141 (Sep 2025) but not needed. Users close the side panel via Chrome's native X button. |

---

## 8. Browser Compatibility

### Chrome

| Version | Side Panel Support |
|---------|--------------------|
| < 114 | Not supported |
| 114-115 | Basic side panel (no programmatic open) |
| 116+ | Full support with `sidePanel.open()` |
| 141+ | Full support including `sidePanel.close()` |

**Recommendation:** Target Chrome 116+ as minimum. As of Feb 2026, Chrome stable is ~143+, so this is a non-issue.

### Firefox

Firefox uses `sidebar_action` API, which is different from Chrome's `side_panel`. WXT abstracts this partially, but the APIs are not fully compatible. Side panel features would work differently on Firefox.

**Recommendation:** Focus on Chrome only for now. The extension is Chrome-first per the product (Chrome Extension for form filling). Firefox support can be added later if needed.

### Edge

Edge (Chromium-based) supports the Chrome Side Panel API. No special handling needed.

---

## 9. Summary: Installation and Setup

### Zero new packages to install.

The existing stack fully supports Side Panel:

```
Already installed:
- wxt@^0.20.13          (auto-generates sidepanel manifest entries)
- @wxt-dev/module-react  (React support for all entrypoints)
- react@19.2.0           (UI framework)
- react-dom@19.2.0       (DOM rendering)
- tailwindcss@^4          (styling)
- @tailwindcss/vite       (Vite integration)
- lucide-react@0.555.0    (icons)
- @types/chrome@0.0.287   (includes chrome.sidePanel types)
```

### Implementation checklist:

1. Create `entrypoints/sidepanel/index.html` (copy popup pattern)
2. Create `entrypoints/sidepanel/main.tsx` (copy popup pattern)
3. Create `entrypoints/sidepanel/App.tsx` (new layout, reuse messaging/storage)
4. Add `OPEN_SIDE_PANEL` handler in `background.ts` (synchronous, no await before `open()`)
5. Extract shared hooks from popup into `src/hooks/`
6. Build side panel-specific components in `entrypoints/sidepanel/components/`
7. Test that popup and side panel coexist without interference

---

## Sources

### Official Documentation (HIGH confidence)
- [WXT Entrypoints Guide](https://wxt.dev/guide/essentials/entrypoints.html)
- [WXT SidepanelEntrypointOptions](https://wxt.dev/api/reference/wxt/interfaces/sidepanelentrypointoptions)
- [Chrome sidePanel API Reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome Side Panel Launch Blog](https://developer.chrome.com/blog/extension-side-panel-launch)
- [Chrome 116 Extension Updates](https://developer.chrome.com/blog/chrome-116-beta-whats-new-for-extensions)

### Community/GitHub (MEDIUM confidence)
- [WXT Issue #570 - Open sidepanel on icon click](https://github.com/wxt-dev/wxt/issues/570)
- [WXT Issue #1272 - Per-page side panel](https://github.com/wxt-dev/wxt/issues/1272)
- [WXT Issue #1256 - sidePanel type support](https://github.com/wxt-dev/wxt/issues/1256)
- [WXT Issue #1611 - ENTRYPOINT undefined](https://github.com/wxt-dev/wxt/issues/1611)
- [WXT Side Panel Template](https://github.com/evanlong-me/sidepanel-extension-template)

### Codebase Analysis (HIGH confidence)
- `apps/extension/wxt.config.ts` - Current manifest configuration
- `apps/extension/entrypoints/background.ts` - Current message handler pattern
- `apps/extension/src/types/messages.ts` - Current message type system
- `apps/extension/src/messaging/send.ts` - Current messaging infrastructure
- `apps/extension/package.json` - Current dependencies (no new deps needed)
