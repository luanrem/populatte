# Feature Research: Chrome Side Panel UX & Patterns

**Domain:** Chrome Extension Side Panel for Form-Filling Workflow
**Researched:** 2026-02-05
**Confidence:** HIGH (official Chrome docs) / MEDIUM (community patterns)

## Executive Summary

Chrome's Side Panel API solves Populatte's critical UX pain point: the popup closes when users click on the page, breaking capture mode and fill workflow. The Side Panel stays open persistently across page interactions and tab navigations, making it the natural home for both Captura (mapping creation) and Preencher (fill workflow) modes.

Research reveals that Side Panels in Chrome operate within significant width constraints (~320px default, user-resizable but with Chrome-enforced minimum ~280-300px). There is no programmatic width control API -- Chrome manages all layout, positioning, and resize behavior. This means the UI must be designed mobile-first, treating the Side Panel as a narrow single-column viewport.

The popup and Side Panel can coexist in the same extension, but they cannot both respond to the action icon click. The recommended pattern is: action icon click opens Side Panel (via `setPanelBehavior({ openPanelOnActionClick: true })`), while the popup is either removed or repurposed as a quick-access menu. Since Populatte's popup is already 350px wide, most existing components are width-compatible with Side Panel dimensions.

Key insight: Chrome does NOT support a "collapsed" Side Panel mode at the API level. A ~50px icon strip would need to be implemented as internal UI state within the full-width Side Panel, not as a Chrome-level feature. The panel width remains user-controlled; only the content inside can change.

---

## Table Stakes

Features users expect from any Side Panel extension. Missing these creates friction or confusion.

### TS-01: Persistent Visibility During Page Interaction

| Aspect | Detail |
|--------|--------|
| **Description** | Side Panel stays open while user clicks elements on the page, navigates, and interacts with forms |
| **Why Expected** | This is the entire reason Side Panel exists vs popup. Users who open a Side Panel expect it to persist |
| **Complexity** | LOW -- Chrome handles this natively via the `sidePanel` API |
| **Existing Dependency** | Current popup state management via `chrome.storage.session` already supports restore-after-close; Side Panel makes this less critical but still useful for cross-session persistence |
| **Confidence** | HIGH -- [Chrome sidePanel API docs](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) |

### TS-02: Action Icon Toggle

| Aspect | Detail |
|--------|--------|
| **Description** | Clicking the extension's toolbar icon opens/closes the Side Panel |
| **Why Expected** | Standard pattern for Side Panel extensions. Users expect the icon to be the primary way to toggle panel visibility |
| **Complexity** | LOW -- Single API call: `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` |
| **Existing Dependency** | Current popup uses `action.default_popup` in manifest; must remove that and switch to Side Panel behavior. WXT handles this via the `sidepanel` entrypoint convention |
| **Confidence** | HIGH -- [Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) |
| **Important Constraint** | When `openPanelOnActionClick` is true, you CANNOT also have a popup. The two are mutually exclusive for the action icon. If popup coexistence is needed, the popup must be opened via a different mechanism (context menu, keyboard shortcut) |

### TS-03: Content-Width-Aware Layout (~320-400px)

| Aspect | Detail |
|--------|--------|
| **Description** | All UI components must render correctly in a ~320-400px wide column. No horizontal scrolling. All text truncates gracefully |
| **Why Expected** | Chrome's Side Panel has a fixed-width viewport. Users resize it, but the default is ~320px. Content that overflows or requires horizontal scrolling is immediately perceived as broken |
| **Complexity** | LOW-MEDIUM -- Populatte's existing popup is 350px wide, so most components already fit. Key areas needing attention: StepConfig column dropdown, selector display in StepList, and any tables |
| **Existing Dependency** | Popup already uses `w-[350px]` Tailwind class; Side Panel should use `w-full` instead and let Chrome control the width |
| **Confidence** | HIGH -- [Side Panel minimum width discussion](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/xuk4ZuWTsBk), [Chrome developers blog](https://developer.chrome.com/blog/extension-side-panel-launch) |

### TS-04: Smooth Scrolling for Long Content

| Aspect | Detail |
|--------|--------|
| **Description** | Step lists, column dropdowns, and configuration forms scroll smoothly within the fixed-height panel. Content areas use `overflow-y-auto` |
| **Why Expected** | Side Panels have finite vertical space. Mapping workflows with 10+ steps will exceed visible area. Scroll must feel native |
| **Complexity** | LOW -- Already implemented in popup CapturePanel with `flex-1 overflow-y-auto`. Transfer directly |
| **Existing Dependency** | Popup CapturePanel and StepList already handle scrolling |
| **Confidence** | HIGH -- standard CSS pattern |

### TS-05: Clear Visual Mode Indicator

| Aspect | Detail |
|--------|--------|
| **Description** | Users must always know which mode the Side Panel is in: Captura (mapping creation) vs Preencher (fill workflow). A prominent tab bar or header indicator distinguishes modes |
| **Why Expected** | Side Panels are persistent and present across page navigations. Users lose track of what mode they are in if the only indicator is subtle. Confusion between "am I capturing elements?" vs "am I filling forms?" is dangerous -- one adds mapping steps, the other fills data |
| **Complexity** | LOW -- Tab bar at the top with two options. Standard pattern |
| **Existing Dependency** | Current popup uses `captureMode` boolean to switch between CapturePanel and main UI. Side Panel elevates this to explicit tabs |
| **Confidence** | HIGH -- standard UI pattern for multi-mode tools |

### TS-06: State Sync Between Side Panel and Content Script

| Aspect | Detail |
|--------|--------|
| **Description** | Actions taken in the Side Panel (start capture, trigger fill, navigate row) immediately reflect in the content script (highlighting, form filling), and vice versa (element captured on page immediately appears in Side Panel step list) |
| **Why Expected** | Bidirectional sync is the core interaction model. Lag or inconsistency between panel and page breaks trust |
| **Complexity** | MEDIUM -- Existing popup uses `chrome.storage.session` changes + message passing for sync. Side Panel can use the same channels since it runs as an extension page. However, Side Panel's persistent nature means the sync code runs continuously (no mount/unmount cycles like popup) |
| **Existing Dependency** | `CapturePanel` already listens to `chrome.storage.onChanged` for step updates from content script; `App.tsx` listens to `runtime.onMessage` for state broadcasts. Both patterns work identically in Side Panel context |
| **Confidence** | HIGH -- [Chrome message passing docs](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) |

### TS-07: Loading and Error States

| Aspect | Detail |
|--------|--------|
| **Description** | Every async operation (API calls, state loading, fill execution) shows appropriate loading indicators. Errors display clearly with recovery options |
| **Why Expected** | Side Panels are persistent -- users stare at them longer than popups. A stuck loading spinner or silent error is more noticeable and frustrating |
| **Complexity** | LOW -- Already built in popup (loading states, error messages, fill progress). Transfer directly |
| **Existing Dependency** | Popup App.tsx has loading/error state management; FillControls has progress tracking |
| **Confidence** | HIGH -- standard UX pattern |

---

## Differentiators

Features that create competitive advantage specifically for Populatte's form-filling Side Panel workflow. Not expected generically, but highly valued by form-filling power users.

### DF-01: Two-Tab Architecture (Captura / Preencher)

| Aspect | Detail |
|--------|--------|
| **Description** | Side Panel has two primary tabs: "Captura" for mapping creation (click-to-capture elements, configure steps, save mapping) and "Preencher" for fill workflow (row navigation, fill trigger, progress tracking, error marking) |
| **Value Proposition** | Separates two distinct workflows into clear contexts. Users switching between "I'm creating a mapping" and "I'm filling forms" get purpose-built interfaces for each. Prevents accidental captures during fill mode and vice versa |
| **Complexity** | LOW -- Simple tab component at top of Side Panel. Each tab renders its existing component tree (CapturePanel for Captura, main app flow for Preencher) |
| **Existing Dependency** | Both UIs exist: CapturePanel (Captura) and the main App flow with selectors + FillControls (Preencher). Currently toggled by `captureMode` boolean. Tabs make this explicit and always accessible |
| **Width Impact** | Two tab labels ("Captura" / "Preencher") fit easily in 320px with equal widths or icons+labels |

### DF-02: Clickable Steps List with Element Highlighting

| Aspect | Detail |
|--------|--------|
| **Description** | Each step in the Captura step list is clickable. Clicking a step highlights the corresponding element on the page with a visual overlay (border, glow, or badge). Useful for verifying which form field a step targets |
| **Value Proposition** | Reduces cognitive load when building or reviewing mappings. Users can visually verify "step 3 targets the CPF field" without reading CSS selectors. Critical for complex forms with many similar-looking fields |
| **Complexity** | LOW -- Already implemented. StepList's `onHighlight` callback sends `CAPTURE_HIGHLIGHT` message to content script. Highlighter module in content script handles visual overlay |
| **Existing Dependency** | Fully built: `highlighter.ts` in content script, `onHighlight` prop chain in StepList -> App -> background. Direct port to Side Panel |
| **Width Impact** | None -- StepList items already render at popup width |

### DF-03: Persistent Row Context Display

| Aspect | Detail |
|--------|--------|
| **Description** | The Preencher tab always shows current row context: row number (e.g., "Row 15 of 50"), primary identifier (e.g., CNPJ "12.345.678/0001-90"), and secondary identifier (e.g., company name). Clickable to copy primary identifier |
| **Value Proposition** | Side Panel persistence means this context is always visible, even while user fills the form manually or verifies data. In popup mode, this context disappears when the popup closes. Persistent visibility eliminates "wait, which row am I on?" confusion |
| **Complexity** | LOW -- RowIndicator component exists and works at 350px. Direct port |
| **Existing Dependency** | `RowIndicator.tsx` is fully built with copy-to-clipboard, truncation, tooltips, and navigation arrows |
| **Width Impact** | Already truncates values with `max-w-[250px]`; may need to adjust to `max-w-full` for narrower panels |

### DF-04: Fill Progress Visible During Interaction

| Aspect | Detail |
|--------|--------|
| **Description** | When a fill operation is running, the Side Panel shows real-time step-by-step progress (e.g., "Filling 3/8 steps... Current: CPF field") while the user can see the form being filled on the page |
| **Value Proposition** | Side Panel enables split-screen workflow: progress panel on the right, live form on the left. Users can visually verify each step as it executes. Popup cannot do this because it closes when clicking on the page |
| **Complexity** | LOW -- Fill progress state already broadcasts via `FILL_PROGRESS` messages. FillControls already renders progress. The differentiation is that it is now VISIBLE during execution, which popup could not achieve |
| **Existing Dependency** | `FillControls.tsx`, `FILL_PROGRESS` message handling in App.tsx |
| **Width Impact** | Progress bar and step text fit in 320px. No changes needed |

### DF-05: Internal Collapsed Mode (Compact View)

| Aspect | Detail |
|--------|--------|
| **Description** | A toggle within the Side Panel that switches between full view (all controls) and a compact/minimal view showing only: current row identifier, fill button, and row navigation arrows. NOT a Chrome-level panel collapse -- the panel width stays the same, but the content minimizes |
| **Value Proposition** | When users are in a fill-and-advance loop and don't need to see step details, the compact view reduces visual clutter. Shows just enough to drive the workflow: who am I filling, trigger fill, go next |
| **Complexity** | MEDIUM -- Requires a new compact layout component and a toggle mechanism. State for "compact vs full" persisted in storage. Content remains within the same Side Panel width |
| **Important Note** | Chrome does NOT support a thin/collapsed Side Panel (~50px icon strip) at the API level. There is no API to control Side Panel width. The user controls width via drag-resize. An "icon strip" mode must be implemented as CSS within the full panel width, meaning the Chrome panel itself stays at its current width but the content renders as a narrow strip with whitespace. This is suboptimal and likely confusing. Recommend: skip the icon strip pattern and use an internal compact view instead |
| **Width Impact** | Compact view works well at any width. Full view needs all current components |
| **Confidence** | MEDIUM -- No Chrome API for width control per [chromium-extensions discussion](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/UcHL2GmjHiI). Internal compact mode is a custom implementation |

### DF-06: Capture Mode Visual Feedback Integration

| Aspect | Detail |
|--------|--------|
| **Description** | When Captura tab is active, elements on the page get hover highlights showing they are capturable. Clicking captures them and the step immediately appears in the Side Panel list. A visual pulse or animation on the new step draws attention |
| **Value Proposition** | The persistent Side Panel makes capture mode truly seamless: hover highlights on page, click to capture, see step in panel, configure immediately, click next element. No popup open/close dance. This is the primary motivation for the Side Panel migration |
| **Complexity** | LOW -- Capture mode highlighter and click handler exist in content script. Storage-based sync (writing step to `chrome.storage.session.capturedSteps`) works identically for Side Panel. The new step appears via `storage.onChanged` listener |
| **Existing Dependency** | `capture-mode.ts`, `highlighter.ts`, `badge-tracker.ts` in content script; `CapturePanel.tsx` with storage listeners |
| **Width Impact** | None -- capture feedback is on the page, not in the panel |

### DF-07: Quick Row History / Recent Fills

| Aspect | Detail |
|--------|--------|
| **Description** | In Preencher tab, a collapsible section showing the last 3-5 filled rows with their status (success, partial, failed). Clicking a row jumps back to it for re-fill or error correction |
| **Value Proposition** | When processing batches, users sometimes need to go back 1-2 rows to fix something they noticed after advancing. Currently requires manual Previous navigation. Quick history provides instant jump-back |
| **Complexity** | MEDIUM -- Requires tracking fill history in storage (array of {rowIndex, status, identifier, timestamp}). New UI component for the history list. Background needs to record each fill result |
| **Existing Dependency** | Row navigation (prev/next) exists. This adds indexed history on top |
| **Width Impact** | Compact list items (identifier + status badge) fit in 320px |

### DF-08: Keyboard Shortcuts for Power Workflow

| Aspect | Detail |
|--------|--------|
| **Description** | Global keyboard shortcuts while Side Panel is open: `Ctrl+Shift+F` to fill, `Ctrl+Shift+N` for next row, `Ctrl+Shift+P` for previous row. Side Panel receives keyboard focus via `F6` (Chrome built-in) |
| **Value Proposition** | Power users processing 50+ rows want keyboard-driven workflow. Fill-Next-Fill-Next without touching mouse on the Side Panel. Critical for volume users |
| **Complexity** | MEDIUM -- Chrome extensions can register commands in manifest. However, commands work globally, not just when Side Panel is focused. Need to validate that Side Panel is active before executing. F6/Shift-F6 for focus switching is built into Chrome |
| **Existing Dependency** | None -- new feature. Referenced in prior research as P2 priority |
| **Width Impact** | None -- keyboard shortcuts have no visual footprint (maybe a small hint in tooltips) |
| **Confidence** | MEDIUM -- keyboard focus behavior between Side Panel and page documented in [Chromium keyboard access](https://www.chromium.org/user-experience/keyboard-access/) |

---

## Anti-Features

Features that look good but hurt UX in the Side Panel context. Deliberately NOT building these.

### AF-01: Chrome-Level Collapsed/Icon-Strip Panel (~50px)

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | A thin vertical strip with just icons (fill, next, capture) that expands to full panel on click |
| **Why It Seems Good** | Minimizes screen real estate when not actively configuring. Similar to VS Code's activity bar |
| **Why Problematic** | Chrome provides NO API to control Side Panel width. The panel width is user-controlled via drag. An "icon strip" inside a 320px panel would mean ~270px of wasted whitespace next to a thin strip of icons. This looks broken, not compact. Furthermore, users can already resize the panel narrower by dragging |
| **What To Do Instead** | Implement an internal compact view (DF-05) where content simplifies but fills the available width. Or simply trust users to resize the panel themselves |
| **Confidence** | HIGH -- No width control API confirmed by [Chrome extensions samples issue #1011](https://github.com/GoogleChrome/chrome-extensions-samples/issues/1011), [chromium-extensions discussions](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/UcHL2GmjHiI) |

### AF-02: Auto-Opening Side Panel on Navigation

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | Side Panel automatically opens when user navigates to a URL that has a mapping defined |
| **Why It Seems Good** | Smart context-aware activation. User goes to target form, panel appears ready to fill |
| **Why Problematic** | `chrome.sidePanel.open()` may only be called in response to a user gesture (Chrome 116+). Automatic opening on navigation would require the background script to call open(), which Chrome blocks without user interaction. Even if it were possible, auto-opening is perceived as invasive and Chrome may reject extensions that do this |
| **What To Do Instead** | Show a subtle badge notification on the extension icon when user is on a mapped URL. Let the user click to open. Or use `setOptions()` to enable the panel specifically for mapped URLs (panel appears in Chrome's side panel menu but doesn't auto-open) |
| **Confidence** | HIGH -- [sidePanel.open() requires user gesture](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) |

### AF-03: Dual-Pane Side Panel (Split Capture + Fill)

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | Side Panel split vertically: top half shows capture mode, bottom half shows fill controls. Both visible simultaneously |
| **Why It Seems Good** | No tab switching needed. See everything at once |
| **Why Problematic** | At 320-400px width and typical screen height, a vertical split gives each pane ~250-300px height -- barely enough for either the step list or the fill controls alone. Both compressed creates a cramped, unusable interface. Google's own UX guidance says Side Panels should focus on a single purpose. Furthermore, capture and fill are sequential workflows, not simultaneous. Users capture a mapping first, then fill with it |
| **What To Do Instead** | Two tabs (DF-01) with full-height for each. Tabs are always one click away. The tab approach matches how users actually work: "I'm creating a mapping" then "I'm filling forms" |
| **Confidence** | HIGH -- [Chrome Side Panel UX blog](https://developer.chrome.com/blog/extension-side-panel-launch) recommends single-purpose focus |

### AF-04: Embedded Data Table in Side Panel

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | Full spreadsheet-like view of batch rows in the Side Panel, with columns, sorting, filtering |
| **Why It Seems Good** | Users can see all their data without switching to the dashboard |
| **Why Problematic** | A data table at 320px width is unusable. Even a 3-column table with headers would require horizontal scrolling or extreme truncation. Tables are the worst possible UI element for narrow viewports. Also introduces data editing temptation (AF-05) |
| **What To Do Instead** | Show single-row context (DF-03): current row identifier and key values. For full data view, link to dashboard. The Side Panel is for execution, the dashboard is for data management |
| **Confidence** | HIGH -- standard narrow-viewport UX principles |

### AF-05: Inline Data Editing in Side Panel

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | Users can edit row data values directly in the Side Panel before filling |
| **Why It Seems Good** | Quick fixes without switching to dashboard |
| **Why Problematic** | Creates two sources of truth (dashboard data vs extension-edited data). Sync conflicts. Validation complexity. The extension is a form-FILLING tool, not a data management tool. As identified in prior research (FEATURES-extension.md AF), this creates more problems than it solves |
| **What To Do Instead** | Read-only display of current row values. "Edit in Dashboard" link for corrections. Data flows one-way: dashboard -> extension -> form |
| **Confidence** | HIGH -- architectural decision from prior research |

### AF-06: Drag-to-Map (Drag Column from Panel to Form Field)

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | User drags a column name from the Side Panel onto a form field to create a mapping step |
| **Why It Seems Good** | Intuitive visual metaphor. "Drag CNPJ column onto the CNPJ input" |
| **Why Problematic** | HTML drag-and-drop does not work across the extension/page boundary. The Side Panel is an isolated extension page; the form is in the content page. They are in different browsing contexts. Cross-context DnD would require complex content-script-mediated workarounds (fake drag overlay) and would be fragile. Also, the click-to-capture pattern already works well and is simpler |
| **What To Do Instead** | Keep click-to-capture pattern: user clicks element on page, step appears in panel, user selects source column in config. This is the existing flow and works reliably |
| **Confidence** | HIGH -- extension page and content page are separate contexts with no native DnD bridge |

### AF-07: Floating Side Panel (Detachable Window)

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | Option to "pop out" the Side Panel into a floating window that can be positioned anywhere |
| **Why It Seems Good** | Flexibility for multi-monitor setups. Some users may want the panel floating over another screen |
| **Why Problematic** | Chrome's Side Panel API does not support detaching to a separate window. The only way to achieve this is to open a new `chrome.windows.create()` popup window, which loses all Side Panel API integration (persistent across tabs, Chrome-managed open/close, etc.). It also doubles the communication complexity and state management burden |
| **What To Do Instead** | Trust Chrome's built-in Side Panel positioning (left or right side, user-resizable). For multi-monitor users, browser tab arrangement already handles this |
| **Confidence** | HIGH -- no detach API in sidePanel |

### AF-08: Complex Onboarding Tutorial in Side Panel

| Aspect | Detail |
|--------|--------|
| **What It Looks Like** | Multi-step onboarding walkthrough inside the Side Panel with coachmarks pointing at page elements |
| **Why It Seems Good** | Teach users the capture flow step by step |
| **Why Problematic** | Cross-context coachmarks (panel pointing to page elements) don't work across the extension/content boundary. Multi-step tutorials in a 320px panel are cramped and annoying. Users opening a tool for the first time want to get going, not read a tutorial |
| **What To Do Instead** | Contextual empty states with clear instructions (e.g., "Click elements on the page to capture steps" -- already in StepList). Brief tooltips on first use. Link to documentation/video in the dashboard |
| **Confidence** | MEDIUM -- based on general UX principles for narrow-viewport tools |

---

## Feature Dependencies

```
[Side Panel Entrypoint Registration]
    |--enables--> [Action Icon Toggle (TS-02)]
    |--enables--> [Persistent Visibility (TS-01)]
    |--enables--> [Content-Width Layout (TS-03)]

[Tab Architecture (DF-01)]
    |--requires--> [Side Panel Entrypoint]
    |--enables--> [Captura Tab]
    |--enables--> [Preencher Tab]

[Captura Tab]
    |--requires--> [Capture Mode Visual Feedback (DF-06)]
    |--requires--> [Clickable Steps List (DF-02)]
    |--requires--> [State Sync (TS-06)]
    |--contains--> [StepList, StepConfig, mapping name input]

[Preencher Tab]
    |--requires--> [Persistent Row Context (DF-03)]
    |--requires--> [Fill Progress Visible (DF-04)]
    |--requires--> [State Sync (TS-06)]
    |--contains--> [ProjectSelector, BatchSelector, MappingSelector, RowIndicator, FillControls]

[Compact View (DF-05)]
    |--requires--> [Preencher Tab] (compact view only applies to fill workflow)
    |--enhances--> [Keyboard Shortcuts (DF-08)] (compact + keyboard = power mode)

[Quick Row History (DF-07)]
    |--requires--> [Preencher Tab]
    |--requires--> [Fill tracking in background script]

[Keyboard Shortcuts (DF-08)]
    |--requires--> [Side Panel focus management (Chrome built-in F6)]
    |--enhances--> [Fill workflow efficiency]
```

### Migration Dependencies from Popup

```
[Existing Popup Code]
    |--extract to shared--> [Components: CapturePanel, StepList, StepConfig, FillControls, RowIndicator, selectors]
    |--extract to shared--> [State management: storage listeners, message handlers]
    |--extract to shared--> [API layer: already in src/ directory, no change needed]

[Side Panel Entry]
    |--imports--> [Shared components]
    |--adds--> [Tab bar wrapper]
    |--adds--> [Width-responsive container (w-full instead of w-[350px])]
```

---

## Width Constraint Deep Dive

Chrome Side Panel dimensions are NOT developer-controllable. Key facts:

| Property | Value | Source |
|----------|-------|--------|
| Default width | ~320px (varies by Chrome version) | [chromium-extensions discussion](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/xuk4ZuWTsBk) |
| Minimum width | ~280-300px (Chrome-enforced, not configurable) | [Chromium issue #40926440](https://issues.chromium.org/issues/40926440/dupes) |
| Maximum width | User-drag, limited by viewport | Chrome native behavior |
| Width API | NONE -- no programmatic control | [sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) |
| Resize method | User drags panel edge | Chrome native behavior |
| Position | Left or right side of browser window | User/Chrome controlled. `getLayout()` API available from Chrome 140+ |

### Width-Sensitive Existing Components

| Component | Current Width | Side Panel Compatibility | Action Needed |
|-----------|--------------|--------------------------|---------------|
| App container | `w-[350px]` fixed | Change to `w-full` | Replace fixed width with fluid |
| StepList items | Flexible with truncation | Compatible | None |
| StepConfig form | Full popup width | Compatible | None |
| Column dropdown | `w-full` within parent | Compatible | None |
| RowIndicator | `max-w-[250px]` for truncation | Adjust to `max-w-full` | Minor CSS tweak |
| FillControls buttons | `flex gap-2` | Compatible | None |
| Selector display | `break-all` in code block | Compatible | None |
| Mapping name input | `w-full` | Compatible | None |

### Layout Strategy

1. **Remove fixed width** -- Use `w-full min-w-0` on root container
2. **Trust Chrome's constraints** -- Don't try to enforce minimum width in CSS
3. **Test at 280px** -- The Chrome-enforced minimum. All content must be usable
4. **Test at 500px** -- Users who drag the panel wider should see content that fills gracefully
5. **Use `truncate` aggressively** -- Any text that might overflow (selectors, identifiers, column names)
6. **Stack, don't side-by-side** -- At 280-320px, horizontal button groups of 3+ should stack vertically

---

## Popup-to-Side-Panel Migration Strategy

### What Changes

| Aspect | Popup (Current) | Side Panel (Target) |
|--------|-----------------|---------------------|
| Lifecycle | Opens on click, closes on blur | Opens on click, stays open persistently |
| Width | Fixed 350px | Fluid, Chrome-managed (~320px default) |
| Height | Fixed 500px | Full browser height (minus toolbars) |
| Action icon behavior | Opens popup | Opens/closes Side Panel |
| Component mount/unmount | Every open/close | Once per session (or tab change) |
| State restoration | Every mount (from storage) | Once on first open |
| Content script messaging | Works via runtime/tabs | Identical -- same APIs |
| `window.close()` | Closes popup | Closes Side Panel |

### What Stays The Same

- All React components (CapturePanel, StepList, StepConfig, FillControls, RowIndicator, selectors)
- API layer (`src/api/*`)
- Storage layer (`src/storage/*`)
- Messaging layer (`src/messaging/*`)
- Content scripts (`src/content/*`)
- Background service worker (mostly)
- State management patterns (chrome.storage.session + message passing)

### WXT Entrypoint Setup

WXT supports Side Panel via file convention. Create `entrypoints/sidepanel/index.html` (or `entrypoints/sidepanel.html`). WXT automatically:
- Adds `sidePanel` permission to manifest
- Configures `side_panel.default_path`
- Bundles the entry as a separate page

The `wxt.config.ts` manifest needs `action: {}` (empty, no default_popup).

---

## API Capabilities Summary (Chrome sidePanel)

| Method | Since | Key Constraint |
|--------|-------|----------------|
| `sidePanel.open()` | Chrome 116 | MUST be called in response to user gesture |
| `sidePanel.close()` | Chrome 141 | No-op if already closed. Resolves promise on close |
| `sidePanel.setOptions()` | Chrome 114 | Set path, enabled status. Tab-specific with `tabId` |
| `sidePanel.getOptions()` | Chrome 114 | Query current panel config |
| `sidePanel.setPanelBehavior()` | Chrome 114 | `openPanelOnActionClick` boolean |
| `sidePanel.getPanelBehavior()` | Chrome 114 | Query current behavior config |
| `sidePanel.getLayout()` | Chrome 140 | Returns left/right position |

### Popup Coexistence Pattern

If Populatte needs BOTH popup and Side Panel:

1. **Option A (Recommended):** Remove popup entirely. Side Panel becomes the only UI surface. Simpler architecture.
2. **Option B:** Keep popup for quick actions (e.g., status check, open Side Panel button). Use popup as a launcher that calls `sidePanel.open()` and then `window.close()`. Popup opens on action click, Side Panel opens via a button inside popup. More complex but preserves quick-glance capability.
3. **Option C:** Use context menu or keyboard shortcut to toggle between popup and Side Panel. Most complex, least discoverable.

**Recommendation:** Option A. The Side Panel replaces the popup entirely. All current popup functionality moves to the Side Panel. The action icon click toggles the Side Panel. This is the simplest architecture and avoids the "which one should I open?" confusion.

---

## MVP Recommendation for Side Panel

### Must Build (Phase 1)

1. **Side Panel entrypoint** (TS-01, TS-02) -- WXT sidepanel entry, action icon toggle
2. **Two-tab architecture** (DF-01) -- Captura / Preencher tabs
3. **Port all existing components** (TS-03, TS-04) -- Fluid width, scroll handling
4. **State sync validation** (TS-06) -- Verify storage + messaging works from Side Panel context
5. **Mode indicators** (TS-05, TS-07) -- Clear visual feedback

### Should Build (Phase 2)

6. **Persistent row context** (DF-03) -- Enhanced RowIndicator for Side Panel
7. **Fill progress during execution** (DF-04) -- Visible while interacting with page
8. **Compact view toggle** (DF-05) -- Simplified Preencher mode

### Defer

9. **Quick row history** (DF-07) -- After fill workflow is validated in Side Panel
10. **Keyboard shortcuts** (DF-08) -- After basic Side Panel workflow is solid

---

## Sources

### Official Chrome Documentation (HIGH confidence)
- [chrome.sidePanel API reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Create a Side Panel](https://developer.chrome.com/docs/extensions/develop/ui/create-a-side-panel)
- [Design a superior UX with Side Panel API](https://developer.chrome.com/blog/extension-side-panel-launch)
- [Chrome message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Chrome keyboard accessibility](https://www.chromium.org/user-experience/keyboard-access/)

### WXT Framework (HIGH confidence)
- [WXT entrypoints documentation](https://wxt.dev/guide/essentials/entrypoints.html)
- [WXT Side Panel template](https://github.com/evanlong-me/sidepanel-extension-template)

### Community Discussions (MEDIUM confidence)
- [Side Panel minimum width discussion](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/xuk4ZuWTsBk)
- [Programmatic width control request](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/UcHL2GmjHiI)
- [sidePanel.close() and toggle() W3C discussion](https://github.com/w3c/webextensions/issues/521)
- [Allow per-extension minimum width](https://issues.chromium.org/issues/378404989)
- [Setting sidePanel default width](https://github.com/GoogleChrome/chrome-extensions-samples/issues/1011)
- [Side Panel autofocus and keyboard focus](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/nb058-YrrWc)
- [Side Panel content interaction patterns](https://dev.to/jgrisafe/interacting-with-web-content-using-chromes-new-side-panel-extension-feature-4ock)
- [Chrome Side Panel reflections](https://annjose.com/post/chrome-side-panel/)

### Existing Populatte Research (HIGH confidence)
- `.planning/research/FEATURES-extension.md` -- Prior extension feature research
- Current popup codebase: `apps/extension/entrypoints/popup/`

---
*Feature research for: Chrome Side Panel UX and Patterns*
*Researched: 2026-02-05*
