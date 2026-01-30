# Roadmap: Populatte

## Milestones

- v1.0 End-to-End Auth & User Sync -- Phases 1-3 (shipped 2026-01-28)
- v2.0 Data Ingestion Engine -- Phases 4-11 (shipped 2026-01-29)
- v2.1 Batch Read Layer -- Phase 12 (shipped 2026-01-30)
- v2.2 Dashboard Upload & Listing UI -- Phases 13-16 (in progress)

## Phases

<details>
<summary>v1.0 End-to-End Auth & User Sync (Phases 1-3) - SHIPPED 2026-01-28</summary>

Collapsed. See git history for details.

</details>

<details>
<summary>v2.0 Data Ingestion Engine (Phases 4-11) - SHIPPED 2026-01-29</summary>

Collapsed. See git history for details.

</details>

<details>
<summary>v2.1 Batch Read Layer (Phase 12) - SHIPPED 2026-01-30</summary>

Collapsed. See git history for details.

</details>

### v2.2 Dashboard Upload & Listing UI (In Progress)

**Milestone Goal:** Build the frontend interface for uploading Excel files and viewing ingested data, connecting the Next.js dashboard to the batch/row API endpoints built in v2.0 and v2.1.

**Phase Numbering:**
- Integer phases (13, 14, 15, 16): Planned milestone work
- Decimal phases (e.g. 13.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 13: API Foundation & Project Detail Page** - Wire batch endpoints, Zod schemas, React Query hooks, FormData fix, and project detail page shell
- [ ] **Phase 14: Upload Modal** - File upload modal with mode selector, drag-and-drop, validation, and batch creation
- [ ] **Phase 15: Batch Grid** - Responsive batch card grid with empty state, skeletons, and navigation
- [ ] **Phase 16: Data Table with Pagination** - Dynamic-column data table with server-side pagination and loading states

## Phase Details

### Phase 13: API Foundation & Project Detail Page
**Goal**: Users can navigate to a project detail page and the frontend has all API plumbing (schemas, endpoints, hooks, FormData support) ready for batch operations
**Depends on**: Phase 12 (batch read endpoints must exist in API)
**Requirements**: APIF-01, APIF-02, APIF-03, APIF-04, APIF-05, PROJ-01, PROJ-02, PROJ-03
**Success Criteria** (what must be TRUE):
  1. User can navigate to /projects/[id] and see the project name in the page header
  2. Project detail page renders a "Nova Importacao" button in the header (non-functional until Phase 14)
  3. Batch API client supports FormData uploads without hardcoded Content-Type breaking multipart requests
  4. Zod schemas validate batch list, batch detail, and paginated row responses at runtime
  5. React Query hooks (useBatches, useBatch, useBatchRows, useUploadBatch) are available and wired to batch endpoints
**Plans**: 1 plan

Plans:
- [x] 13-01-PLAN.md -- Zod schemas, endpoint factory, React Query hooks, FormData fix, and project detail page shell

### Phase 14: Upload Modal
**Goal**: Users can upload Excel files to create batches via a drag-and-drop modal with mode selection and validation feedback
**Depends on**: Phase 13 (needs endpoint factory, useUploadBatch hook, FormData-capable API client, and project detail page)
**Requirements**: UPLD-01, UPLD-02, UPLD-03, UPLD-04, UPLD-05, UPLD-06, UPLD-07, UPLD-08, UPLD-09
**Success Criteria** (what must be TRUE):
  1. User can open upload modal from the project detail page via "Nova Importacao" button
  2. User can select List Mode or Profile Mode via visual card selector before choosing files
  3. User can add files via drag-and-drop or manual file selection, with visual feedback on dragover
  4. User sees client-side validation errors for invalid files (size >5MB, wrong file count per mode)
  5. User sees selected files with name and size, submits upload, and receives toast notification on success or failure with the batch list refreshing automatically
**Plans**: TBD

Plans:
- [ ] 14-01: Upload modal with mode selector, drag-and-drop, file validation, and upload mutation

### Phase 15: Batch Grid
**Goal**: Users can see their batch history as a card grid on the project detail page and navigate to individual batch data
**Depends on**: Phase 14 (upload creates test data; shares cache invalidation flow with upload mutation)
**Requirements**: GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06
**Success Criteria** (what must be TRUE):
  1. Project detail page displays batch cards in a responsive grid layout sorted newest-first
  2. Each batch card shows creation date, mode badge, and total row count
  3. User can click a batch card to navigate to the batch data table page
  4. Empty state component with upload CTA is shown when a project has no batches
  5. Loading skeleton cards (6) are displayed while batch data is being fetched
**Plans**: TBD

Plans:
- [ ] 15-01: Batch card, batch grid, empty state, skeletons, and navigation wiring

### Phase 16: Data Table with Pagination
**Goal**: Users can view batch row data in a paginated table with dynamically generated columns from Excel metadata
**Depends on**: Phase 15 (batch grid provides navigation to batch detail page)
**Requirements**: DTBL-01, DTBL-02, DTBL-03, DTBL-04, DTBL-05, DTBL-06, DTBL-07
**Success Criteria** (what must be TRUE):
  1. Batch detail page shows batch metadata header with mode, creation date, and total row count
  2. Data table generates columns dynamically from the batch's columnMetadata (preserving Excel column order)
  3. Data table displays paginated rows with server-side pagination (limit/offset) and Previous/Next controls showing "Showing X-Y of Z rows"
  4. Page transitions are smooth (previous data stays visible while next page loads via keepPreviousData)
  5. Loading skeleton rows are displayed during data fetch, and an empty state is shown for batches with zero rows

**Plans**: TBD

Plans:
- [ ] 16-01: Batch detail page, dynamic columns, data table, pagination controls, and loading states

## Progress

**Execution Order:**
Phases execute in numeric order: 13 -> 14 -> 15 -> 16

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 13. API Foundation & Project Detail Page | v2.2 | 1/1 | Complete | 2026-01-30 |
| 14. Upload Modal | v2.2 | 0/1 | Not started | - |
| 15. Batch Grid | v2.2 | 0/1 | Not started | - |
| 16. Data Table with Pagination | v2.2 | 0/1 | Not started | - |
