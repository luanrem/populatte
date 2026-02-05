# Requirements: Populatte

**Defined:** 2026-02-04
**Core Value:** Transform tedious manual data entry into automated form population

## v5.0 Requirements

Requirements for v5.0 Mapping Builder milestone. Each maps to roadmap phases.

### Backend CRUD

- [x] **API-01**: PUT /projects/:projectId updates project name
- [x] **API-02**: DELETE /projects/:projectId soft-deletes project
- [x] **API-03**: PUT /projects/:projectId/batches/:batchId updates batch name
- [x] **API-04**: DELETE /projects/:projectId/batches/:batchId soft-deletes batch
- [x] **API-05**: PATCH /projects/:projectId/batches/:batchId updates identifier fields

### Batch Identifier

- [x] **ID-01**: Batch entity has identifierFieldKey column (nullable)
- [x] **ID-02**: Batch entity has secondaryFieldKey column (nullable)
- [x] **ID-03**: API validates keys exist in batch's field inventory
- [x] **ID-04**: Row responses include identifier values when configured

### Dashboard Project/Batch CRUD

- [x] **CRUD-01**: User can edit project name (inline or modal)
- [x] **CRUD-02**: User can delete project with confirmation dialog
- [x] **CRUD-03**: User can edit batch name
- [x] **CRUD-04**: User can delete batch with confirmation dialog
- [x] **CRUD-05**: Batch settings page displays identifier configuration

### Dashboard Mappings List

- [x] **MAP-01**: User can view list of all mappings for a project
- [x] **MAP-02**: Each mapping shows name, URL, step count, status
- [x] **MAP-03**: Edit button navigates to mapping edit page
- [x] **MAP-04**: Delete button soft-deletes mapping with confirmation
- [x] **MAP-05**: "+ Novo Mapping" button shows instruction modal

### Dashboard Mapping Edit

- [x] **EDIT-01**: User can edit mapping name
- [x] **EDIT-02**: User can edit target URL
- [x] **EDIT-03**: User can toggle active/inactive status
- [x] **EDIT-04**: User can configure success trigger (type dropdown + value)
- [x] **EDIT-05**: Page displays steps with action icon, selector, source
- [x] **EDIT-06**: User can drag-and-drop to reorder steps
- [x] **EDIT-07**: User can delete step from mapping
- [x] **EDIT-08**: Edit step button opens modal
- [x] **EDIT-09**: User can add step manually via button

### Dashboard Step Edit Modal

- [x] **STEP-01**: User can select action type (fill/click/wait)
- [x] **STEP-02**: User can edit primary selector (type dropdown + value input)
- [x] **STEP-03**: User can add/remove fallback selectors (max 5)
- [x] **STEP-04**: User can select source column from Excel columns dropdown (for fill)
- [x] **STEP-05**: User can set fixed value as alternative to column
- [x] **STEP-06**: User can toggle options (optional, clearBefore, pressEnter)
- [x] **STEP-07**: Wait action shows duration input

### Extension Capture Mode

- [ ] **CAP-01**: "Criar Mapping" button appears when no mapping exists for current URL
- [ ] **CAP-02**: Capture mode UI renders in popup with sidebar-style layout
- [ ] **CAP-03**: Current URL auto-captures as targetUrl
- [ ] **CAP-04**: User can enter mapping name
- [ ] **CAP-05**: Content script highlights interactive elements on hover (blue border)
- [ ] **CAP-06**: Content script captures clicked element (prevents default action)
- [ ] **CAP-07**: Extension generates CSS selector from clicked element
- [ ] **CAP-08**: Extension auto-detects action type based on element (input→fill, button→click)
- [ ] **CAP-09**: Step config UI shows action, source, options
- [ ] **CAP-10**: Excel columns dropdown populated from selected batch's fields
- [ ] **CAP-11**: User can set fixed value as alternative to column
- [ ] **CAP-12**: User can toggle options (optional, clearBefore, pressEnter)
- [ ] **CAP-13**: Steps list shows captured steps with preview
- [ ] **CAP-14**: User can drag-and-drop to reorder steps in list
- [ ] **CAP-15**: User can delete step from list
- [ ] **CAP-16**: "+ Wait" button allows adding manual delay steps
- [ ] **CAP-17**: "Finalizar" saves mapping and steps to API
- [ ] **CAP-18**: "Cancelar" discards and exits capture mode
- [ ] **CAP-19**: Success state shows next action options
- [ ] **CAP-20**: Loading state displays during save

### Extension Identifier Display

- [ ] **DISP-01**: Popup shows identifier value below row number
- [ ] **DISP-02**: Popup shows secondary identifier when configured
- [ ] **DISP-03**: Row data fetch includes identifier values

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Auto Mode (AUTOPILOTO)

- **AUTO-01**: Extension auto-advances rows after successful fills
- **AUTO-02**: User can toggle between COPILOTO (manual) and AUTOPILOTO modes
- **AUTO-03**: Batch processing runs continuously until stopped

### Advanced Capture

- **ADV-01**: Auto-capture fallback selectors (multiple alternatives)
- **ADV-02**: Smart field detection (AI-assisted selector suggestions)
- **ADV-03**: Test mapping in dashboard without extension

### Mapping Management

- **MGT-01**: Duplicate mapping
- **MGT-02**: Import/export mappings as JSON
- **MGT-03**: Search/filter mappings list

### Extension Enhancements

- **ENH-01**: Search/select specific row in extension
- **ENH-02**: Multi-URL workflows (sequential forms)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-capture fallback selectors | Only primary selector in capture; fallbacks added via dashboard |
| Test mapping in dashboard | Test via extension only — simpler, validates real DOM |
| Duplicate mapping | Low priority, manual recreation sufficient |
| Import/export mappings | Future enhancement, not blocking users |
| Search specific row in extension | Batch identifier display sufficient for v5.0 |
| Multi-URL workflows | High complexity, single-form MVP first |
| Smart field detection | Unreliable without training data |
| XPath generation in capture | CSS selectors more readable; XPath added in dashboard |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| API-01 | 30 | Complete |
| API-02 | 30 | Complete |
| API-03 | 30 | Complete |
| API-04 | 30 | Complete |
| API-05 | 30 | Complete |
| ID-01 | 30 | Complete |
| ID-02 | 30 | Complete |
| ID-03 | 30 | Complete |
| ID-04 | 30 | Complete |
| CRUD-01 | 31 | Complete |
| CRUD-02 | 31 | Complete |
| CRUD-03 | 31 | Complete |
| CRUD-04 | 31 | Complete |
| CRUD-05 | 31 | Complete |
| MAP-01 | 31 | Complete |
| MAP-02 | 31 | Complete |
| MAP-03 | 31 | Complete |
| MAP-04 | 31 | Complete |
| MAP-05 | 31 | Complete |
| EDIT-01 | 32 | Complete |
| EDIT-02 | 32 | Complete |
| EDIT-03 | 32 | Complete |
| EDIT-04 | 32 | Complete |
| EDIT-05 | 32 | Complete |
| EDIT-06 | 32 | Complete |
| EDIT-07 | 32 | Complete |
| EDIT-08 | 32 | Complete |
| EDIT-09 | 32 | Complete |
| STEP-01 | 32 | Complete |
| STEP-02 | 32 | Complete |
| STEP-03 | 32 | Complete |
| STEP-04 | 32 | Complete |
| STEP-05 | 32 | Complete |
| STEP-06 | 32 | Complete |
| STEP-07 | 32 | Complete |
| CAP-01 | 33 | Pending |
| CAP-02 | 33 | Pending |
| CAP-03 | 33 | Pending |
| CAP-04 | 33 | Pending |
| CAP-05 | 33 | Pending |
| CAP-06 | 33 | Pending |
| CAP-07 | 33 | Pending |
| CAP-08 | 33 | Pending |
| CAP-09 | 33 | Pending |
| CAP-10 | 33 | Pending |
| CAP-11 | 33 | Pending |
| CAP-12 | 33 | Pending |
| CAP-13 | 33 | Pending |
| CAP-14 | 33 | Pending |
| CAP-15 | 33 | Pending |
| CAP-16 | 33 | Pending |
| CAP-17 | 33 | Pending |
| CAP-18 | 33 | Pending |
| CAP-19 | 33 | Pending |
| CAP-20 | 33 | Pending |
| DISP-01 | 34 | Pending |
| DISP-02 | 34 | Pending |
| DISP-03 | 34 | Pending |

**Coverage:**
- v5.0 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after phase 32 completion*
