# Phase 5: CreateBatch Use Case - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Transactional use case that validates project ownership, orchestrates ingestion via IngestionService, and guarantees atomic commit/rollback of batch + rows. No controller, no HTTP layer, no file validation -- those are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Ownership validation
- Simple userId match: Project has a userId field, use case checks if request user matches
- Separate error checks: 404 if project not found, 403 if user doesn't own it
- Use existing ProjectRepository.findById to look up the project
- Log unauthorized access attempts at WARN level (userId + projectId) for security auditing
- Soft-deleted projects return a specific error message (e.g., "Project is archived") rather than generic 404
- Throw 403 Forbidden when user doesn't own the project (not 404)

### Use case response shape
- Return minimal summary: batchId, rowCount, mode, fileCount
- Controller maps use case result to a response DTO (decoupling domain from HTTP response)
- Whether to use a dedicated result type or plain object: Claude's discretion based on existing patterns

### Error handling behavior
- Use case validates mode (list_mode / profile_mode) and throws domain error if invalid
- Parsing failures throw a custom domain error (e.g., IngestionError) with clear message including source filename
- Error messages include which file caused the failure for user traceability
- File count validation for list_mode stays in IngestionService (Phase 3) -- use case trusts IngestionService for that

### Batch metadata
- No extra metadata beyond existing fields (id, projectId, userId, mode, fileCount, rowCount) for MVP
- IngestionService provides fileCount and rowCount as part of its result -- use case passes them through
- Batch has a status field with three states: PROCESSING, COMPLETED, FAILED
  - Created as PROCESSING, set to COMPLETED on success, FAILED on error
  - Enables future async processing scenarios

### Claude's Discretion
- Whether to use a dedicated CreateBatchResult type or plain object
- Exact domain error class naming and hierarchy
- Transaction boundary placement details (as long as @Transactional() wraps the full operation)

</decisions>

<specifics>
## Specific Ideas

- Ownership check should be two separate queries: first find project (404 if missing), then compare userId (403 if mismatch)
- WARN-level logging on 403 for security auditing -- log both the requesting userId and the target projectId
- Soft-deleted projects get a distinct error message, not lumped in with "not found"
- Status field (PROCESSING/COMPLETED/FAILED) added to batch entity for lifecycle tracking

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 05-createbatch-use-case*
*Context gathered: 2026-01-29*
