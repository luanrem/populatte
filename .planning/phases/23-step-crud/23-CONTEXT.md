# Phase 23: Step CRUD - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Manage ordered steps within mappings — users can add, update, delete, and reorder individual automation actions (fill/click/wait/verify) that comprise a mapping recipe. All step operations enforce the full ownership chain: step belongs to mapping, mapping belongs to project, project belongs to user.

</domain>

<decisions>
## Implementation Decisions

### Reorder design
- Full ID array approach: client sends complete ordered list of step IDs, server reorders all at once
- Strict validation: array must contain ALL step IDs for that mapping — reject if any missing, extra, or duplicate
- Contiguous ordering after reorder: reset to sequential integers (1, 2, 3...)
- New steps always added at end (max(stepOrder) + 1)
- Deletion leaves gaps in stepOrder (no auto-compact until explicit reorder)
- Reorder returns all updated steps with new order values
- Atomic transaction: if any step ID invalid, reject entire reorder — no partial state
- Reject with 400 error if duplicate IDs in array

### Validation rules
- sourceFieldKey vs fixedValue: allow neither (both can be null for click/wait actions that don't need a value), but still reject if both provided
- sourceFieldKey not validated against project's actual field keys — just store the string, validation happens at runtime in extension
- Selector field: non-empty string only — CSS/XPath syntax validated by extension, not backend
- Action-specific config: loose validation — config is optional JSON, extension interprets at runtime

### Bulk operations
- No batch operations: single step create/update/delete only
- Extension makes multiple calls when needed
- No "clear all steps" endpoint — user must delete steps one by one

### Cascade behavior
- Steps inaccessible when parent mapping is soft-deleted (step endpoints return 404)
- Step deletion is hard delete (permanently removed from database)
- No mapping restore functionality — soft-delete is permanent for mappings
- Steps always included in mapping GET response (ordered by stepOrder)
- No separate list endpoint for steps — access only through mapping GET
- Step endpoints nested under mapping route: POST /mappings/:mappingId/steps
- Step create/update returns just the affected step (not full mapping)
- Step delete returns 204 No Content (no body)

### Claude's Discretion
- Error message wording and HTTP status codes for edge cases
- Transaction implementation details
- DTO naming conventions (following existing patterns)

</decisions>

<specifics>
## Specific Ideas

- Reorder should feel like drag-and-drop in the extension UI — full array sent on drop
- Defense-in-depth: every step operation must verify the entire ownership chain (step → mapping → project → user)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-step-crud*
*Context gathered: 2026-02-03*
