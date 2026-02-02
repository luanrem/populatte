# Roadmap: Populatte

## Milestones

- ✅ **v1.0 End-to-End Auth & User Sync** - Phases 1-3 (shipped 2026-01-28)
- ✅ **v2.0 Data Ingestion Engine** - Phases 4-10 (shipped 2026-01-29)
- ✅ **v2.1 Batch Read Layer** - Phases 11-12 (shipped 2026-01-30)
- ✅ **v2.2 Dashboard Upload & Listing UI** - Phases 13-16 (shipped 2026-01-30)
- 🚧 **v2.3 Field Inventory** - Phases 17-20 (in progress)

## Phases

<details>
<summary>✅ v1.0 End-to-End Auth & User Sync (Phases 1-3) - SHIPPED 2026-01-28</summary>

### Phase 1: Request-Time User Sync Foundation
**Goal**: ClerkAuthGuard creates/updates users on every request
**Plans**: 2 plans

Plans:
- [x] 01-01: ClerkService JWT claims extraction + compare-first sync
- [x] 01-02: ClerkAuthGuard integration with request user attachment

### Phase 2: Frontend API Client Infrastructure
**Goal**: Type-safe authenticated HTTP client with automatic token refresh
**Plans**: 2 plans

Plans:
- [x] 02-01: Fetch-based API client with 401 retry logic
- [x] 02-02: Factory pattern endpoints + TanStack Query integration

### Phase 3: Database & Health Monitoring
**Goal**: Production-ready user persistence with monitoring
**Plans**: 1 plan

Plans:
- [x] 03-01: Schema updates, env validation, sync failure tracking

</details>

<details>
<summary>✅ v2.0 Data Ingestion Engine (Phases 4-10) - SHIPPED 2026-01-29</summary>

### Phase 4: Domain Foundation
**Goal**: Core entities and database schema for batch/row data
**Plans**: 2 plans

Plans:
- [x] 04-01: Batch and Row entities with Drizzle schema
- [x] 04-02: RowRepository with chunked bulk insert

### Phase 5: Transaction Infrastructure
**Goal**: CLS-based transactions for atomic batch operations
**Plans**: 1 plan

Plans:
- [x] 05-01: CLS transaction setup with SheetJS parsing utilities

### Phase 6: Strategy Pattern Ingestion
**Goal**: Extensible parsing via ListModeStrategy and ProfileModeStrategy
**Plans**: 3 plans

Plans:
- [x] 06-01: Strategy interfaces and factory pattern
- [x] 06-02: ListModeStrategy implementation
- [x] 06-03: ProfileModeStrategy implementation

### Phase 7: Transactional Use Case
**Goal**: CreateBatchUseCase with atomic rollback
**Plans**: 2 plans

Plans:
- [x] 07-01: Use case with transaction orchestration
- [x] 07-02: Project ownership validation (404/403)

### Phase 8: REST Endpoint
**Goal**: POST /projects/:projectId/batches with file upload
**Plans**: 2 plans

Plans:
- [x] 08-01: Controller with Multer integration
- [x] 08-02: DTO validation with Zod v4

### Phase 9: File Validation
**Goal**: Multi-layer validation (size, type, count)
**Plans**: 1 plan

Plans:
- [x] 09-01: Magic-byte validation + middleware

### Phase 10: Testing & Documentation
**Goal**: E2E tests and endpoint documentation
**Plans**: 1 plan

Plans:
- [x] 10-01: Integration tests + OpenAPI docs

</details>

<details>
<summary>✅ v2.1 Batch Read Layer (Phases 11-12) - SHIPPED 2026-01-30</summary>

### Phase 11: Batch Read Endpoints
**Goal**: GET endpoints for batch metadata and lists
**Plans**: 1 plan

Plans:
- [x] 11-01: List batches + get batch detail with ownership validation

### Phase 12: Paginated Rows Endpoint
**Goal**: GET /batches/:batchId/rows with pagination
**Plans**: 1 plan

Plans:
- [x] 12-01: Paginated row listing with Zod validation

</details>

<details>
<summary>✅ v2.2 Dashboard Upload & Listing UI (Phases 13-16) - SHIPPED 2026-01-30</summary>

### Phase 13: React Query Batch API Layer
**Goal**: Type-safe API hooks with cache management
**Plans**: 1 plan

Plans:
- [x] 13-01: useApiClient hooks + Zod response schemas

### Phase 14: Upload Modal UI
**Goal**: Drag-and-drop file upload with mode selection
**Plans**: 1 plan

Plans:
- [x] 14-01: Upload modal with react-dropzone

### Phase 15: Batch Grid UI
**Goal**: Responsive batch list with mode badges
**Plans**: 1 plan

Plans:
- [x] 15-01: Batch grid with relative dates

### Phase 16: Batch Detail Data Table
**Goal**: Dynamic data table with server-side pagination
**Plans**: 1 plan

Plans:
- [x] 16-01: Data table with keepPreviousData

</details>

### 🚧 v2.3 Field Inventory (In Progress)

**Milestone Goal:** Column-oriented data exploration to prepare Excel-to-form field mapping

#### Phase 17: Backend Field Stats with Type Inference ✓
**Goal**: Field-level analytics endpoint with presence, uniqueness, and type detection
**Depends on**: Phase 16
**Requirements**: API-01, API-02, API-05, API-06, TYPE-01, TYPE-02, TYPE-03, TYPE-04
**Success Criteria** (what must be TRUE):
  1. Backend returns per-field stats (presence count, unique value count, inferred type) via single aggregation query
  2. Type inference detects STRING, NUMBER, DATE, BOOLEAN from sample values without full-table scan
  3. Field stats endpoint follows existing ownership validation pattern with 404/403 separation
  4. Endpoint applies soft-delete filtering and defense-in-depth validation
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — TDD TypeInferenceService with Brazilian locale support
- [x] 17-02-PLAN.md — Repository aggregation, GetFieldStatsUseCase, and REST endpoint

#### Phase 18: Backend Field Values Endpoint ✓
**Goal**: Paginated distinct values retrieval for specific fields
**Depends on**: Phase 17
**Requirements**: API-03, API-04
**Success Criteria** (what must be TRUE):
  1. Backend returns all distinct values for a specific field key across batch records
  2. Field values endpoint supports pagination (limit/offset) to handle high-cardinality fields
  3. Values are retrieved on-demand (not pre-loaded with stats)
**Plans**: 1 plan

Plans:
- [x] 18-01-PLAN.md — Field values endpoint with search, pagination, and ownership validation

#### Phase 19: Frontend Field Inventory Grid ✓
**Goal**: Card-based field exploration UI with view toggle
**Depends on**: Phase 17
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. User can toggle between table view and field inventory on any batch
  2. Field inventory displays a card per field showing name, type badge, presence stats, unique count
  3. PROFILE_MODE batches default to field inventory view, LIST_MODE defaults to table view
  4. Skeleton cards display while stats are loading
  5. Empty state shows when batch has no fields or no rows
**Plans**: 2 plans

Plans:
- [x] 19-01-PLAN.md — Field stats Zod schema, API endpoint, and React Query hook
- [x] 19-02-PLAN.md — Field inventory grid components, view toggle, and page integration

#### Phase 20: Frontend View Values Side Sheet
**Goal**: Non-modal value exploration with search and copy
**Depends on**: Phases 18, 19
**Requirements**: SHEET-01, SHEET-02, SHEET-03, SHEET-04, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. User can click a field card to open a side sheet showing all values for that field
  2. Side sheet includes debounced search input that filters displayed values
  3. User can copy individual values to clipboard with toast feedback
  4. Side sheet fetches values on demand when opened, not pre-loaded
  5. Loading indicator displays while values are fetching
**Plans**: 2 plans

Plans:
- [ ] 20-01-PLAN.md — Field values Zod schema, API endpoint, useFieldValuesInfinite hook, useDebounce hook
- [ ] 20-02-PLAN.md — FieldValuesSideSheet and FieldValueRow components, Sheet integration into BatchFieldInventory

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19 → 20

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Request-Time User Sync | v1.0 | 2/2 | Complete | 2026-01-28 |
| 2. Frontend API Client | v1.0 | 2/2 | Complete | 2026-01-28 |
| 3. Database & Health | v1.0 | 1/1 | Complete | 2026-01-28 |
| 4. Domain Foundation | v2.0 | 2/2 | Complete | 2026-01-29 |
| 5. Transaction Infrastructure | v2.0 | 1/1 | Complete | 2026-01-29 |
| 6. Strategy Pattern Ingestion | v2.0 | 3/3 | Complete | 2026-01-29 |
| 7. Transactional Use Case | v2.0 | 2/2 | Complete | 2026-01-29 |
| 8. REST Endpoint | v2.0 | 2/2 | Complete | 2026-01-29 |
| 9. File Validation | v2.0 | 1/1 | Complete | 2026-01-29 |
| 10. Testing & Documentation | v2.0 | 1/1 | Complete | 2026-01-29 |
| 11. Batch Read Endpoints | v2.1 | 1/1 | Complete | 2026-01-30 |
| 12. Paginated Rows Endpoint | v2.1 | 1/1 | Complete | 2026-01-30 |
| 13. React Query API Layer | v2.2 | 1/1 | Complete | 2026-01-30 |
| 14. Upload Modal UI | v2.2 | 1/1 | Complete | 2026-01-30 |
| 15. Batch Grid UI | v2.2 | 1/1 | Complete | 2026-01-30 |
| 16. Batch Detail Data Table | v2.2 | 1/1 | Complete | 2026-01-30 |
| 17. Backend Field Stats | v2.3 | 2/2 | Complete | 2026-01-30 |
| 18. Backend Field Values | v2.3 | 1/1 | Complete | 2026-01-31 |
| 19. Frontend Field Inventory | v2.3 | 2/2 | Complete | 2026-02-02 |
| 20. View Values Side Sheet | v2.3 | 0/TBD | Not started | - |
