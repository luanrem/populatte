# Roadmap: Populatte v5.1

## Overview

Migrate the extension UI from a popup to Chrome's persistent Side Panel, solving the fundamental UX bottleneck where the popup closes on every page click. The roadmap delivers foundation infrastructure first (entrypoint, lifecycle, message protocol), then the tab architecture, followed by the two primary workflows (Preencher and Captura) and their enhancements (recent rows history and compact mode). Phases 38-40 are parallel-eligible after Phase 37 completes.

## Milestones

- v1.0 through v5.0: See MILESTONES.md (Phases 1-34, shipped)
- v5.1 Side Panel & UX Improvements: Phases 35-40 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (35, 36, ...): Planned milestone work
- Decimal phases (35.1, 36.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 35: Side Panel Setup** - WXT sidepanel entrypoint, lifecycle detection, popup removal, icon-click behavior
- [x] **Phase 36: Tabs Structure** - Two-tab architecture (Captura / Preencher) with state-aware enable/disable
- [x] **Phase 37: Aba Preencher** - Fill workflow UI migrated to Side Panel with steps list and element highlighting
- [ ] **Phase 38: Secao Recentes** - Recent rows history section with click navigation and persistent storage
- [ ] **Phase 39: Aba Captura** - Capture mode fully operational inside persistent Side Panel
- [ ] **Phase 40: Modo Colapsado** - Internal compact layout with step icon strip, tooltips, and keyboard shortcut

## Phase Details

### Phase 35: Side Panel Setup
**Goal**: Side Panel opens as the sole extension UI with per-tab persistence and clean lifecycle management
**Depends on**: Nothing (first phase of v5.1)
**Requirements**: SP-01, SP-02, SP-03, SP-04, SP-05, SP-06
**Success Criteria** (what must be TRUE):
  1. Clicking the extension icon opens the Side Panel (not a popup)
  2. Side Panel stays open while the user clicks and interacts with the web page
  3. Side Panel content persists across page navigations within the same tab
  4. Each tab has independent Side Panel state (switching tabs shows correct context)
  5. Closing the Side Panel triggers cleanup in the background script (port disconnect detected)
**Plans**: 5 plans

Plans:
- [x] 35-01-PLAN.md — Create sidepanel entrypoint, move popup components, update manifest
- [x] 35-02-PLAN.md — Per-tab state Map, port-based communication, tab lifecycle management
- [x] 35-03-PLAN.md — Fix port messaging bugs (AUTH_LOGIN routing, GET_STATE race condition)
- [x] 35-04-PLAN.md — Fix ProjectSelector/BatchSelector sendToBackground to sendViaPort (gap closure)
- [x] 35-05-PLAN.md — Fix port disconnection on SW termination: auto-reconnect, defensive sends, keepalive (gap closure)

### Phase 36: Tabs Structure
**Goal**: Users see two tabs (Captura / Preencher) with context-aware activation reflecting the current extension mode
**Depends on**: Phase 35
**Requirements**: TAB-01, TAB-02, TAB-03, TAB-04, TAB-05
**Success Criteria** (what must be TRUE):
  1. Side Panel shows a tab bar with "Captura" and "Preencher" tabs
  2. Captura tab is grayed out and shows a tooltip when capture mode is not active
  3. Captura tab shows a visual active badge when capture mode is running
  4. Side Panel opens on Preencher tab by default and remembers the last active tab across reopens
**Plans**: 3 plans

Plans:
- [x] 36-01-PLAN.md — TabBar component and App.tsx layout restructure with per-tab content areas
- [x] 36-02-PLAN.md — Tab state persistence, capture-mode-aware initialization, and auto-switch logic
- [x] 36-03-PLAN.md — Fix tooltip delay and optimistic tab switch on capture entry (gap closure)

### Phase 37: Aba Preencher
**Goal**: Users can perform the complete fill workflow (connect, select project/batch, navigate rows, fill forms) from the Side Panel with visible step details
**Depends on**: Phase 36
**Requirements**: FILL-01, FILL-02, FILL-03, FILL-04, FILL-05
**Success Criteria** (what must be TRUE):
  1. Connection status, project/batch selectors, mapping info, row navigator, and fill controls all work inside the Preencher tab
  2. Steps list appears below the mapping name showing count, action icons, selector text, and source field
  3. Clicking a step in the list highlights the corresponding element on the web page and scrolls it into view
  4. Steps whose CSS/XPath selector is not found on the current page display a warning badge
  5. All content fits within the ~320px Side Panel width without horizontal scrolling
**Plans**: 3 plans

Plans:
- [x] 37-01-PLAN.md — Restructure Preencher tab layout (compact header, sticky fill, empty state) and create PreencherStepList with drag-and-drop
- [x] 37-02-PLAN.md — Content script element highlighting, selector validation, step click wiring, and fill result indicators
- [x] 37-03-PLAN.md — Fix fill result indicators not showing (gap closure: remove response.success gate)

### Phase 38: Secao Recentes
**Goal**: Users can see and navigate to recently filled rows directly from the Preencher tab
**Depends on**: Phase 37
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06
**Success Criteria** (what must be TRUE):
  1. A "Recentes" section appears at the bottom of the Preencher tab showing the last 3 filled rows with status icon, row number, and identifier value
  2. Clicking the expand link reveals up to 10 recent rows with smooth animation
  3. Clicking a recent row navigates to it (updates row navigator and fetches that row's data)
  4. Recent rows persist per batch in chrome.storage.local and survive Side Panel close/reopen
  5. Each recent row displays the primary identifier value from batch settings, truncated with ellipsis if needed
**Plans**: 2 plans

Plans:
- [ ] 38-01-PLAN.md — Recent rows storage module, ROW_SELECT handler, and history tracking on navigation/fill
- [ ] 38-02-PLAN.md — RecentesList UI component with expand/collapse and click-to-navigate wiring

### Phase 39: Aba Captura
**Goal**: Users can create mappings via click-to-capture without the UI closing, leveraging Side Panel persistence
**Depends on**: Phase 37
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04, CAP-05
**Success Criteria** (what must be TRUE):
  1. All capture mode UI from v5.0 (URL, name, steps list, step config) works inside the Captura tab
  2. Clicking "Criar Mapping" starts capture and automatically switches to the Captura tab with active badge
  3. Capture state (steps, URL, name) persists while the user clicks on page elements to capture selectors
  4. "Finalizar" saves the mapping and returns to Preencher; "Cancelar" shows a confirmation if steps exist
**Plans**: TBD

Plans:
- [ ] 39-01: TBD

### Phase 40: Modo Colapsado
**Goal**: Power users can collapse the Side Panel to a minimal icon strip for rapid fill-and-advance workflows without losing context
**Depends on**: Phase 37
**Requirements**: CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07, CMP-08
**Success Criteria** (what must be TRUE):
  1. A toggle button in the Side Panel header collapses the UI to a compact internal layout within the full panel width
  2. Compact layout shows a vertical strip of step action icons with number badges and warning indicators for invalid selectors
  3. Hovering an icon shows a tooltip with action type, selector, and source column; clicking highlights the element on the page
  4. Expanding returns to the full layout with the previously active tab state preserved
  5. Ctrl+B (Win/Linux) / Cmd+B (Mac) toggles compact mode with a smooth ~200ms CSS transition
**Plans**: TBD

Plans:
- [ ] 40-01: TBD
- [ ] 40-02: TBD

## Progress

**Execution Order:**
Phases 35 through 37 execute sequentially. Phases 38, 39, and 40 are parallel-eligible after Phase 37 completes.

```
Phase 35 (Side Panel Setup)
    |
    v
Phase 36 (Tabs Structure)
    |
    v
Phase 37 (Aba Preencher)
    |
    +---> Phase 38 (Secao Recentes) [parallel-eligible]
    +---> Phase 39 (Aba Captura)    [parallel-eligible]
    +---> Phase 40 (Modo Colapsado) [parallel-eligible]
```

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 35. Side Panel Setup | v5.1 | 5/5 | Complete | 2026-02-06 |
| 36. Tabs Structure | v5.1 | 3/3 | Complete | 2026-02-06 |
| 37. Aba Preencher | v5.1 | 3/3 | Complete | 2026-02-06 |
| 38. Secao Recentes | v5.1 | 0/2 | Not started | - |
| 39. Aba Captura | v5.1 | 0/TBD | Not started | - |
| 40. Modo Colapsado | v5.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-05*
*Last updated: 2026-02-08 — Phase 38 planned (2 plans in 2 waves)*
