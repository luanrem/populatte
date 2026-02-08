# Requirements: Populatte v5.1

**Defined:** 2026-02-05
**Core Value:** Transform tedious manual data entry into automated form population

## v5.1 Requirements

Requirements for Side Panel & UX Improvements milestone. Each maps to roadmap phases.

### Side Panel Foundation

- [x] **SP-01**: Side Panel renders with React entry via WXT `entrypoints/sidepanel/` convention
- [x] **SP-02**: Extension icon click opens Side Panel directly (`openPanelOnActionClick: true`)
- [x] **SP-03**: Side Panel persists while interacting with page and across navigations
- [x] **SP-04**: Side Panel is per-tab (independent state per tab)
- [x] **SP-05**: Popup removed — all UI lives in Side Panel
- [x] **SP-06**: Port-based lifecycle detection (detect Side Panel close for cleanup)

### Tabs

- [x] **TAB-01**: Tab bar with two tabs: "Captura" and "Preencher"
- [x] **TAB-02**: Captura tab disabled when not in capture mode (grayed out, tooltip)
- [x] **TAB-03**: Captura tab shows active badge when capturing
- [x] **TAB-04**: Opens on Preencher tab by default, remembers last active tab
- [x] **TAB-05**: Tab state syncs with capture mode events from background script

### Preencher

- [x] **FILL-01**: Connection status, project/batch selectors, mapping info, row navigator, fill controls (migrated from popup)
- [x] **FILL-02**: Steps list below mapping name with count, action icons, selector, source field
- [x] **FILL-03**: Click step highlights element on page and scrolls into view
- [x] **FILL-04**: Warning badge on steps where selector not found on current page
- [x] **FILL-05**: Layout fits ~320px Side Panel width without horizontal scroll

### Recentes

- [x] **REC-01**: Section at bottom of Preencher tab with "Recentes" header and expand link
- [x] **REC-02**: Shows last 3 rows with status icon + row number + identifier value
- [x] **REC-03**: Expandable to show up to 10 rows with smooth animation
- [x] **REC-04**: Click on row navigates to that row (updates navigator and fetches data)
- [x] **REC-05**: Recent rows stored per batch in chrome.storage.local (FIFO, max 10)
- [x] **REC-06**: Shows primary identifier value from batch settings, truncated with ellipsis

### Captura

- [ ] **CAP-01**: All capture mode UI from v5.0 works in Side Panel (URL, name, steps, config)
- [ ] **CAP-02**: "Criar Mapping" button starts capture and switches to Captura tab with active badge
- [ ] **CAP-03**: Capture state persists while clicking on page (main benefit of Side Panel)
- [ ] **CAP-04**: Finalizar saves mapping and returns to Preencher; Cancelar confirms if steps exist
- [ ] **CAP-05**: Content script capture integration (element highlight, badges, step sync via storage)

### Compact Mode

- [ ] **CMP-01**: Toggle button in Side Panel header collapses to compact internal layout
- [ ] **CMP-02**: Compact layout shows vertical strip of step action icons within full panel width
- [ ] **CMP-03**: Step icons show number badge (bottom-left) and warning indicator if selector invalid
- [ ] **CMP-04**: Hover on icon shows tooltip with action type, selector, and source column
- [ ] **CMP-05**: Click on icon highlights element on page and scrolls into view
- [ ] **CMP-06**: Expand button at top returns to full layout with previous tab state
- [ ] **CMP-07**: Ctrl+B (Win/Linux) / Cmd+B (Mac) keyboard shortcut toggles compact mode
- [ ] **CMP-08**: Smooth CSS transition (~200ms) for collapse/expand animation

## Future Requirements

Deferred to later milestones.

### AUTOPILOTO Mode

- **AUTO-01**: Auto-advance to next row after successful fill
- **AUTO-02**: Configurable auto-advance delay
- **AUTO-03**: Stop/pause auto-advance

### Polish

- **POL-01**: Keyboard shortcuts for fill (Ctrl+Shift+F) and next row (Ctrl+Shift+N)
- **POL-02**: Field highlighting during fill execution
- **POL-03**: Batch progress summary in Side Panel header

## Out of Scope

| Feature | Reason |
|---------|--------|
| Settings page in Side Panel | Placeholder button only for v5.1, full settings deferred |
| Multi-tab capture coordination | Single-tab capture only, cross-tab adds race conditions |
| Offline support for recentes | Requires sync complexity |
| Programmatic panel resize | Chrome Side Panel API has no width control |
| Panel width below ~280px | Chrome-enforced minimum, compact mode is internal CSS only |
| Popup retention | Replaced entirely by Side Panel — simpler single UI surface |
| openPanelOnActionClick toggle | Always opens Side Panel on icon click |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SP-01 | Phase 35 | Complete |
| SP-02 | Phase 35 | Complete |
| SP-03 | Phase 35 | Complete |
| SP-04 | Phase 35 | Complete |
| SP-05 | Phase 35 | Complete |
| SP-06 | Phase 35 | Complete |
| TAB-01 | Phase 36 | Complete |
| TAB-02 | Phase 36 | Complete |
| TAB-03 | Phase 36 | Complete |
| TAB-04 | Phase 36 | Complete |
| TAB-05 | Phase 36 | Complete |
| FILL-01 | Phase 37 | Complete |
| FILL-02 | Phase 37 | Complete |
| FILL-03 | Phase 37 | Complete |
| FILL-04 | Phase 37 | Complete |
| FILL-05 | Phase 37 | Complete |
| REC-01 | Phase 38 | Complete |
| REC-02 | Phase 38 | Complete |
| REC-03 | Phase 38 | Complete |
| REC-04 | Phase 38 | Complete |
| REC-05 | Phase 38 | Complete |
| REC-06 | Phase 38 | Complete |
| CAP-01 | Phase 39 | Pending |
| CAP-02 | Phase 39 | Pending |
| CAP-03 | Phase 39 | Pending |
| CAP-04 | Phase 39 | Pending |
| CAP-05 | Phase 39 | Pending |
| CMP-01 | Phase 40 | Pending |
| CMP-02 | Phase 40 | Pending |
| CMP-03 | Phase 40 | Pending |
| CMP-04 | Phase 40 | Pending |
| CMP-05 | Phase 40 | Pending |
| CMP-06 | Phase 40 | Pending |
| CMP-07 | Phase 40 | Pending |
| CMP-08 | Phase 40 | Pending |

**Coverage:**
- v5.1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-08 — Phase 38 requirements (REC-01 through REC-06) verified Complete*
