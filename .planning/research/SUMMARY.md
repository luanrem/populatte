# Project Research Summary

**Project:** Populatte v4.0 Extension Core
**Domain:** Chrome Extension (Manifest V3) for Automated Form-Filling
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

Populatte v4.0 introduces the Chrome Extension MVP with COPILOTO mode, enabling automated form-filling from Excel data. Research reveals that **WXT (not CRXJS as originally specified)** is the recommended build framework in 2026, offering superior developer experience, built-in storage/messaging abstractions, and active maintenance. The extension architecture centers on three isolated contexts: Service Worker (state orchestration + API proxy), Popup (React UI), and Content Script (DOM manipulation).

The recommended approach follows Chrome's event-driven MV3 architecture: Service Worker handles all API communication and state management (via chrome.storage.session/local), Popup is stateless (derives state from Service Worker messages), and Content Script is ephemeral (receives step-by-step instructions). Critical success factors include: (1) never storing state in Service Worker global variables (30-second termination risk), (2) registering all event listeners synchronously at top level, (3) using native property setters for React/Vue form compatibility, and (4) routing all API calls through Service Worker to avoid CORS.

Key risks center on Service Worker lifecycle management (state loss on termination), React framework compatibility (standard value assignment doesn't trigger reactivity), and SPA navigation detection (history.pushState doesn't fire standard events). Mitigation follows established patterns: chrome.storage for persistence, native setters + event dispatching for forms, and webNavigation.onHistoryStateUpdated for SPAs. The architecture is well-documented with high confidence—Manifest V3 is mature (2023 stable), form automation patterns are established, and pitfalls are known from community experience.

## Key Findings

### Recommended Stack

**Core Framework Decision:** WXT 0.20.13 (Dec 2025 release) wins over CRXJS due to built-in @wxt-dev/storage and messaging APIs, HMR for service workers, and file-based manifest generation. While CRXJS remains actively maintained, WXT reduces boilerplate significantly for storage and message passing—critical for extension reliability.

**Core technologies:**
- **WXT 0.20.13**: Extension build framework — best-in-class DX, active maintenance, built-in abstractions for storage/messaging, HMR for all contexts
- **React 19.2.0**: Popup UI — consistency with existing web app, fully supported via @wxt-dev/module-react
- **@wxt-dev/storage 1.2.6**: State persistence — type-safe wrapper for chrome.storage, critical for popup state restoration
- **TypeScript 5.x**: Type safety across contexts — WXT provides excellent TS support with auto-imports
- **Tailwind CSS 4.1.18**: Popup styling — consistency with web app, v4 simplified setup
- **@tanstack/react-query 5.90.20**: API caching in popup — same pattern as web app
- **chrome.storage API**: State management — session (ephemeral) for current selections, local (persistent) for auth tokens
- **Clerk Extension Auth**: Authentication — OAuth via launchWebAuthFlow, handles token refresh

**Supporting libraries:**
- **@types/chrome 0.1.36**: Chrome API types (updated Jan 2026 with MV3 promise types)
- **Lucide React 0.555.0**: Icons (matches web app)
- **Zod 4.3.6**: Runtime validation (matches web app, validate API responses)

**Critical dependencies NOT needed:**
- No state management library (chrome.storage + React Query sufficient)
- No routing library (popup is single-page)
- No complex build config (WXT handles it)

### Expected Features

**Must have (table stakes):**
- Project/Batch Selection — users need to choose which data to use (dropdown/list in popup)
- Form Fill Trigger — core value prop, one-click form population (execute steps via content script)
- Visual Fill Progress — users expect feedback during automation (step-by-step indicator + badge)
- Success/Failure Feedback — industry standard for automation tools (toast/status after fill)
- Row Navigation (Next/Previous) — batch processing requires moving between records
- Connection Status Indicator — users need to know if extension can talk to API (red/green indicator)
- Manual Login Flow — authentication required for API access (Clerk integration)
- Step Execution Feedback — users need to see what's being filled (highlight current field)
- Error Recovery Options — when fill fails, users need recourse (retry, skip, manual fallback)
- State Persistence — popup closes on click-away, must remember context (chrome.storage.local)

**Should have (competitive):**
- Mapping Auto-Detection — know when user is on a mapped target URL (compare tab URL with mappings)
- Step-Level Retry — retry individual failed steps without restarting entire fill
- Field Highlighting — visual feedback showing which field is being filled (content script injects styles)
- Keyboard Shortcuts — power users expect keyboard-driven workflow (Ctrl+Shift+F to fill)
- Batch Progress Summary — overview of completed/remaining/failed rows (counter in popup header)
- Pause/Resume Fill — stop mid-fill for manual intervention (state machine in content script)
- Success Trigger Detection — auto-advance when form submission detected (use Mapping.successTrigger)
- Selector Fallback Chain — robust element finding when DOM varies (already in Step.selectorFallbacks)
- Optional Step Handling — skip non-critical steps gracefully (already in Step.optional flag)
- Clear Before Fill — handle pre-populated fields (already in Step.clearBefore flag)

**Defer (v2+):**
- Auto-Record Mapping Mode — "Let me click fields and create mappings" (core complexity, defer to dashboard UI)
- AI Field Detection — "Automatically figure out what goes where" (unreliable without training data)
- Full Sidebar UI — "Extension always visible" (significant maintenance burden, use popup for MVP)
- Multi-Tab Orchestration — "Fill forms in multiple tabs simultaneously" (race conditions, confusing UX)
- Offline Mode — "Work without internet" (data sync complexity, cache invalidation)
- Direct Data Editing — "Let me fix data in the extension" (sync conflicts, two sources of truth)
- Undo Fill — "Revert the form to previous state" (requires DOM state capture, significant complexity)
- Background Auto-Fill — "Fill forms automatically when I open pages" (invasive UX, user loses control)

### Architecture Approach

The extension follows MV3's enforced separation of concerns across three execution contexts. Service Worker acts as the orchestrator: handles all API communication (Bearer token auth to NestJS backend), manages session state (chrome.storage.session for current project/batch/row), and routes messages between Popup and Content Script. Popup is stateless: derives all state from Service Worker broadcasts, sends commands via chrome.runtime.sendMessage, and restores context on every open from storage. Content Script is ephemeral: receives step-by-step instructions from Service Worker, executes DOM manipulation (fill/click/wait/verify actions), and reports results back.

**Major components:**
1. **Service Worker (background/index.ts)** — API client with token management, session state orchestration via chrome.storage, message handler registry for Popup/Content Script communication, fill flow coordinator (fetch mapping → fetch steps → send to content script → update row status)
2. **Popup (React UI)** — Project/Batch/Row selectors (droppers from API via Service Worker), Fill control button (triggers FILL_START message), Status indicator (connection + fill progress), useExtensionState hook (subscribes to Service Worker broadcasts), message sender utilities (type-safe requests)
3. **Content Script (content/index.ts)** — Step executor (processes fill/click/wait/verify actions), Selector resolver (CSS/XPath with fallback chain + shadow DOM traversal), Action implementations (fill with native setters for React compatibility, click, wait, verify), Success observer (MutationObserver for form submission detection)

**Critical integration points:**
- Popup ↔ Service Worker: chrome.runtime.sendMessage (request/response) + STATE_UPDATE broadcasts
- Service Worker ↔ Content Script: chrome.tabs.sendMessage (instructions down, results up)
- Service Worker ↔ Storage: chrome.storage.session (ephemeral state), chrome.storage.local (persistent token)
- Service Worker ↔ API: fetch with Bearer token (proxies calls for Content Script to avoid CORS)

**Data flow for fill operation:**
1. User clicks Fill in Popup → FILL_START message to Service Worker
2. Service Worker fetches mapping by current tab URL → fetches steps for mapping
3. Service Worker sends EXECUTE_STEPS message to Content Script with steps + row data
4. Content Script executes each step (resolve selector → execute action → dispatch events)
5. Content Script reports FILL_RESULT to Service Worker (success/partial/failed)
6. Service Worker updates row status via API → broadcasts STATE_UPDATE to Popup
7. Popup shows success message + auto-advances to next row (if enabled)

### Critical Pitfalls

1. **Service Worker State Loss on Termination** — Chrome terminates service workers after 30 seconds idle. ALL in-memory state (global variables, pending operations, connection references) is lost. Auth tokens in variables disappear, operations abort mid-execution. Prevention: NEVER use global variables for state. Use chrome.storage.session for ephemeral data (current selections), chrome.storage.local for persistent data (auth tokens). Re-establish state on wake via chrome.runtime.onStartup/onInstalled listeners (registered synchronously at top level).

2. **Asynchronous Event Listener Registration** — Listeners registered inside promises/callbacks are NOT guaranteed to work. Service worker wakes to handle event, but async code hasn't completed registration yet. Event fires into the void. Prevention: Register ALL event listeners synchronously at top level of service worker entry point. Async initialization can happen inside handlers. Code review must verify chrome.runtime.onMessage, chrome.webNavigation.onHistoryStateUpdated, etc. are at module scope.

3. **Content Script Cannot Access Page's JavaScript Context** — Content scripts run in isolated worlds—share DOM but NOT JavaScript context. Cannot read React state, call page functions, or access window variables. Standard input.value assignment doesn't trigger React controlled input updates. Prevention: Use native property setters to bypass React's descriptor (Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value)), then dispatch input/change events for framework reactivity.

4. **Message Passing Response Lost Without return true** — chrome.runtime.onMessage listeners must explicitly return true for async responses. Without it, Chrome closes message channel immediately. Content script sends message, service worker does async work, content script never receives response. Prevention: Every async message handler MUST return true to keep channel open for sendResponse callback.

5. **Popup State Resets on Every Open** — Popup HTML reloads completely on each open. All JavaScript state, selections, scroll positions lost. User selects project/batch, clicks away, reopens—must start over. Prevention: Persist popup state to chrome.storage.session on every change. Restore state on popup mount from storage. Consider sidebar panel (chrome.sidePanel) for persistent UI if popup limitations validated as problem.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency order dictated by MV3 architecture and integration patterns:

### Phase 1: Extension Foundation + WXT Setup
**Rationale:** Service Worker state management is foundational—all features depend on reliable persistence. Must establish patterns before any feature code. Message infrastructure enables all inter-context communication. Auth unlocks API access.

**Delivers:**
- WXT + React + TypeScript + Tailwind project scaffold
- Manifest V3 configuration (permissions, service worker, content script, popup)
- chrome.storage abstraction layer (session/local with type safety)
- Message protocol types (request/response with TypeScript unions)
- Service Worker message handler registry (synchronous top-level registration)
- Basic popup shell (React root, theme provider, placeholder UI)

**Addresses:**
- Stack: WXT 0.20.13, React 19.2.0, TypeScript, Tailwind CSS 4
- Pitfalls: Service Worker state loss (establish storage pattern), async event listener registration (enforce synchronous pattern)

**Avoids:**
- Pitfall 1 (state loss) — storage abstraction designed from start
- Pitfall 9 (localStorage unavailable) — chrome.storage from day one

### Phase 2: Authentication + API Integration
**Rationale:** Auth is the critical path—no API access without login. Service Worker API client pattern established here, used by all future features. CORS workaround (proxy through Service Worker) must be in place before content script tries to call API.

**Delivers:**
- Clerk OAuth integration (launchWebAuthFlow or offscreen document)
- Token storage (chrome.storage.local with encryption consideration)
- Service Worker API client (fetch wrapper with Bearer token, error handling)
- API endpoints used by extension (projects, batches, rows, mappings, steps)
- Connection status indicator in popup
- Auth flow UI (login button, status display, logout)

**Addresses:**
- Stack: Clerk extension auth, API client pattern, Zod validation for responses
- Features: Manual login flow, connection status indicator
- Pitfalls: Message passing async response (establish return true pattern), CORS in content script (API proxy pattern)

**Avoids:**
- Pitfall 4 (message response lost) — enforce return true in code review
- Pitfall 8 (content script CORS) — all API calls through Service Worker

**Uses:**
- Existing API endpoints: GET /projects, GET /batches, GET /rows, GET /mappings, GET /steps

### Phase 3: Popup UI + State Management
**Rationale:** User-facing controls for project/batch/row selection. State persistence pattern validated here (restore on popup open). Must work before form-filling can be triggered.

**Delivers:**
- Project selector (dropdown, fetch from API, persist to storage)
- Batch selector (dropdown, filtered by selected project)
- Row navigator (next/prev/jump controls, show current row data preview)
- Fill trigger button (sends FILL_START message, disabled if no selection)
- useExtensionState hook (subscribes to Service Worker STATE_UPDATE messages)
- Loading states, error handling, empty states

**Addresses:**
- Stack: React Query for API caching, chrome.storage for persistence
- Features: Project/Batch Selection, Row Navigation, State Persistence
- Pitfalls: Popup state resets (storage save/restore pattern)

**Avoids:**
- Pitfall 5 (popup state loss) — chrome.storage.session for all selections
- UX pitfall (no feedback) — loading skeletons, error messages

**Uses:**
- Service Worker API proxy established in Phase 2
- Message protocol from Phase 1

### Phase 4: Content Script + Selector Engine
**Rationale:** DOM manipulation layer. Selector resolution with fallback chain is complex—needs dedicated implementation before step execution. Shadow DOM support must be built in from start (high recovery cost if missed).

**Delivers:**
- Content script injection (matches <all_urls>, run_at document_idle)
- Selector resolver (CSS + XPath with fallback chain)
- Shadow DOM traversal (recursive shadowRoot querying)
- Native setter utility (React/Vue form compatibility)
- Event dispatching (input/change/blur for framework reactivity)
- SPA navigation detection (webNavigation.onHistoryStateUpdated + content script URL observer)
- Basic fill action (input/textarea/select support)

**Addresses:**
- Stack: Native DOM APIs, MutationObserver, webNavigation API
- Features: Step Execution Feedback (highlight current field), Selector Fallback Chain
- Pitfalls: Content script isolation (native setters), Shadow DOM blocking, SPA navigation missed

**Avoids:**
- Pitfall 3 (React forms don't update) — native property setters from start
- Pitfall 6 (shadow DOM blocks selectors) — recursive traversal built into engine
- Pitfall 7 (SPA navigation missed) — webNavigation.onHistoryStateUpdated listener

**Research flag:** Standard patterns (well-documented), but test on real target sites (government portals with shadow DOM).

### Phase 5: Step Execution + Fill Cycle
**Rationale:** Orchestrates full fill operation. Combines Service Worker coordination, Content Script actions, and API updates. Success detection enables auto-advance. Error recovery completes MVP.

**Delivers:**
- Service Worker fill orchestrator (fetch mapping by URL → fetch steps → send to content script → update row status)
- Content Script step executor (loop through steps, resolve selector, execute action, report results)
- Action implementations (fill, click, wait, verify)
- Success detection (MutationObserver for text_appears/element_disappears, URL change observer)
- Error handling (retry button, skip step option, manual fallback messaging)
- Fill progress UI (step count, current action, success/failure toast)
- Row status update (PATCH /rows/:rowId/status — NEW API endpoint needed)

**Addresses:**
- Stack: MutationObserver, chrome.alarms (if needed for long operations), Step entity from backend
- Features: Form Fill Trigger, Visual Fill Progress, Success/Failure Feedback, Error Recovery Options, Success Trigger Detection
- Pitfalls: Port disconnection (design for interruption, resumable operations)

**Avoids:**
- Pitfall 10 (port disconnection) — store progress, resume from last step if terminated
- UX pitfall (silent failures) — highlight unfilled fields, show error count

**Backend dependency:** Need to add PATCH /rows/:rowId/status endpoint to NestJS API.

**Research flag:** Skip research (step execution patterns well-documented from FEATURES/ARCHITECTURE research).

### Phase 6: Polish + Error Recovery
**Rationale:** MVP complete after Phase 5. This phase addresses nice-to-haves discovered during testing.

**Delivers:**
- Keyboard shortcuts (Ctrl+Shift+F to fill, Ctrl+Shift+N for next row)
- Field highlighting during fill (inject highlight styles to content script)
- Batch progress dashboard (15/50 complete, 2 failed counter in popup header)
- Step-level retry (per-step retry button in error state)
- Auto-advance on success (if successTrigger detected and user preference enabled)

**Addresses:**
- Features: Keyboard Shortcuts, Field Highlighting, Batch Progress Summary, Step-Level Retry, Auto-Advance on Success
- UX pitfalls: No visual feedback during fill, no progress indication for batches

### Phase Ordering Rationale

- **Phase 1 before all others:** Service Worker state management is foundational. Without reliable persistence, every feature will be brittle. Message protocol must exist before any cross-context communication.
- **Phase 2 before 3:** Auth unlocks API access. Popup needs API client to fetch projects/batches. API proxy pattern (CORS workaround) established here, used by content script later.
- **Phase 3 before 4:** User must select project/batch/row before content script can fill forms. Popup drives the workflow, content script executes instructions.
- **Phase 4 before 5:** Selector engine must exist before step executor can find elements. Shadow DOM support cannot be retrofitted—high recovery cost.
- **Phase 5 is integration:** Combines Service Worker (Phase 1-2), Popup (Phase 3), and Content Script (Phase 4) into end-to-end fill cycle.
- **Phase 6 is polish:** MVP complete without it, but improves UX based on testing feedback.

**Dependency graph:**
```
Phase 1 (Foundation)
    ├─→ Phase 2 (Auth + API)
    │       └─→ Phase 3 (Popup UI)
    └─→ Phase 4 (Content Script)
            │
            └─→ Phase 5 (Fill Cycle) ← also depends on Phase 3
                    └─→ Phase 6 (Polish)
```

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Content Script)** — Reason: Target sites unknown. May encounter exotic shadow DOM patterns, iframes, or JavaScript frameworks not covered in generic research. Plan to test on real government portals (e.g., Receita Federal, Detran) during implementation. If blockers found, trigger `/gsd:research-phase` for specific site compatibility.

**Phases with standard patterns (skip research):**
- **Phase 1 (Foundation)** — WXT setup documented, chrome.storage patterns established
- **Phase 2 (Auth + API)** — Clerk extension SDK documented, fetch patterns standard
- **Phase 3 (Popup UI)** — React + React Query standard, popup state persistence well-documented
- **Phase 5 (Fill Cycle)** — Step execution patterns already researched in FEATURES/ARCHITECTURE
- **Phase 6 (Polish)** — Incremental improvements, no unknowns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | WXT vs CRXJS comparison verified via 2025-2026 framework analyses. WXT 0.20.13 release confirmed (Dec 2025). Chrome storage/messaging patterns documented in official Chrome developer docs. React 19 + Tailwind CSS 4 compatibility verified. |
| Features | **HIGH** | Feature expectations derived from competitor analysis (LastPass, Autofillr, QuickForm) and Chrome extension UX best practices. Table stakes vs differentiators validated against industry standards. Anti-features based on common mistakes documented in community reports. |
| Architecture | **HIGH** | MV3 architecture enforced by Chrome (not optional). Service Worker lifecycle documented in official Chrome docs. Message passing patterns verified via multiple sources. Content script isolation is documented security feature. API integration patterns standard (fetch with Bearer token). |
| Pitfalls | **HIGH** | Critical pitfalls (Service Worker termination, async listener registration, React form compatibility, message response loss, popup state reset, Shadow DOM, SPA navigation, CORS, localStorage unavailability, port disconnection) all verified via official Chrome documentation and community experience reports. Recovery costs validated via developer case studies. |

**Overall confidence:** **HIGH**

### Gaps to Address

**Clerk Extension SDK compatibility:** Research assumes @clerk/chrome-extension supports MV3 and current Clerk version. Need to verify during Phase 2 implementation. If SDK doesn't support MV3, fallback to manual OAuth via launchWebAuthFlow.

**Target site compatibility:** Generic research covers React, Vue, Angular forms and shadow DOM patterns. Specific Brazilian government portals (Receita Federal, Detran, etc.) may have exotic patterns. Plan to test on real sites during Phase 4. If blockers discovered, trigger `/gsd:research-phase` with specific site URL for targeted research.

**Backend endpoint availability:** Research assumes existing API endpoints (GET /projects, GET /batches, GET /rows, GET /mappings, GET /steps) work as expected. Need to verify during Phase 2. New endpoint required: PATCH /rows/:rowId/status (add during Phase 5). Endpoint GET /mappings/:id/full (mapping with steps in one call) would optimize Phase 5 but not critical.

**WXT maintenance status:** CRXJS project sought new maintainers as of March 2025. WXT actively maintained (Dec 2025 release), but monitor project status during development. If WXT becomes unmaintained, migration path exists (esbuild + custom manifest generation).

**Service Worker 5-minute timeout:** Research documents 30-second idle timeout and 5-minute hard limit. For batches with 100+ fields, fill operation may exceed 5 minutes. Phase 5 must design for interruption (progress checkpointing, resumable operations). Test with large batches during Phase 5 implementation.

## Sources

### Primary (HIGH confidence)

**Chrome Extension Official Documentation:**
- [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [chrome.webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)

**Framework Documentation:**
- [WXT Official Site](https://wxt.dev)
- [WXT GitHub Releases](https://github.com/wxt-dev/wxt/releases) — Version 0.20.13, Dec 2025
- [CRXJS Vite Plugin](https://crxjs.dev)
- [React Issue #11488 - Trigger simulated input value change](https://github.com/facebook/react/issues/11488) — Native setter pattern

**Stack Verification:**
- [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- [Chrome Extension Development in 2025](https://www.devkit.best/blog/mdx/chrome-extension-framework-comparison-2025)

### Secondary (MEDIUM confidence)

**Feature Research:**
- [5 Best Autofill Chrome Extensions in 2026](https://blaze.today/blog/autofill-chrome-extensions/)
- [Top 10 Best Auto Fill Extension Plugins for Chrome in 2026](https://thunderbit.com/blog/best-auto-fill-extension-chrome)
- [User interface components | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/ui)

**Architecture Patterns:**
- [Chrome Extension Development: Complete System Architecture Guide 2026](https://jinlow.medium.com/chrome-extension-development-the-complete-system-architecture-guide-for-2026-9ae81415f93e)
- [Building Reliable Content Scripts: XPath vs CSS](https://dev.to/jaymalli_programmer/building-reliable-content-scripts-why-xpath-beats-queryselector-in-chrome-extensions-14ol)
- [State Storage in Chrome Extensions](https://hackernoon.com/state-storage-in-chrome-extensions-options-limits-and-best-practices)

**Pitfalls Validation:**
- [Chromium Extensions Group - Service Worker Debugging](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [Making Chrome Extension Smart by Supporting SPA websites](https://medium.com/@softvar/making-chrome-extension-smart-by-supporting-spa-websites-1f76593637e8)
- [Troubleshooting Common Messaging Problems in Chrome Extensions](https://moldstud.com/articles/p-troubleshooting-common-messaging-problems-in-your-chrome-extensions-a-comprehensive-guide)

### Tertiary (LOW confidence - needs validation during implementation)

**Authentication:**
- [Chrome Extension Manifest V3 Auth0 Discussion](https://community.auth0.com/t/chrome-extension-manifest-v3-using-auth0-in-a-secure-manner/125433) — Clerk pattern assumed similar
- [Authenticate Chrome Extension via Web App](https://medium.com/the-andela-way/authenticate-your-chrome-extension-user-through-your-web-app-dbdb96224e41)

**Form Automation:**
- [Testofill Chrome Extension](https://github.com/holyjak/Testofill-chrome-extension) — Reference implementation
- [Lightning Autofill Documentation](https://www.tohodo.com/autofill/)

---
*Research completed: 2026-02-03*
*Ready for roadmap: yes*
