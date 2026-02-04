# Roadmap: Populatte

## Milestones

- [x] **v1.0 MVP** - Phases 1-3 (shipped 2026-01-28)
- [x] **v2.0 Data Ingestion** - Phases 1-10 (shipped 2026-01-29)
- [x] **v2.1 Batch Read** - Phases 11-12 (shipped 2026-01-30)
- [x] **v2.2 Dashboard Upload** - Phases 13-16 (shipped 2026-01-30)
- [x] **v2.3 Field Inventory** - Phases 17-20 (shipped 2026-02-02)
- [x] **v3.0 Backend Mapping** - Phases 21-23 (shipped 2026-02-03)
- [x] **v4.0 Extension Core** - Phases 24-29 (shipped 2026-02-04)
- [ ] **v5.0 Mapping Builder** - Phases 30-34 (in progress)

## Overview

v5.0 enables users to create mappings visually by clicking form fields in the extension, edit them in the dashboard, and see meaningful row identifiers while filling. Five phases: backend foundation for project/batch CRUD and batch identifiers, dashboard management UI, dashboard mapping editor, extension capture mode, and extension identifier integration.

## Phases

- [x] **Phase 30: Backend Foundation** - Project/batch CRUD endpoints and batch identifier configuration
- [x] **Phase 31: Dashboard Management** - Project/batch CRUD UI and mappings list
- [ ] **Phase 32: Dashboard Mapping Editor** - Mapping edit page with step management
- [ ] **Phase 33: Extension Capture Mode** - Click-to-capture selector creation
- [ ] **Phase 34: Extension Identifier Integration** - Row identifier display in popup

## Phase Details

### Phase 30: Backend Foundation
**Goal**: Users can update/delete projects and batches, and configure identifier fields for meaningful row identification
**Depends on**: v4.0 (existing project/batch infrastructure)
**Requirements**: API-01, API-02, API-03, API-04, API-05, ID-01, ID-02, ID-03, ID-04
**Success Criteria** (what must be TRUE):
  1. User can update project name via PUT /projects/:projectId
  2. User can soft-delete project via DELETE /projects/:projectId
  3. User can update batch name via PUT /projects/:projectId/batches/:batchId
  4. User can soft-delete batch via DELETE /projects/:projectId/batches/:batchId
  5. User can configure identifier fields via PATCH /projects/:projectId/batches/:batchId
**Plans**: 3 plans

Plans:
- [x] 30-01-PLAN.md — Schema foundation with identifier columns
- [x] 30-02-PLAN.md — Batch CRUD operations (update, delete, identifier config)
- [x] 30-03-PLAN.md — Project cascade delete and migration

### Phase 31: Dashboard Management
**Goal**: Users can manage projects, batches, and view mappings from the dashboard
**Depends on**: Phase 30
**Requirements**: CRUD-01, CRUD-02, CRUD-03, CRUD-04, CRUD-05, MAP-01, MAP-02, MAP-03, MAP-04, MAP-05
**Success Criteria** (what must be TRUE):
  1. User can edit project name from dashboard (inline or modal)
  2. User can delete project with confirmation dialog
  3. User can edit batch name and configure identifiers in batch settings
  4. User can delete batch with confirmation dialog
  5. User can view all mappings for a project with name, URL, step count, status
**Plans**: 7 plans (6 original + 1 gap closure)

Plans:
- [x] 31-01-PLAN.md — Create inline-edit component and batch CRUD hooks
- [x] 31-02-PLAN.md — Wire inline editing and batch CRUD UI
- [x] 31-03-PLAN.md — Integrate batch CRUD into grid and detail views
- [x] 31-04-PLAN.md — Create mappings API layer and React Query hooks
- [x] 31-05-PLAN.md — Build mappings list UI components
- [x] 31-06-PLAN.md — Integrate mappings list into project detail page
- [x] 31-07-PLAN.md — Gap closure: fix batch edit blocker, add toast feedback, improve visual polish

### Phase 32: Dashboard Mapping Editor
**Goal**: Users can edit mapping details and manage steps with full CRUD operations
**Depends on**: Phase 31
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, EDIT-09, STEP-01, STEP-02, STEP-03, STEP-04, STEP-05, STEP-06, STEP-07
**Success Criteria** (what must be TRUE):
  1. User can edit mapping properties (name, URL, active status, success trigger)
  2. User can view steps list with action icon, selector, and source
  3. User can reorder steps via drag-and-drop
  4. User can add, edit, and delete steps
  5. Step edit modal allows configuring action type, selectors, source/fixed value, and options
**Plans**: 3 plans

Plans:
- [ ] 32-01-PLAN.md — API layer, schemas, React Query hooks, and UI dependencies
- [ ] 32-02-PLAN.md — Mapping editor page with properties form and unsaved changes guard
- [ ] 32-03-PLAN.md — Steps section with drag-and-drop and step editor modal

### Phase 33: Extension Capture Mode
**Goal**: Users can create mappings visually by clicking form fields in the extension
**Depends on**: Phase 30 (batch identifier for column list)
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-04, CAP-05, CAP-06, CAP-07, CAP-08, CAP-09, CAP-10, CAP-11, CAP-12, CAP-13, CAP-14, CAP-15, CAP-16, CAP-17, CAP-18, CAP-19, CAP-20
**Success Criteria** (what must be TRUE):
  1. User can enter capture mode when no mapping exists for current URL
  2. User can click form elements to capture selectors with visual highlight feedback
  3. User can configure each captured step (action, source column, options)
  4. User can reorder, delete, and add wait steps to the capture list
  5. User can finalize and save mapping to API or cancel capture
**Plans**: TBD

Plans:
- [ ] 33-01: TBD

### Phase 34: Extension Identifier Integration
**Goal**: Users see meaningful row identifiers while filling forms in the extension
**Depends on**: Phase 30 (batch identifier configuration)
**Requirements**: DISP-01, DISP-02, DISP-03
**Success Criteria** (what must be TRUE):
  1. Popup shows primary identifier value below row number
  2. Popup shows secondary identifier when configured
  3. Row data fetch includes identifier values from API
**Plans**: TBD

Plans:
- [ ] 34-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 30. Backend Foundation | v5.0 | 3/3 | ✓ Complete | 2026-02-04 |
| 31. Dashboard Management | v5.0 | 7/7 | ✓ Complete | 2026-02-04 |
| 32. Dashboard Mapping Editor | v5.0 | 0/3 | Not started | - |
| 33. Extension Capture Mode | v5.0 | 0/? | Not started | - |
| 34. Extension Identifier Integration | v5.0 | 0/? | Not started | - |

---
*Created: 2026-02-04*
*Milestone: v5.0 Mapping Builder*
