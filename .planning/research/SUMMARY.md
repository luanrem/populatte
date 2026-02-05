# Project Research Summary

**Project:** Populatte v5.1 -- Side Panel & UX Improvements
**Domain:** Chrome Extension (Manifest V3) Side Panel Integration for Automated Form-Filling
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

Populatte v5.1 migrates the primary extension UI from a popup to Chrome's Side Panel API, solving the fundamental UX bottleneck of v4.0: the popup closes whenever the user clicks on the web page, breaking both capture and fill workflows. The Side Panel stays open persistently across page interactions and tab switches, enabling seamless click-to-capture mapping creation and real-time fill progress visibility. Research confirms that the existing stack (WXT 0.20.13, React 19, Tailwind CSS 4, chrome.storage, message passing) fully supports this migration with zero new dependencies. WXT auto-detects `entrypoints/sidepanel/` and generates all manifest entries (`sidePanel` permission, `side_panel.default_path`).

The recommended approach is to replace the popup entirely with the Side Panel as the sole UI surface. The action icon click toggles the Side Panel via `setPanelBehavior({ openPanelOnActionClick: true })`. All existing popup components (CapturePanel, StepList, FillControls, RowIndicator, selectors) are presentation-only and can be extracted to `src/components/` for reuse. The Side Panel introduces a two-tab architecture (Captura / Preencher) that explicitly separates mapping creation from form filling. A shared `useExtensionState` hook replaces the duplicated state management currently embedded in the popup's App.tsx. Chrome's Side Panel width is fixed at ~320px default (user-resizable, no programmatic control), which is compatible with the existing popup components designed for 350px.

The critical risks are: (1) Side Panel persistence causes stale state on tab switches -- the panel does not unmount/remount like the popup, so a `useTabAwareState` hook must detect `tabs.onActivated` events from day one; (2) `chrome.runtime.sendMessage` broadcasts reach ALL extension pages simultaneously, so both popup and Side Panel process the same message -- the broadcast protocol needs a `target` field to prevent duplicate processing; (3) no native close event exists before Chrome 142 -- use `runtime.connect` port pattern for lifecycle detection and service worker keepalive; (4) the `default_popup` manifest entry suppresses `action.onClicked`, making `openPanelOnActionClick` ineffective -- must remove the popup entrypoint or use it as a launcher that calls `sidePanel.open()` via background. All four risks have documented prevention strategies with LOW-MEDIUM recovery cost if addressed in the foundation phase.

## Key Findings

### Recommended Stack

Zero new packages are required. The existing extension stack fully supports Side Panel integration.

**Core technologies (unchanged):**
- **WXT 0.20.13**: Auto-generates `sidePanel` permission and `side_panel.default_path` from `entrypoints/sidepanel/` directory convention
- **React 19.2.0**: Same React setup for Side Panel as popup -- `ReactDOM.createRoot` in `entrypoints/sidepanel/main.tsx`
- **Tailwind CSS 4**: Styling with `w-full` instead of popup's `w-[350px]` fixed width
- **@types/chrome 0.0.287**: Already includes `chrome.sidePanel` type definitions
- **chrome.storage API**: Same session/local storage for state; Side Panel persists so fewer restore cycles needed
- **lucide-react 0.555.0**: Same icons

**What NOT to add:**
- No framer-motion (Tailwind transitions suffice for expand/collapse, saves ~30KB)
- No @headlessui/react or @radix-ui/react-tabs (custom 30-line Tabs component is enough for 2 tabs)
- No shadcn/ui in extension (extension uses raw Tailwind intentionally)
- No zustand/jotai (chrome.storage + messages is the state system; adding a client library creates two sources of truth)
- No react-router (tab switching, not URL routing)

**Minimum Chrome version:** 116+ (for `sidePanel.open()`). Chrome stable is ~143+ as of Feb 2026, so this is a non-issue.

See: `.planning/research/STACK-sidepanel.md`

### Expected Features

**Must have (table stakes -- Phase 1-2):**
- TS-01: Persistent visibility during page interaction (the entire purpose of Side Panel)
- TS-02: Action icon toggle opens/closes Side Panel
- TS-03: Content-width-aware layout at ~320-400px, no horizontal scroll
- TS-04: Smooth scrolling for long step lists and dropdowns
- TS-05: Clear visual mode indicator (Captura vs Preencher tabs)
- TS-06: Bidirectional state sync between Side Panel and content script
- TS-07: Loading and error states for all async operations

**Should have (differentiators -- Phase 2-3):**
- DF-01: Two-tab architecture (Captura / Preencher) -- explicit separation of mapping creation vs fill workflow
- DF-02: Clickable steps list with element highlighting on page (already implemented, direct port)
- DF-03: Persistent row context display (RowIndicator always visible during fill)
- DF-04: Fill progress visible during form interaction (the killer improvement over popup)
- DF-05: Internal compact view toggle (simplified Preencher mode for power fill-and-advance loops)
- DF-06: Capture mode visual feedback integration (hover highlights + instant step appearance)

**Defer (v2+):**
- DF-07: Quick row history / recent fills (needs fill tracking infrastructure)
- DF-08: Keyboard shortcuts for power workflow (needs Side Panel focus management validation)

**Anti-features (deliberately NOT building):**
- Chrome-level collapsed/icon-strip panel (no width API; whitespace looks broken)
- Auto-opening Side Panel on navigation (user gesture required; invasive UX)
- Dual-pane split layout (cramped at 320px; capture and fill are sequential, not simultaneous)
- Embedded data table (unusable at 320px; dashboard is for data management)
- Inline data editing (two sources of truth; extension is for filling, not editing)
- Drag-to-map (no DnD across extension/page boundary; click-to-capture works)
- Floating detachable window (no API; doubles communication complexity)

See: `.planning/research/FEATURES-sidepanel.md`

### Architecture Approach

The Side Panel integrates as a fourth extension context alongside the existing popup, background service worker, and content script. It communicates with background using the identical `chrome.runtime.sendMessage()` API -- the existing `sendToBackground()` and `broadcast()` functions work without modification. The key architectural decision is component extraction: all 12 popup components (ConnectView, ProjectSelector, BatchSelector, MappingSelector, RowIndicator, FillControls, CapturePanel, StepList, StepConfig, CodeInputForm, ConnectedIndicator, ErrorInput) move to `src/components/` as shared code. A `useExtensionState` hook extracts the state management pattern from popup's App.tsx, consumed by both surfaces. The Side Panel adds a `useTabAwareState` hook that listens for `tabs.onActivated` and `tabs.onUpdated` to handle persistent-panel stale state.

**Major components:**
1. **Side Panel Entrypoint** (`entrypoints/sidepanel/`) -- React app with two-tab layout (Captura/Preencher), fluid width, full browser height
2. **Shared Components** (`src/components/shared/` + `src/components/capture/`) -- All existing popup components extracted for dual-surface reuse
3. **Shared Hooks** (`src/hooks/`) -- `useExtensionState` (state + actions), `useTabAwareState` (tab switch detection), `useContainerWidth` (responsive layout)
4. **Background Additions** -- `OPEN_SIDE_PANEL` message handler, `setPanelBehavior` on install, port-based lifecycle detection with heartbeat
5. **Message Protocol Update** -- `target` field added to broadcasts (`'sidepanel' | 'popup' | 'all'`), `UIToBackgroundMessage` alias for renamed union type

**Popup disposition:** Two viable options. Option A (recommended): Remove popup entirely, Side Panel is sole UI. Option B: Keep popup as launcher with "Open Side Panel" button. Research recommends Option A for architectural simplicity. If Option B is chosen, the popup becomes a minimal launcher that delegates to `sidePanel.open()`.

See: `.planning/research/ARCHITECTURE-sidepanel.md`

### Critical Pitfalls

1. **Action Click Conflict (CP-01)** -- `default_popup` suppresses `action.onClicked`, making `openPanelOnActionClick` silently ineffective. Prevention: Choose one icon-click behavior. If Side Panel is primary, remove popup entrypoint or clear `default_popup` dynamically.

2. **Stale State on Tab Switch (MP-02)** -- Side Panel does NOT unmount on tab switch. React state from Tab A persists when viewing Tab B. Prevention: `useTabAwareState` hook with `tabs.onActivated` listener and `document.visibilitychange` re-sync. This is the highest-impact pitfall for Populatte because the fill workflow is inherently tab-specific.

3. **No Close Event Pre-Chrome 142 (CP-03)** -- Background cannot detect Side Panel closure, leaving capture mode active with no controlling UI. Prevention: `runtime.connect` port pattern -- port disconnect signals panel close, triggers cleanup. Also serves as service worker keepalive.

4. **Broadcast Reaches Both Surfaces (CP-04)** -- `runtime.sendMessage` delivers to all extension pages. Both popup and Side Panel process `STATE_UPDATED`, causing duplicate reactions. Prevention: Add `target` field to message protocol, check before processing.

5. **Service Worker Idle Termination (MP-05)** -- Side Panel being open does NOT keep the service worker alive. After 30 seconds of no API calls, the worker terminates. Prevention: Port heartbeat every 25 seconds via the lifecycle port connection.

See: `.planning/research/PITFALLS-sidepanel.md`

## Implications for Roadmap

Based on combined research, the migration naturally divides into 4 phases ordered by dependency and risk reduction.

### Phase 1: Side Panel Foundation

**Rationale:** All 4 critical pitfalls (CP-01 through CP-04) must be resolved in the foundation phase before any UI work begins. This phase establishes the infrastructure: entrypoint, lifecycle detection, message protocol update, and popup disposition decision.

**Delivers:**
- WXT sidepanel entrypoint (`entrypoints/sidepanel/index.html`, `main.tsx`, minimal `App.tsx`)
- Manifest with `sidePanel` permission (auto-generated by WXT)
- `setPanelBehavior({ openPanelOnActionClick: true })` in background `onInstalled`
- `runtime.connect` port pattern for lifecycle detection + service worker keepalive heartbeat
- `target` field added to broadcast message protocol
- `OPEN_SIDE_PANEL` message handler in background (if keeping popup as launcher)
- Smoke test: Side Panel opens, receives `GET_STATE`, displays basic content

**Addresses features:** TS-01 (persistent visibility), TS-02 (action icon toggle)
**Avoids pitfalls:** CP-01 (action click conflict), CP-03 (no close event), CP-04 (broadcast duplication), MP-05 (service worker keepalive)

### Phase 2: Component Extraction + Shared Hooks

**Rationale:** All 12 popup components need to be reusable before the Side Panel UI can be built. The `useExtensionState` hook is the single most impactful refactor -- it eliminates code duplication between popup and Side Panel. The `useTabAwareState` hook must exist from the first render to prevent stale state (MP-02).

**Delivers:**
- `src/components/shared/` -- ConnectView, ProjectSelector, BatchSelector, MappingSelector, RowIndicator, FillControls, ErrorInput, ConnectedIndicator, CodeInputForm
- `src/components/capture/` -- CapturePanel, StepList, StepConfig
- `src/hooks/useExtensionState.ts` -- state loading, message listening, action dispatchers
- `src/hooks/useTabAwareState.ts` -- tab activation + URL change + visibility re-sync
- Updated popup imports (backward compatibility via re-exports)
- Popup regression verification

**Addresses features:** TS-06 (state sync), TS-03 (width-aware layout -- remove fixed `w-[350px]`)
**Avoids pitfalls:** MP-02 (stale state on tab switch), MP-03 (storage.onChanged missed when hidden), mP-02 (import path confusion)

### Phase 3: Side Panel Core UI

**Rationale:** With shared components and hooks available, build the complete Side Panel interface. The two-tab architecture is the central UX decision. This phase delivers the full capture and fill workflows inside the persistent panel.

**Delivers:**
- Two-tab layout (Captura / Preencher) with tab bar component
- Captura tab: CapturePanel with inline step configuration, real-time step list updates during capture
- Preencher tab: Project/Batch/Mapping selectors, RowIndicator, FillControls with live progress
- Fluid `w-full min-w-0` layout that works at 280-500px+ widths
- Auth flow (ConnectView) adapted for Side Panel
- Popup disposition: either removed entirely or reduced to minimal launcher

**Addresses features:** DF-01 (two-tab architecture), DF-02 (clickable steps with highlighting), DF-03 (persistent row context), DF-04 (fill progress during interaction), DF-06 (capture mode visual feedback), TS-04 (smooth scrolling), TS-05 (mode indicators), TS-07 (loading/error states)
**Avoids pitfalls:** MP-01 (design within width constraints), mP-03 (CSS conflicts with popup), mP-04 (no auto-open assumption), mP-05 (position-agnostic UI)

### Phase 4: Polish + Side Panel-Specific Enhancements

**Rationale:** With the core Side Panel working, add features that specifically leverage its persistent nature. Compact view, row history, and keyboard shortcuts are power-user features that build on top of the stable foundation.

**Delivers:**
- Internal compact view toggle (DF-05) -- simplified Preencher showing only row context, fill button, and navigation
- Width-responsive layout via `useContainerWidth` with `ResizeObserver`
- Memory management: lazy-load tab content, proper cleanup for persistent lifecycle (PERF-01)
- Keyboard shortcuts (DF-08) if validated
- Quick row history (DF-07) if fill tracking is in place
- Per-tab panel enable/disable via `setOptions({ tabId, enabled })` for mapped URLs (optional)

**Addresses features:** DF-05 (compact view), DF-07 (row history), DF-08 (keyboard shortcuts)
**Avoids pitfalls:** PERF-01 (memory footprint), MP-04 (setOptions race condition), MP-06 (window.close scope)

### Phase Ordering Rationale

- **Phase 1 before all others:** The 4 critical pitfalls (action click conflict, close event detection, broadcast duplication, service worker keepalive) are all infrastructure concerns that, if discovered later, require retroactive changes to every component.
- **Phase 2 before Phase 3:** Building Side Panel UI on top of duplicated components creates divergence from day one. Extract first, build second.
- **Phase 3 is the core delivery:** This is where the user-facing value materializes. The two-tab architecture, persistent capture mode, and live fill progress are the reasons for v5.1.
- **Phase 4 is enhancement:** MVP is complete after Phase 3. Phase 4 adds polish for power users.

**Dependency graph:**
```
Phase 1 (Foundation: entrypoint, lifecycle, messages)
    |
    v
Phase 2 (Extraction: shared components, hooks)
    |
    v
Phase 3 (Core UI: tabs, capture, fill workflows)
    |
    v
Phase 4 (Polish: compact view, keyboard shortcuts, memory management)
```

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1:** Research the exact popup disposition (remove vs launcher). Test `openPanelOnActionClick` behavior with the existing WXT popup entrypoint present. Verify `runtime.connect` port disconnect timing.
- **Phase 3:** Test width rendering at Chrome's enforced minimum (~280px). Validate that capture mode `storage.onChanged` listeners fire reliably in the persistent Side Panel context.

**Phases with standard patterns (skip research):**
- **Phase 2:** Component extraction is a mechanical refactoring operation. Import path resolution in WXT is well-documented.
- **Phase 4:** `ResizeObserver`, lazy loading, and keyboard shortcuts are all standard web patterns with no Chrome-specific unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies. WXT sidepanel entrypoint verified via official docs and template repos. `@types/chrome` already includes `sidePanel` types. Chrome Side Panel API stable since Chrome 114 (May 2023). |
| Features | **HIGH** | Table stakes derived from Chrome's official Side Panel UX guidance and extension best practices. Anti-features confirmed by API limitations (no width control, no cross-context DnD, user gesture required for open). Feature dependencies are clear and linear. |
| Architecture | **HIGH** | Popup/Side Panel coexistence verified via Chrome docs and manifest reference. Communication via `runtime.sendMessage` confirmed identical for both contexts. WXT file-based entrypoint routing verified. Component sharing pattern is a standard React refactor. |
| Pitfalls | **HIGH** | All 4 critical pitfalls verified via official Chrome docs, Chromium bug trackers, and community reports with confirmed workarounds. The `runtime.connect` port pattern for lifecycle detection is widely documented. Stale state on tab switch confirmed via Edge/Chrome developer forums. |

**Overall confidence:** **HIGH**

### Gaps to Address

- **Popup disposition decision:** Research presents two valid options (remove popup vs keep as launcher). This is a UX decision that should be finalized before Phase 1 implementation. Recommendation: remove popup entirely for simplicity, but validate with product stakeholders.

- **WXT auto-generation verification:** Research confirms WXT should auto-add `sidePanel` permission and `side_panel.default_path` from the entrypoint directory. However, WXT issue #1611 notes `import.meta.env.ENTRYPOINT` is undefined in side panel context. Verify build output immediately after creating the entrypoint in Phase 1.

- **`tabs` permission requirement:** The current manifest has `activeTab` but not `tabs`. The `useTabAwareState` hook needs `tabs.onActivated` and `tabs.onUpdated` listeners, which may require the `tabs` permission. The existing background script already uses `tabs.onUpdated` with `host_permissions: ['<all_urls>']`, so this may already be covered. Verify during Phase 1.

- **Port heartbeat vs Chrome's actual idle timeout:** Research states 30-second idle timeout, but Chrome has been extending service worker lifetimes. Test whether the port connection alone (without explicit heartbeat messages) keeps the service worker alive. If so, the heartbeat interval can be removed.

- **Memory footprint baseline:** Side Panel persists for hours unlike the popup's brief lifecycle. No baseline memory data exists for the current components running persistently. Establish a memory budget during Phase 3 and monitor with Chrome Task Manager.

## Sources

### Primary (HIGH confidence)

**Chrome Extension Official Documentation:**
- [chrome.sidePanel API Reference](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Create a Side Panel](https://developer.chrome.com/docs/extensions/develop/ui/create-a-side-panel)
- [Design a superior UX with Side Panel API](https://developer.chrome.com/blog/extension-side-panel-launch)
- [chrome.action API](https://developer.chrome.com/docs/extensions/reference/api/action)
- [Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Longer Extension Service Worker Lifetimes](https://developer.chrome.com/blog/longer-esw-lifetimes)

**WXT Framework Documentation:**
- [WXT Entrypoints Guide](https://wxt.dev/guide/essentials/entrypoints.html)
- [WXT SidepanelEntrypointOptions API](https://wxt.dev/api/reference/wxt/interfaces/sidepanelentrypointoptions)

**Populatte Codebase Analysis:**
- `apps/extension/wxt.config.ts` -- Current manifest configuration
- `apps/extension/entrypoints/background.ts` -- Current message handler pattern
- `apps/extension/src/types/messages.ts` -- Current message type system
- `apps/extension/src/messaging/send.ts` -- Current messaging infrastructure
- `apps/extension/entrypoints/popup/components/` -- Current component inventory

### Secondary (MEDIUM confidence)

**Community and GitHub:**
- [WXT Issue #570 - Open sidepanel on icon click](https://github.com/wxt-dev/wxt/issues/570)
- [WXT Issue #1611 - ENTRYPOINT undefined in sidepanel](https://github.com/wxt-dev/wxt/issues/1611)
- [Chrome Extensions Samples Issue #987 - Global panel leak](https://github.com/GoogleChrome/chrome-extensions-samples/issues/987)
- [Chrome Extensions Samples Issue #1011 - sidePanel width control](https://github.com/GoogleChrome/chrome-extensions-samples/issues/1011)
- [Chromium Issue #378404989 - Per-extension minimum width](https://issues.chromium.org/issues/378404989)
- [Edge Side Panel stale state across tabs](https://learn.microsoft.com/en-us/answers/questions/1642972/edge-extension-side-panel-populating-same-data-to)
- [Side Panel setOptions race condition](https://learn.microsoft.com/en-us/answers/questions/2148171/side-panel-opens-with-stale-configuration-despite)
- [Simulating Side Panel close event](https://dev.to/latz/chrome-side-panel-simulate-close-event-354h)
- [W3C WebExtensions - sidePanel lifecycle events #517](https://github.com/w3c/webextensions/issues/517)

**Chromium Extensions Group Discussions:**
- [Side Panel minimum width](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/xuk4ZuWTsBk)
- [Programmatic width control](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/UcHL2GmjHiI)
- [storage.onChanged not received when hidden](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/PoNIOuFdY28)
- [How to close the Chrome SidePanel](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/YAfMKV-GN4I)

### Tertiary (LOW confidence -- needs validation)

- [Chrome Side Panel Reflections](https://annjose.com/post/chrome-side-panel/) -- Individual developer blog
- [Interacting with web content using Side Panel](https://dev.to/jgrisafe/interacting-with-web-content-using-chromes-new-side-panel-extension-feature-4ock) -- Community tutorial

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
