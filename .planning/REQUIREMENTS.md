# Requirements: Populatte

**Defined:** 2026-01-29
**Core Value:** Transform tedious manual data entry into automated form population.

## v2.1 Requirements

Requirements for Batch Read Layer milestone. Closes the read cycle for ingested data.

### Batch Read

- [ ] **BREAD-01**: User can retrieve a single batch's metadata (mode, status, fileCount, rowCount, columnMetadata, timestamps) via `GET /projects/:projectId/batches/:batchId`
- [ ] **BREAD-02**: User can list all batches for a project via `GET /projects/:projectId/batches` (ordered by creation date, excludes soft-deleted)
- [ ] **BREAD-03**: Batch read endpoints enforce ownership validation — 404 if project not found, 403 if user is not owner

### Row Read

- [ ] **RREAD-01**: User can retrieve paginated rows for a batch via `GET /projects/:projectId/batches/:batchId/rows?limit=N&offset=N`
- [ ] **RREAD-02**: Rows are ordered by `sourceRowIndex` to preserve original Excel order
- [ ] **RREAD-03**: Response includes pagination metadata: `{ items: Row[], total: number, limit: number, offset: number }`

### Repository Layer

- [ ] **REPO-01**: `RowRepository` extended with paginated query method (`findByBatchIdPaginated`) accepting limit, offset, returning rows + total count
- [ ] **REPO-02**: All read queries filter out soft-deleted records (`deletedAt IS NULL`)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Row Management

- **RMGMT-01**: User can update row status (DRAFT → VALID, DRAFT → ERROR)
- **RMGMT-02**: User can filter rows by status
- **RMGMT-03**: User can search rows by data content

### Batch Management

- **BMGMT-01**: User can soft-delete a batch
- **BMGMT-02**: User can re-upload files to an existing batch

## Out of Scope

| Feature | Reason |
|---------|--------|
| Row editing (modify JSONB data) | Write operations deferred to future milestone |
| Batch export (download as Excel) | Not needed until extension integration |
| Real-time batch status updates | WebSocket/SSE complexity, polling sufficient for MVP |
| Row-level validation execution | Validation engine is a separate milestone |
| Frontend components for batch display | Backend-only milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REPO-01 | Phase 11 | Pending |
| REPO-02 | Phase 11 | Pending |
| BREAD-01 | Phase 12 | Pending |
| BREAD-02 | Phase 12 | Pending |
| BREAD-03 | Phase 12 | Pending |
| RREAD-01 | Phase 12 | Pending |
| RREAD-02 | Phase 12 | Pending |
| RREAD-03 | Phase 12 | Pending |

**Coverage:**
- v2.1 requirements: 8 total
- Mapped to phases: 8/8 ✓
- Unmapped: 0

**Phase Mapping:**
- Phase 11 (Repository Layer): 2 requirements
- Phase 12 (Read Endpoints): 6 requirements

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-30 after roadmap creation*
