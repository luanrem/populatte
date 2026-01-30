# Phase 1: Domain Foundation and Database Schema - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Core entities (Batch, Row), repository interfaces, Drizzle schema with migrations, and repository implementations for the ingestion pipeline. Follows established Clean Architecture patterns from v1.0. No parsing logic, no transaction infrastructure, no HTTP layer.

</domain>

<decisions>
## Implementation Decisions

### Entity field design — Batch
- **Timestamps:** `createdAt` + `updatedAt` (consistent with existing entities)
- **Status enum:** `PENDING_REVIEW`, `COMPLETED`, `FAILED` (SCREAMING_SNAKE_CASE)
- **Status flow:** Upload → `PENDING_REVIEW` → user approves → `COMPLETED`. Failed uploads → `FAILED`.
- **Soft delete:** `deletedAt` timestamp + `deletedBy` userId for audit trail
- **Column metadata:** Richer JSONB field on batch — stores column information with original headers, normalized keys, inferred types, and positions
- **File names:** NOT stored on batch — derive from rows via `sourceFileName`
- **Other fields (from roadmap):** id, projectId, userId, mode, fileCount, rowCount

### Entity field design — Row
- **Timestamps:** `createdAt` + `updatedAt`
- **Status enum:** `VALID`, `WARNING`, `ERROR` (SCREAMING_SNAKE_CASE)
- **Validation messages:** JSONB array of structured objects (e.g., `[{field: "cpf", type: "empty", message: "Empty field"}]`)
- **Soft delete:** `deletedAt` timestamp (both batches and rows support soft delete)
- **Source traceability:** `sourceFileName` + `sourceSheetName` + `sourceRowIndex`
- **Other fields (from roadmap):** id, batchId, data as JSONB

### JSONB data shape
- **List mode keys:** Normalized — lowercase, trim whitespace, replace spaces with underscores (e.g., "Full Name" → "full_name")
- **Original headers:** Preserved in batch column metadata (not duplicated per row)
- **Profile mode structure:** Claude's discretion on flat cell-address keys vs grouped by row — user showed preference for grouped but deferred final call
- **Value types:** Preserve original types — numbers as numbers, dates as ISO strings, booleans as booleans
- **Empty cells:** Stored as `null` — every column has a key in every row for consistent shape
- **Undefined normalization:** All `undefined` values normalized to `null` before JSONB storage (Pitfall 11)

### Naming conventions
- **Table names:** `ingestion_batches`, `ingestion_rows` (domain-prefixed, plural)
- **Column casing:** snake_case in SQL, camelCase in TypeScript (matches existing users/projects pattern)
- **Enum values:** SCREAMING_SNAKE_CASE (e.g., `PENDING_REVIEW`, `LIST_MODE`, `VALID`)
- **Entity classes:** PascalCase (`Batch`, `Row`)
- **Repository classes:** `BatchRepository` (abstract), `DrizzleBatchRepository` (implementation)

### Delete/cascade behavior
- **Project → Batches:** Cascade soft delete — soft-deleting a project also soft-deletes all its batches
- **Batch → Rows:** Rows stay when batch is soft-deleted — batch is hidden but rows remain for restoration
- **Hard delete:** Not supported — soft delete only. No permanent deletion mechanism.
- **FK constraints:** `ON DELETE RESTRICT` — database prevents accidental hard deletion of parents with children
- **Soft delete queries:** All queries must filter `WHERE deleted_at IS NULL` by default (consistent with existing users pattern)

### Claude's Discretion
- Column metadata JSONB shape (array of objects vs map by key) — pick what works best for downstream consumers
- Profile mode data structure (flat cell-address keys vs grouped by row) — user leaned toward grouped but deferred
- Exact index strategy for new tables
- Chunking implementation details for `createMany()` (Pitfall 5)

</decisions>

<specifics>
## Specific Ideas

- Batch status should support a review workflow: uploads land in `PENDING_REVIEW`, user approves to `COMPLETED`
- Validation messages should be structured enough for the web dashboard to display field-level warnings
- Row traceability should include sheet name and row index — users need to trace back to exact Excel location
- All soft deletes on batches should track who deleted (`deletedBy`) for audit purposes
- Follow existing codebase patterns exactly (users.schema.ts as reference)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-domain-foundation*
*Context gathered: 2026-01-29*
