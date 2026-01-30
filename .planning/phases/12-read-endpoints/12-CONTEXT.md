# Phase 12: Read Endpoints - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

HTTP endpoints for reading batch metadata and paginated row data with ownership validation. Three endpoints: single batch detail, batch list for a project, and paginated rows for a batch. All scoped to authenticated user's projects.

</domain>

<decisions>
## Implementation Decisions

### Response shape
- Single batch response includes all batch fields + totalRows count (computed)
- Row response uses flat structure: `{ id, sourceRowIndex, data: { col1: val1, ... }, createdAt }`
- Batch list returns full batch objects (same shape as single batch, including totalRows)
- Timestamps returned as ISO 8601 strings (e.g., `"2026-01-30T14:30:00.000Z"`)
- Soft-deleted records never appear in responses — no deletedAt field exposed
- sourceRowIndex included in row responses so frontend can reference original Excel row position

### Pagination defaults
- Default page size: 50 rows
- Maximum allowed limit: 100 rows per request
- Batch list endpoint is also paginated (same pattern as rows)
- Response envelope: `{ items, total, limit, offset }` — flat structure, pagination metadata at same level as items

### Error responses
- NestJS default exception format: `{ statusCode, message, error }` — no custom wrapper
- Entity-aware generic messages: "Batch not found" (names entity type, not the ID)
- 403 Forbidden when user tries to access another user's project (explicit, not hidden as 404)
- 400 Bad Request for invalid pagination parameters (negative limit, non-numeric offset) with validation error message — no silent fallback to defaults

### Batch list behavior
- Fixed sort order: createdAt DESC (newest first) — no sort parameter
- Each batch in the list includes totalRows count
- Empty project returns standard paginated response: `{ items: [], total: 0, limit: 50, offset: 0 }`

### Claude's Discretion
- Use case internal structure and naming
- Controller/DTO organization
- How to compute totalRows efficiently (subquery, join, or separate count)
- Zod schema design for query parameter validation

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing patterns established in Phase 10 (POST /projects/:projectId/batches) for controller structure, validation, and ownership checks.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-read-endpoints*
*Context gathered: 2026-01-30*
