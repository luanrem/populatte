# Phase 7: Batch Endpoint - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

HTTP endpoint that accepts multipart file uploads with Clerk authentication and delegates to CreateBatchUseCase. Returns batch creation result. No parsing logic, no validation beyond auth — those belong in Phases 8-10.

</domain>

<decisions>
## Implementation Decisions

### Response shape
- HTTP 201 Created on success
- Response body: `{ batchId, rowCount, createdAt }`
- Include `Location` header pointing to created batch resource (`/projects/:projectId/batches/:batchId`)
- Response envelope format: match existing API controller patterns (check what other controllers return)

### Error responses
- Error shape: match existing API error format (check existing exception filters/patterns)
- Project not found: 404 Not Found
- User doesn't own project: 403 Forbidden (do not hide existence)
- Excel parsing failure (corrupt file, empty sheets): 400 Bad Request
- Missing/invalid auth token: 401 Unauthorized

### Route design
- URL: `POST /projects/:projectId/batches` (as specified in roadmap)
- Multer field name for uploaded files: `documents`
- Both `list_mode` and `profile_mode` accepted from day one
- Mode field delivery method: Claude's discretion (form field in body vs query parameter — pick based on REST conventions)

### Controller structure
- Follow SOLID principles and existing codebase structure to decide whether standalone BatchController or nested — Claude's discretion

### Claude's Discretion
- Mode field delivery method (form field vs query param)
- Controller organization (standalone vs nested)
- Ownership validation placement (controller guard vs use case — follow Clean Architecture)
- UserId extraction method (follow existing pattern or create decorator)
- ClerkAuthGuard application level (follow existing controller patterns)

</decisions>

<specifics>
## Specific Ideas

- User wants clear separation of HTTP status codes: 401 (no auth), 403 (not owner), 404 (not found), 400 (bad data)
- User prefers "documents" over "files" as the upload field name for semantic clarity
- createdAt included in response for client-side display
- Location header for proper REST 201 semantics

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-batch-endpoint*
*Context gathered: 2026-01-29*
