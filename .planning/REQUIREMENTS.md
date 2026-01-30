# Requirements: Populatte v2.3 Field Inventory

**Defined:** 2026-01-30
**Core Value:** Transform tedious manual data entry into automated form population

## v2.3 Requirements

Requirements for Field Inventory milestone. Each maps to roadmap phases.

### Backend API

- [ ] **API-01**: Field stats endpoint returns per-field presence count, unique value count, and inferred type for a batch
- [ ] **API-02**: Field stats query uses single aggregation (CTE/LATERAL join) — no N+1 per-field queries
- [ ] **API-03**: Field values endpoint returns all distinct values for a specific field key across batch records
- [ ] **API-04**: Field values endpoint supports pagination (limit/offset)
- [ ] **API-05**: Both endpoints follow existing ownership validation pattern (project → batch chain, 404/403 separation)
- [ ] **API-06**: Both endpoints apply soft-delete filtering and defense-in-depth (batch.projectId === projectId)

### Type Inference

- [ ] **TYPE-01**: Type inference service detects STRING, NUMBER, DATE, BOOLEAN from sample values
- [ ] **TYPE-02**: Type inference uses sample-based heuristics (5 values), not full-table scan
- [ ] **TYPE-03**: Type inference lives in use case layer (not repository) per Clean Architecture
- [ ] **TYPE-04**: Field stats response includes inferred type per field

### Field Inventory UI

- [ ] **UI-01**: Field Inventory grid displays a card per field from batch columnMetadata
- [ ] **UI-02**: Each field card shows field name, type badge, presence count (X of Y records), and unique value count
- [ ] **UI-03**: View toggle switches between table view and field inventory on any batch
- [ ] **UI-04**: PROFILE_MODE batches default to field inventory view, LIST_MODE defaults to table view
- [ ] **UI-05**: Field cards are responsive (1 column mobile, 2 tablet, 3+ desktop)

### View Values Side Sheet

- [ ] **SHEET-01**: Clicking a field card opens a side sheet showing all values for that field
- [ ] **SHEET-02**: Side sheet includes debounced search input to filter displayed values
- [ ] **SHEET-03**: Each value row has a copy button that copies to clipboard with toast feedback
- [ ] **SHEET-04**: Side sheet fetches values on demand (only when opened, not pre-loaded)

### Loading & Empty States

- [ ] **UX-01**: Skeleton cards display while field stats are loading
- [ ] **UX-02**: Empty state shows when batch has no fields or no rows
- [ ] **UX-03**: Loading indicator in side sheet while values are fetching
- [ ] **UX-04**: Empty state in side sheet when field has no values

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Enhanced Type Detection

- **TYPE-05**: Detect domain-specific types (CPF, CNPJ, EMAIL, PHONE) via regex patterns
- **TYPE-06**: Return type confidence percentage (e.g., "80% match EMAIL pattern")

### Field Inventory Enhancements

- **UI-06**: Completeness heatmap gradient on field cards (red/yellow/green by presence ratio)
- **UI-07**: Sort/filter controls for field grid (A-Z, completeness, unique count)
- **UI-08**: Example values preview on field card (2-3 sample values without clicking)
- **UI-09**: Bulk copy all values (comma-separated or newline-separated)

### Performance

- **PERF-01**: GIN index on JSONB data column for field stats query optimization
- **PERF-02**: Virtual scrolling for value lists with 1000+ items

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Statistical distribution charts (histograms, box plots) | Populatte is for form-mapping preparation, not statistical analysis |
| Editable field values | Source of truth is Excel — edit there and re-upload |
| Auto data quality issue detection | We don't own data quality; users upload as-is |
| Pivot/aggregation features | Not a BI tool |
| Multi-batch field comparison | Single batch view sufficient for MVP |
| Automatic field-to-form mapping | Mapping happens in browser extension (future milestone) |
| Field-to-field relationship detection | Requires statistical library, deferred post-MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| API-01 | — | Pending |
| API-02 | — | Pending |
| API-03 | — | Pending |
| API-04 | — | Pending |
| API-05 | — | Pending |
| API-06 | — | Pending |
| TYPE-01 | — | Pending |
| TYPE-02 | — | Pending |
| TYPE-03 | — | Pending |
| TYPE-04 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |
| UI-04 | — | Pending |
| UI-05 | — | Pending |
| SHEET-01 | — | Pending |
| SHEET-02 | — | Pending |
| SHEET-03 | — | Pending |
| SHEET-04 | — | Pending |
| UX-01 | — | Pending |
| UX-02 | — | Pending |
| UX-03 | — | Pending |
| UX-04 | — | Pending |

**Coverage:**
- v2.3 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after initial definition*
