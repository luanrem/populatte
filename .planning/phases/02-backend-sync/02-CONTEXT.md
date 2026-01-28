# Phase 2: Backend Sync - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Guard-based user synchronization — every authenticated request gets a full User entity attached to the request. Controllers never manually fetch users. ClerkAuthGuard handles creation, update detection, and entity attachment. Covers sync logic, error handling, type updates, and the CurrentUser decorator.

</domain>

<decisions>
## Implementation Decisions

### Sync trigger logic
- Compare-first approach: fetch stored user, compare JWT claims against stored profile fields, only write on mismatch
- Auto-create users on first request — no separate registration flow needed
- Comparison scope: profile fields only (email, firstName, lastName, imageUrl) — clerkId is the lookup key, not a compared field
- Log when sync updates are performed (not just errors) — aids debugging and auditing

### Failure behavior
- Claude's discretion on whether to block with 503 or let through with stale data when DB is unreachable
- Claude's discretion on error message detail level (generic vs category hint)
- Claude's discretion on handling missing JWT claims (reject vs proceed with partial)
- Sync failures tracked via logs AND health check endpoint — expose sync failure rate for monitoring

### Data freshness policy
- Claude decides which of the four JWT claim fields to sync (email, firstName, lastName, imageUrl) based on schema and Phase 1 setup
- Claude decides the update pattern (read-then-write vs always-upsert) — should align with compare-first trigger logic
- Email is always synced to latest — local DB mirrors Clerk, no immutability after creation
- No dedicated lastSyncedAt field — use existing updatedAt column to track when record changed

### Guard-to-request handoff
- Claude decides return shape (full entity vs curated DTO) based on Clean Architecture principles
- Claude decides public route behavior (guarded-only vs optional user) based on NestJS patterns
- Claude decides request attachment location (request.user vs custom property) based on existing codebase
- Claude decides decorator API (whole user only vs field extraction overloads) based on simplicity and patterns

### Claude's Discretion
- Full entity vs curated DTO for CurrentUser return type
- request.user vs custom property for attachment location
- Decorator overloads (field extraction) vs simple whole-user return
- Public route CurrentUser behavior (null vs throw)
- DB unreachable strategy (503 block vs stale passthrough)
- Error message verbosity (generic vs category hint)
- Missing JWT claims handling (reject vs partial)
- Update pattern implementation (read-then-write vs upsert) — must support compare-first logic
- Soft-deleted user re-activation policy
- Caching/comparison strategy for the compare-first check

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User cares about:
- Observability: sync updates should be logged, sync failures should be trackable via health check
- Data consistency: email always mirrors Clerk, comparison is profile-fields-only
- Simplicity: no dedicated lastSyncedAt — reuse updatedAt

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-backend-sync*
*Context gathered: 2026-01-28*
