# Requirements: Populatte

**Defined:** 2026-01-30
**Core Value:** Transform tedious manual data entry into automated form population

## v2.2 Requirements

Requirements for Dashboard Upload & Listing UI. Each maps to roadmap phases.

### API Foundation (APIF)

- [x] **APIF-01**: Batch endpoint factory follows existing `createProjectEndpoints(fetchFn)` pattern
- [x] **APIF-02**: Zod response schemas validate batch list, batch detail, and paginated rows
- [x] **APIF-03**: React Query hooks for batch list, batch detail, batch rows, and upload mutation
- [x] **APIF-04**: API client supports FormData uploads (no hardcoded Content-Type for multipart)
- [x] **APIF-05**: Upload mutation invalidates batch list cache on success

### Upload Modal (UPLD)

- [ ] **UPLD-01**: User can open upload modal from project detail page via "Nova Importacao" button
- [ ] **UPLD-02**: User can select List Mode or Profile Mode via visual card selector before upload
- [ ] **UPLD-03**: User can add files via drag-and-drop zone with visual feedback on dragover
- [ ] **UPLD-04**: User can add files via manual file selection fallback (click to browse)
- [ ] **UPLD-05**: User sees client-side validation errors (file size >5MB, file count rules per mode)
- [ ] **UPLD-06**: User sees selected files list with filename and size before upload
- [ ] **UPLD-07**: Upload submit triggers batch creation API call with FormData
- [ ] **UPLD-08**: Modal closes and batch list refreshes on successful upload
- [ ] **UPLD-09**: User sees toast notification on upload success or failure

### Batch Grid (GRID)

- [ ] **GRID-01**: Project detail page displays batch cards in responsive grid layout
- [ ] **GRID-02**: Batch card shows creation date, mode badge, and total row count
- [ ] **GRID-03**: Batch grid sorts newest-first (matches API default DESC ordering)
- [ ] **GRID-04**: User can click batch card to navigate to batch data table page
- [ ] **GRID-05**: Empty state component shown when project has no batches (with upload CTA)
- [ ] **GRID-06**: Loading skeleton cards (6) displayed during data fetch

### Data Table (DTBL)

- [ ] **DTBL-01**: Batch detail page shows batch metadata header (mode, date, total rows)
- [ ] **DTBL-02**: Data table generates columns dynamically from batch columnMetadata
- [ ] **DTBL-03**: Data table displays paginated rows with server-side pagination (limit/offset)
- [ ] **DTBL-04**: Pagination controls (Previous/Next) with "Showing X-Y of Z rows" label
- [ ] **DTBL-05**: Smooth page transitions using keepPreviousData in React Query
- [ ] **DTBL-06**: Loading skeleton rows displayed during data fetch
- [ ] **DTBL-07**: Empty state for batches with zero rows

### Project Detail Page (PROJ)

- [x] **PROJ-01**: Project detail page at /projects/[id] with project name header
- [x] **PROJ-02**: "Nova Importacao" button in project header opens upload modal
- [x] **PROJ-03**: Batch grid section displays below project header

## Future Requirements

Deferred to future milestones. Tracked but not in v2.2 roadmap.

### Enhanced Data Table

- **DTBL-F01**: Column sorting (requires server-side ORDER BY API changes)
- **DTBL-F02**: Column filtering (requires server-side WHERE clause API changes)
- **DTBL-F03**: Column visibility toggle (hide/show columns)
- **DTBL-F04**: Row selection with checkboxes (foundation for bulk actions)
- **DTBL-F05**: Copy cell value to clipboard on click

### Batch Management

- **GRID-F01**: Batch deletion with confirmation dialog (requires soft-delete use case)
- **GRID-F02**: Client-side batch search/filter by date or name
- **GRID-F03**: Export batch data to Excel file

### Upload Enhancements

- **UPLD-F01**: Determinate progress bar during upload
- **UPLD-F02**: Upload cancellation via AbortController
- **UPLD-F03**: Smart mode suggestion based on file count
- **UPLD-F04**: File remove button before upload submission

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Inline editing in data table | Data is immutable (sourced from Excel); re-upload to correct |
| Drag-and-drop row reordering | sourceRowIndex reflects Excel order; breaks traceability |
| Real-time WebSocket upload progress | Files <5MB complete in seconds; overkill |
| Infinite scroll for batches | Batch count is bounded; card grid sufficient |
| Column mapping UI | Belongs to browser extension milestone, not dashboard |
| Batch merging | Batches represent distinct imports; merging loses traceability |
| Virtual scrolling for rows | Server-side pagination is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| APIF-01 | Phase 13 | Complete |
| APIF-02 | Phase 13 | Complete |
| APIF-03 | Phase 13 | Complete |
| APIF-04 | Phase 13 | Complete |
| APIF-05 | Phase 13 | Complete |
| UPLD-01 | Phase 14 | Pending |
| UPLD-02 | Phase 14 | Pending |
| UPLD-03 | Phase 14 | Pending |
| UPLD-04 | Phase 14 | Pending |
| UPLD-05 | Phase 14 | Pending |
| UPLD-06 | Phase 14 | Pending |
| UPLD-07 | Phase 14 | Pending |
| UPLD-08 | Phase 14 | Pending |
| UPLD-09 | Phase 14 | Pending |
| GRID-01 | Phase 15 | Pending |
| GRID-02 | Phase 15 | Pending |
| GRID-03 | Phase 15 | Pending |
| GRID-04 | Phase 15 | Pending |
| GRID-05 | Phase 15 | Pending |
| GRID-06 | Phase 15 | Pending |
| DTBL-01 | Phase 16 | Pending |
| DTBL-02 | Phase 16 | Pending |
| DTBL-03 | Phase 16 | Pending |
| DTBL-04 | Phase 16 | Pending |
| DTBL-05 | Phase 16 | Pending |
| DTBL-06 | Phase 16 | Pending |
| DTBL-07 | Phase 16 | Pending |
| PROJ-01 | Phase 13 | Complete |
| PROJ-02 | Phase 13 | Complete |
| PROJ-03 | Phase 13 | Complete |

**Coverage:**
- v2.2 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after roadmap creation*
