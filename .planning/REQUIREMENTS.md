# Requirements: Populatte v3.0

**Defined:** 2026-02-02
**Core Value:** Transform tedious manual data entry into automated form population

## v3.0 Requirements

Requirements for Backend Mapping milestone. Each maps to roadmap phases.

### Mapping CRUD

- [x] **MAP-01**: User can create a mapping with name, target URL, and optional success trigger for a project
- [x] **MAP-02**: User can list all mappings for a project with pagination, optionally filtered by targetUrl prefix match (only active mappings when targetUrl provided)
- [x] **MAP-03**: User can view mapping details including all steps ordered by step order
- [x] **MAP-04**: User can update mapping name, target URL, isActive, and success trigger
- [x] **MAP-05**: User can soft-delete a mapping (steps become inaccessible via mapping endpoints, no cascade)

### Step CRUD

- [ ] **STEP-01**: User can add a step to a mapping with action type (fill/click/wait/verify), selector, and auto-assigned order
- [ ] **STEP-02**: User can update a step's action, selector, fallbacks, source field key, fixed value, and config
- [ ] **STEP-03**: User can delete a step from a mapping
- [ ] **STEP-04**: User can reorder steps within a mapping by providing ordered step IDs

### Domain Model

- [ ] **DOM-01**: Mapping entity with project ownership, targetUrl, isActive, nullable successTrigger (url_change | text_appears | element_disappears)
- [ ] **DOM-02**: Step entity with ordered actions, CSS selector + fallbacks array, sourceFieldKey XOR fixedValue (mutually exclusive), config options (waitMs, optional, clearBefore, pressEnter)
- [ ] **DOM-03**: Drizzle schema for mappings and steps tables with proper relationships and soft delete on mappings

### Security

- [x] **SEC-01**: All mapping endpoints enforce project ownership validation (404/403 separation pattern)
- [ ] **SEC-02**: All step endpoints enforce mapping-to-project ownership chain (defense-in-depth)
- [x] **SEC-03**: Soft-delete filtering on all mapping read queries

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Mapping Frontend

- **MFUI-01**: Dashboard UI for creating and editing mappings
- **MFUI-02**: Visual step builder with drag-and-drop reordering
- **MFUI-03**: Field key autocomplete from batch columnMetadata

### Extension Execution

- **EXEC-01**: Chrome extension fetches matching mappings for current page
- **EXEC-02**: Extension executes steps sequentially against live DOM
- **EXEC-03**: Extension detects success trigger and advances to next row

### Mapping Enhancements

- **MENH-01**: Mapping versioning/history
- **MENH-02**: Mapping import/export (JSON format)
- **MENH-03**: Mapping duplication/cloning

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mapping/step frontend UI | Future milestone — backend first |
| Step execution engine | Chrome extension responsibility |
| CSS selector validation | Extension validates against live DOM |
| Redis caching for mappings | Optimization deferred |
| Mapping versioning/history | Future enhancement |
| Mapping import/export | Future enhancement |
| Step cascade on mapping soft-delete | Steps are inaccessible via mapping endpoints naturally |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOM-01 | Phase 21 | Complete |
| DOM-02 | Phase 21 | Complete |
| DOM-03 | Phase 21 | Complete |
| MAP-01 | Phase 22 | Complete |
| MAP-02 | Phase 22 | Complete |
| MAP-03 | Phase 22 | Complete |
| MAP-04 | Phase 22 | Complete |
| MAP-05 | Phase 22 | Complete |
| SEC-01 | Phase 22 | Complete |
| SEC-03 | Phase 22 | Complete |
| STEP-01 | Phase 23 | Pending |
| STEP-02 | Phase 23 | Pending |
| STEP-03 | Phase 23 | Pending |
| STEP-04 | Phase 23 | Pending |
| SEC-02 | Phase 23 | Pending |

**Coverage:**
- v3.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after roadmap creation*
