# Phase 30: Backend Foundation - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

CRUD endpoints for projects and batches (update, soft-delete), plus batch identifier configuration for meaningful row identification in the extension. This phase adds update/delete operations to existing infrastructure and introduces identifier field storage.

</domain>

<decisions>
## Implementation Decisions

### Deletion behavior
- Project deletion cascades: soft-deletes all batches and their rows
- Batch deletion does NOT affect mappings (mappings are project siblings, not batch children)
- Batch deletion soft-deletes the batch and its rows only
- No restore/undelete functionality — soft-delete is permanent from user perspective

### Name validation
- Project and batch names: min 1 char, max 100 chars
- No uniqueness constraint — duplicates allowed
- No special character restrictions

### Identifier configuration
- Exactly 2 identifier fields per batch: primary and secondary
- Both are optional — batch can have no identifiers (extension shows row number only)
- Identifier column names must exist in batch columns — API returns 400 if not found
- Validation happens at configuration time, not at display time

### Claude's Discretion
- Exact error message wording
- HTTP status codes for edge cases
- Internal soft-delete implementation (timestamp vs boolean)

</decisions>

<specifics>
## Specific Ideas

- Mappings belong to project, not batch — this is a sibling relationship, not parent-child
- Extension will display identifier values below row number when configured

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-backend-foundation*
*Context gathered: 2026-02-04*
