# Roadmap: Populatte

## Milestones

- ✅ **v1.0 End-to-End Auth & User Sync** - Phases 1-3 (shipped 2026-01-28)
- ✅ **v2.0 Data Ingestion Engine** - Phases 4-10 (shipped 2026-01-29)
- 🚧 **v2.1 Batch Read Layer** - Phases 11-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 End-to-End Auth & User Sync (Phases 1-3) - SHIPPED 2026-01-28</summary>

### Phase 1: Auth Foundation
**Goal**: Clerk-based authentication with JWT validation
**Plans**: 1 plan

Plans:
- [x] 01-01: ClerkAuthGuard, ClerkService, JWT validation

### Phase 2: User Sync
**Goal**: Request-time user synchronization with compare-first optimization
**Plans**: 2 plans

Plans:
- [x] 02-01: SyncUserUseCase, UserRepository with atomic upsert
- [x] 02-02: Auth guard user sync integration

### Phase 3: Type-Safe API Client
**Goal**: Frontend API client with automatic token management and retry
**Plans**: 2 plans

Plans:
- [x] 03-01: Dual API clients (client/server) with 401 retry
- [x] 03-02: TanStack Query integration with Zod validation

</details>

<details>
<summary>✅ v2.0 Data Ingestion Engine (Phases 4-10) - SHIPPED 2026-01-29</summary>

### Phase 4: Domain Foundation
**Goal**: Batch/Row entities and database schema
**Plans**: 2 plans

Plans:
- [x] 04-01: Entities, Drizzle schema, repositories
- [x] 04-02: Chunked bulk insert with transaction support

### Phase 5: Transaction Infrastructure
**Goal**: CLS-based atomic transaction propagation
**Plans**: 1 plan

Plans:
- [x] 05-01: @nestjs-cls/transactional setup with TransactionHost

### Phase 6: Excel Parsing
**Goal**: SheetJS integration with type-safe parsing
**Plans**: 1 plan

Plans:
- [x] 06-01: SheetJS helpers, ArrayBuffer parsing

### Phase 7: Strategy Pattern Foundation
**Goal**: Ingestion strategy interface and registry
**Plans**: 2 plans

Plans:
- [x] 07-01: IngestionStrategy interface, Symbol-based DI
- [x] 07-02: StrategyRegistry with factory pattern

### Phase 8: ListMode Strategy
**Goal**: Header-based single-file parsing
**Plans**: 1 plan

Plans:
- [x] 08-01: ListModeStrategy with header-as-keys logic

### Phase 9: ProfileMode Strategy
**Goal**: Multi-file cell-address parsing
**Plans**: 1 plan

Plans:
- [x] 09-01: ProfileModeStrategy with cell-address keys

### Phase 10: REST Endpoint
**Goal**: POST /projects/:projectId/batches with validation
**Plans**: 4 plans

Plans:
- [x] 10-01: CreateBatchUseCase with ownership validation
- [x] 10-02: Multer file upload integration
- [x] 10-03: Zod DTO validation with custom errors
- [x] 10-04: Magic-byte file validation + size limits

</details>

### 🚧 v2.1 Batch Read Layer (In Progress)

**Milestone Goal:** Close the read cycle — let the dashboard display batch metadata and paginated row data so users can validate extracted Excel data before automation.

#### Phase 11: Repository Layer
**Goal**: Extend repositories with pagination and soft-delete filtering
**Depends on**: Phase 10
**Requirements**: REPO-01, REPO-02
**Success Criteria** (what must be TRUE):
  1. RowRepository can query paginated rows for a batch with total count
  2. All read queries filter out soft-deleted records (batches and rows)
  3. Pagination method accepts limit, offset, and returns { items, total }
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — PaginatedResult type, paginated repository methods, soft-delete audit, ordering fixes

#### Phase 12: Read Endpoints
**Goal**: Batch and row read endpoints with ownership validation
**Depends on**: Phase 11
**Requirements**: BREAD-01, BREAD-02, BREAD-03, RREAD-01, RREAD-02, RREAD-03
**Success Criteria** (what must be TRUE):
  1. User can retrieve single batch metadata via GET /projects/:projectId/batches/:batchId
  2. User can list all batches for a project via GET /projects/:projectId/batches
  3. User can retrieve paginated rows via GET /projects/:projectId/batches/:batchId/rows?limit=N&offset=N
  4. Batch read endpoints return 404 if project not found, 403 if user is not owner
  5. Row responses include pagination metadata (items, total, limit, offset) and are ordered by sourceRowIndex
**Plans**: TBD

Plans:
- [ ] 12-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth Foundation | v1.0 | 1/1 | Complete | 2026-01-28 |
| 2. User Sync | v1.0 | 2/2 | Complete | 2026-01-28 |
| 3. Type-Safe API Client | v1.0 | 2/2 | Complete | 2026-01-28 |
| 4. Domain Foundation | v2.0 | 2/2 | Complete | 2026-01-29 |
| 5. Transaction Infrastructure | v2.0 | 1/1 | Complete | 2026-01-29 |
| 6. Excel Parsing | v2.0 | 1/1 | Complete | 2026-01-29 |
| 7. Strategy Pattern Foundation | v2.0 | 2/2 | Complete | 2026-01-29 |
| 8. ListMode Strategy | v2.0 | 1/1 | Complete | 2026-01-29 |
| 9. ProfileMode Strategy | v2.0 | 1/1 | Complete | 2026-01-29 |
| 10. REST Endpoint | v2.0 | 4/4 | Complete | 2026-01-29 |
| 11. Repository Layer | v2.1 | 1/1 | Complete | 2026-01-30 |
| 12. Read Endpoints | v2.1 | 0/TBD | Not started | - |
