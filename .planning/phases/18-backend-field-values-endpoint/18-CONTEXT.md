# Phase 18: Backend Field Values Endpoint - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Paginated distinct values retrieval for a specific field within a batch. Users request values on-demand (not pre-loaded with stats). This is the backend API that Phase 20's side sheet will consume.

</domain>

<decisions>
## Implementation Decisions

### Query behavior
- Null and empty cells are **excluded** — only return cells with actual non-empty content
- Distinct values are **case-sensitive** — 'São Paulo' and 'são paulo' are separate entries
- **Server-side search** via ILIKE `%term%` (contains match) — handles high-cardinality fields
- Search is **case-insensitive** even though values themselves are case-sensitive
- Default sort order: **alphabetical (A→Z)**
- Response includes **both totals**: total matching distinct values AND total overall distinct values (enables "showing 5 of 12 matches (47 total)" in UI)

### Endpoint design
- URL structure: `GET /batches/:batchId/fields/:fieldKey/values` — field key as URL-encoded path param
- Field keys use the actual Excel column header names, URL-encoded (e.g., `Nome%20Completo`)
- Default page size: **50 values per page**
- Pagination via limit/offset query params
- Search via `search` query param
- **404 Not Found** when field key doesn't exist in the batch
- Follows existing ownership validation pattern (404/403 separation)

### Claude's Discretion
- Response shape details (field naming, envelope structure)
- SQL query optimization strategy
- Validation details (max page size, search term length limits)
- Whether to reuse existing PaginatedResult pattern or create field-specific variant

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Should follow the patterns established in Phase 17 (field stats) and Phase 12 (paginated rows).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-backend-field-values-endpoint*
*Context gathered: 2026-01-30*
