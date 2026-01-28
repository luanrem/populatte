# Phase 1: Prerequisites - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure Clerk JWT Template to include user profile data and ensure database upsert pattern handles concurrent requests atomically. This phase establishes the foundation for user sync — no sync logic implementation yet.

</domain>

<decisions>
## Implementation Decisions

### JWT claims scope
- Include: email, firstName, lastName, imageUrl, publicMetadata, createdAt, emailVerified
- Use camelCase for claim names (matches TypeScript/JavaScript conventions)
- Clerk ID via standard `sub` claim
- Generate fallback avatar URL using UI Avatars (initials-based) when imageUrl is null

### Upsert field behavior
- Update only changed fields on sync (not all fields every time)
- Design for extensibility — easy to add local-only fields later without rework
- Track `lastSyncedAt` timestamp for debugging and stale data detection
- Use internal UUID as primary key, clerkId as unique column (decoupled from Clerk)
- Wrap upsert in transaction from the start (ready for related records later)
- Support soft delete with `deletedAt` column
- Track `source` field for audit (e.g., 'clerk_sync', 'manual', 'import')

### Validation strictness
- Reject request (401) if required claims (email) are missing — fail fast
- Missing claims = invalid token configuration, force fix at source

### Claude's Discretion
- Whether email changes sync immediately or preserve original (typical pattern: sync)
- Sync frequency: every request vs throttled by time (evaluate based on volume)
- Database unreachable handling: fail vs degraded mode (evaluate reliability needs)
- Optional claims (firstName, lastName) storage: null vs empty string
- JWT signature validation: own validation vs trust Clerk middleware
- Error message detail level in dev vs production

</decisions>

<specifics>
## Specific Ideas

- "Eu quero que tenha a possibilidade de ser fácil de adicionar mais campos depois quando necessário" — design upsert to be extensible for local-only fields

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-prerequisites*
*Context gathered: 2026-01-28*
