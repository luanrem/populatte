# Phase 11: Repository Layer - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend batch and row repositories with paginated read methods and soft-delete filtering. All read queries must exclude soft-deleted records. Rows are paginated with total count. This phase does NOT add endpoints — Phase 12 consumes these repository methods.

</domain>

<decisions>
## Implementation Decisions

### Pagination defaults
- Default page size: 50 items when no limit is provided
- Maximum allowed limit: 100 items (hard cap)
- Invalid limit/offset values (negative, non-numeric, over-max): reject with 400 error
- Offset exceeding total records: return `{ items: [], total: N }` — not an error

### Soft-delete filtering
- All read queries automatically filter out soft-deleted records — no opt-in/opt-out flag
- Only batches have `deletedAt` column; rows do NOT have their own `deletedAt`
- Rows inherit soft-delete status from their parent batch — filter via batch's `deletedAt`
- Row queries trust the caller (use case/endpoint) to have already verified the batch isn't deleted — no JOIN-based re-check
- Soft-delete filter applied inline per query (`.where(isNull(deletedAt))`) — not a reusable clause builder
- All existing read methods (from Phase 4) must be updated to include soft-delete filtering
- Projects also have/will have `deletedAt` — add project soft-delete filtering in this phase since batch reads depend on the parent project

### Sort ordering
- Rows: fixed sort by `sourceRowIndex ASC`, tiebreaker `id ASC`
- Batches: fixed sort by `createdAt DESC` (newest first)
- No custom sort parameters — sort order is fixed per entity

### Query return shape
- Repository methods return `{ items, total }` — the use case or controller adds `limit` and `offset` to produce the final response shape `{ items, total, limit, offset }`
- Use a generic `PaginatedResult<T>` type with `items: T[]` and `total: number`
- `PaginatedResult<T>` lives in `packages/types` (shared across all apps)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-repository-layer*
*Context gathered: 2026-01-30*
