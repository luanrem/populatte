# Phase 10: Batch DTO Validation - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Zod v4 schema validates the `mode` field on batch creation requests, and the controller delegates to `CreateBatchUseCase` without containing any parsing or persistence logic. This is presentation-layer validation only — no new capabilities, no business logic changes.

</domain>

<decisions>
## Implementation Decisions

### Validation error format
- Keep current `{message: 'Validation failed', errors: [{field, message}]}` structure
- NestJS default behavior preserved — `statusCode` included in response body via `BadRequestException`
- Claude's discretion on error messages for missing/invalid mode field (custom vs Zod defaults)
- Claude's discretion on whether file-related validation errors use the same structured format

### Pipe vs inline validation
- Claude's discretion on whether to use `ZodValidationPipe` or keep inline try/catch — pick what works cleanly with multipart form-data
- Claude's discretion on whether to also validate `projectId` as UUID at controller level
- Claude's discretion on where file-presence check lives (controller vs use case)
- Reuse existing generic `ZodValidationPipe` — no batch-specific pipe

### Zod v4 migration
- Claude's discretion on whether to actually upgrade Zod package to v4 or just ensure v4-compatible API usage
- ZodValidationPipe must be updated to use Zod v4 error API explicitly (`result.error.issues`)
- Claude's discretion on auditing other API schemas for v4 compatibility (minimal scope preferred)
- Only `apps/api` is in scope — `packages/commons` Zod schemas are NOT touched in this phase

### Claude's Discretion
- Error messages for missing/invalid mode (custom vs Zod defaults)
- File validation error format consistency
- Pipe vs inline decision based on multipart form-data compatibility
- ProjectId UUID validation at controller level
- File-presence check location (controller vs use case)
- Zod v4 upgrade vs v4-compatible API only
- Whether to audit other API Zod schemas

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The phase is narrow: ensure the DTO validates properly with Zod v4 API and the controller stays thin.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-batch-dto-validation*
*Context gathered: 2026-01-29*
