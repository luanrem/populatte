# Phase 22: Mapping CRUD - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete mapping lifecycle with ownership validation and soft-delete. Users can create, list, view, update, and soft-delete mappings for their projects. This phase delivers the CRUD layer; step management is Phase 23.

</domain>

<decisions>
## Implementation Decisions

### List/filter behavior
- Default sort by createdAt DESC (most recent first)
- Inverted URL prefix matching: extension passes current page URL, find mappings where `currentUrl.startsWith(mapping.targetUrl)`
  - SQL: `WHERE :providedUrl LIKE (targetUrl || '%')`
- Return all matching mappings when URL filter is used (not just best match)
- Offset/limit pagination with default 20, max 100 items per page
- Optional `?isActive=true|false` filter; default shows all active (non-deleted)
- URL filter is optional — no filter returns all mappings for project
- Include `stepCount` in list response items

### Soft-delete semantics
- Steps remain untouched when mapping is soft-deleted (mapping's deletedAt makes them inaccessible)
- No restore endpoint in v3.0 — soft-delete is final for this milestone
- Deleted mappings are completely hidden from all endpoints
- GET/UPDATE/DELETE on soft-deleted mapping returns 404 Not Found

### Validation rules
- targetUrl must be a valid URL format with protocol (http:// or https://)
- Mapping name: min 3, max 100 characters
- Duplicate names allowed within same project
- Duplicate targetUrls allowed within same project
- successTrigger uses strict enum validation — only defined values accepted
- isActive defaults to true on create
- Empty strings coerced to null for optional fields (e.g., successTrigger)

### Response structure
- List items include: id, name, targetUrl, isActive, stepCount, createdAt, updatedAt
- List response includes pagination metadata: `{items: [...], total: number, page: number, limit: number}`
- GET detail includes full steps array ordered by stepOrder
- Create/update responses return full mapping entity

### Claude's Discretion
- Exact pagination response field naming (match existing patterns)
- Error message wording for validation failures
- DTO class naming conventions

</decisions>

<specifics>
## Specific Ideas

- URL matching logic is inverted from typical "filter by prefix" — the stored targetUrl acts as the prefix, and we check if the provided URL starts with it
- This enables matching regardless of query strings or sub-paths

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-mapping-crud*
*Context gathered: 2026-02-03*
