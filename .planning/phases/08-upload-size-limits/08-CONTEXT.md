# Phase 8: Upload Size Limits - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Multer enforces file size and count limits at the interceptor level, rejecting oversized uploads before any parsing occurs. A Content-Length middleware provides early rejection for obviously oversized requests. This phase does NOT add rate limiting, metrics infrastructure, or new validation types (magic-byte validation is Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Error responses
- HTTP 413 Payload Too Large for all limit violations
- Error body includes specific reason: which limit was hit, which file(s) violated it
- Report ALL violations in a single response, not just the first one
- Error body shape matches existing API error format (e.g. `{ statusCode, message, error }`)

### Limit values
- 5MB per individual file (as specified in roadmap)
- 50 files per request (as specified in roadmap)
- No total request size limit — per-file enforcement is sufficient
- Single limit for all modes (50-file cap regardless of mode; strategy-level validation handles list_mode's 1-file restriction)
- Limits configurable via environment variables (not hardcoded)

### Early rejection strategy
- Content-Length middleware checks total request body size before Multer starts buffering
- Middleware scoped to batch upload endpoint only (POST /projects/:projectId/batches)
- Requests without Content-Length header pass through to Multer (no rejection for missing header)
- Multer limits serve as the definitive enforcement layer; Content-Length middleware is an optimization

### Logging & observability
- Log every rejected upload with details: reason, file sizes, which limit was hit
- Include userId (from Clerk auth) in rejection logs for traceability
- Logging is sufficient for MVP — no metrics infrastructure or rate limiting needed

### Claude's Discretion
- Content-Length threshold value for early rejection middleware (sensible default based on configured limits)
- Log level for rejected uploads (warn vs info)
- Exact log message format and structured fields
- Environment variable naming convention (follow existing codebase patterns)

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

*Phase: 08-upload-size-limits*
*Context gathered: 2026-01-29*
