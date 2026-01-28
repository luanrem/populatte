# Project Research Summary

**Project:** Populatte - Request-Time User Synchronization
**Domain:** NestJS Authentication with Clerk Integration
**Researched:** 2026-01-28
**Confidence:** HIGH

## Executive Summary

This research covers implementing request-time user synchronization in Populatte's NestJS API with Clerk authentication. The goal is straightforward: when a user makes an authenticated request, ensure their local database record exists and contains current profile data (email, name, imageUrl) extracted from the Clerk JWT. This eliminates the race condition where users authenticate before webhook events create their database records.

The recommended approach is a **guard-based sync pattern** where the existing `ClerkAuthGuard` is enhanced to call `SyncUserUseCase` and attach the full `User` entity to the request. This keeps the implementation simple and leverages existing infrastructure. The alternative interceptor-based approach (suggested in ARCHITECTURE.md) adds separation of concerns but increases complexity for minimal benefit in this case. Since the guard already handles authentication and has access to JWT claims, extending it to handle sync maintains cohesion.

The critical prerequisites before writing any code are: (1) configure a Clerk JWT Template to include email, firstName, lastName, and imageUrl claims, and (2) ensure the database schema uses upsert (INSERT ON CONFLICT) to handle concurrent requests atomically. Skipping either of these will cause silent data quality issues or intermittent 500 errors.

## Key Findings

### Recommended Stack

The existing stack is complete for request-time sync. No new packages are required. The key technologies are already installed and well-suited for the task.

**Core technologies:**
- `@clerk/backend` (^2.29.3): JWT verification via `verifyToken()` - already handles signature verification correctly
- `@nestjs/common` (^11.0.1): Guard and DI infrastructure - guards are the correct primitive for auth
- `drizzle-orm` (^0.45.1): Database operations with `onConflictDoUpdate()` for atomic upsert

**Critical configuration (not code):**
- Clerk JWT Template must be configured in Clerk Dashboard to include user profile claims
- Without this, JWT only contains `sub` (clerkId), and sync produces users with null metadata

### Expected Features

**Must have (table stakes):**
- Guard-based user sync - eliminates race condition where user authenticates before webhook arrives
- Full User entity on request - controllers need internal User (with DB id), not just clerkId
- JWT claim extraction - email/name/imageUrl from token enables sync without Clerk API call
- Type-safe CurrentUser decorator - strongly-typed `@CurrentUser()` returning `User` entity
- Idempotent user creation - concurrent requests for same user must not create duplicates

**Should have (better DX):**
- API client with token injection - fetch wrapper using `useAuth().getToken()`
- 401 retry logic - single retry after token refresh on 401
- Request-scoped caching - ensure guard only syncs once per request (if multiple guards evaluated)

**Defer (v2+):**
- Selective sync with lastSyncedAt - measure if DB writes are actually a problem first
- Audit logging - add when observability infrastructure exists
- Metadata sync from Clerk - wait until there is a use case for publicMetadata/privateMetadata
- SkipUserSync decorator - premature optimization, add only if specific routes need it

### Architecture Approach

The research presents two valid approaches: guard-based (STACK.md) and interceptor-based (ARCHITECTURE.md). **Recommendation: Use guard-based approach for this milestone.** The guard already verifies the JWT and has access to claims. Adding sync logic keeps authentication concerns cohesive. Interceptor separation is cleaner architecturally but adds indirection for a simple use case. If sync logic grows complex, refactor to interceptor later.

**Major components:**
1. `ClerkAuthGuard` - Verify JWT, extract claims, call SyncUserUseCase, attach User entity to request
2. `SyncUserUseCase` - Upsert user in database using claims from JWT (already exists, no changes needed)
3. `ClerkService` - Extend `ClerkTokenPayload` interface to include email/firstName/lastName/imageUrl
4. `@CurrentUser()` decorator - Update to return full `User` entity (type change only)
5. `AuthenticatedRequest` interface - Change `user` from `{ clerkId: string }` to `User` entity

### Critical Pitfalls

1. **JWT Claims Missing User Data** - Clerk's default JWT only includes `sub` (clerkId). Configure JWT Template in Clerk Dashboard FIRST with email, firstName, lastName, imageUrl. Without this, sync creates users with null metadata.

2. **Concurrent Request Race Condition** - Two requests for new user both check if user exists (null), both try to create, second fails. Use PostgreSQL `INSERT ON CONFLICT DO UPDATE` (upsert) instead of check-then-act pattern. This is atomic at database level.

3. **Guard Exception Handling Leaks Errors** - If sync fails (database down), raw error might leak to client. Wrap sync in try-catch, log actual error, throw `ServiceUnavailableException` with generic message.

4. **Request-Scoped Provider Cascade** - Making guard or use case request-scoped causes entire dependency chain to become request-scoped, impacting performance. Keep all providers as singletons (default). Pass request-specific data as method parameters.

5. **Session Token Size Limit** - Cookies cap at 4KB. Keep JWT Template claims minimal. Only include email, firstName, lastName, imageUrl. Never include large metadata objects.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Prerequisites and Configuration

**Rationale:** All code changes depend on JWT Template being configured. This cannot be done in code and must happen first in Clerk Dashboard.
**Delivers:** Clerk JWT tokens containing user profile data (email, firstName, lastName, imageUrl)
**Tasks:**
- Configure JWT Template in Clerk Dashboard
- Verify token contains new claims by inspecting a real token
- Document the expected claim structure for team
**Avoids:** Pitfall 1 (JWT claims missing user data)

### Phase 2: Core Sync Implementation

**Rationale:** This is the main deliverable. Build guard enhancement and type updates together since they are interdependent.
**Delivers:** Authenticated requests have full User entity attached; no more manual user lookups in controllers
**Implements:**
- Extend `ClerkTokenPayload` interface with email/firstName/lastName/imageUrl
- Update `ClerkService.verifySessionToken()` to return full payload
- Inject `SyncUserUseCase` into `ClerkAuthGuard`
- Update guard to call sync and attach User entity to request
- Update `AuthenticatedRequest` interface to use `User` type
- Update `@CurrentUser()` decorator return type
**Avoids:** Pitfall 2 (race condition - verify repository uses upsert), Pitfall 3 (error handling - add try-catch), Pitfall 7 (incomplete types)

### Phase 3: Repository Verification

**Rationale:** Verify database layer handles concurrent requests correctly before integration testing.
**Delivers:** Confidence that upsert pattern is correctly implemented
**Tasks:**
- Verify `DrizzleUserRepository` uses `onConflictDoUpdate()` for user sync
- Verify `clerkId` column has unique index
- Write unit test for concurrent upsert scenario
**Avoids:** Pitfall 2 (race condition), Pitfall 10 (missing index)

### Phase 4: Error Handling Refinement

**Rationale:** Production-ready error handling needs explicit attention after core logic works.
**Delivers:** Clean error responses, proper logging, no leaked internal details
**Tasks:**
- Add structured logging to `ClerkService.verifySessionToken()` catch block
- Wrap sync operation in try-catch with appropriate error transformation
- Ensure 401 for auth failures, 503 for sync failures
**Avoids:** Pitfall 3 (error leakage), Pitfall 9 (swallowed errors)

### Phase 5: Frontend API Client (Optional)

**Rationale:** Better DX for frontend developers, but not required for backend to function.
**Delivers:** TypeScript fetch wrapper with automatic Bearer token injection
**Implements:**
- Fetch wrapper using `useAuth().getToken()`
- 401 retry logic with single retry after token refresh
**Uses:** `@clerk/clerk-react` hooks for token management

### Phase Ordering Rationale

- **Phase 1 first:** Cannot proceed without JWT Template configuration. This is a hard blocker.
- **Phases 2-4 sequential:** Core implementation, repository verification, and error handling are tightly coupled and should be done together as a coherent unit.
- **Phase 5 last:** Frontend client is independent of backend changes and can be done in parallel or deferred.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (API Client):** 401 retry logic has edge cases around concurrent requests queuing. May need research-phase if implementing.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Just Clerk Dashboard configuration, no code research needed.
- **Phases 2-4:** Well-documented patterns. STACK.md and PITFALLS.md provide sufficient detail.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack is sufficient; verified against official Clerk and NestJS docs |
| Features | HIGH | Clear table stakes vs differentiators; based on Clerk patterns and codebase review |
| Architecture | HIGH | Guard-based approach validated; interceptor alternative documented if needed later |
| Pitfalls | HIGH | Critical pitfalls (JWT claims, race condition) verified against multiple sources |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact JWT claim structure:** Verify with actual token inspection after configuring JWT Template. Claim names may differ slightly.
- **Guard vs Interceptor decision:** Research recommends guard-based. If sync logic grows complex during implementation, consider refactoring to interceptor.
- **Webhook + request-time conflict:** Documented as "last write wins" but not deeply analyzed. Monitor for issues in production.

## Sources

### Primary (HIGH confidence)
- [Clerk Session Tokens](https://clerk.com/docs/guides/sessions/session-tokens) - JWT claims, size limits
- [Clerk JWT Templates](https://clerk.com/docs/guides/sessions/jwt-templates) - Custom claims configuration
- [Clerk verifyToken() Reference](https://clerk.com/docs/reference/backend/verify-token) - Token verification API
- [NestJS Guards Documentation](https://docs.nestjs.com/guards) - Guard implementation patterns
- [Drizzle ORM Upsert](https://orm.drizzle.team/docs/guides/upsert) - ON CONFLICT syntax
- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes) - Scope propagation

### Secondary (MEDIUM confidence)
- [PostgreSQL ON CONFLICT Troubleshooting](https://adllm.app/articles/postgresql-on-conflict-duplicate-key-error-concurrent-upsert-troubleshooting/)
- [NestJS Error Handling](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/)
- [Authentication with Clerk in NestJS](https://dev.to/thedammyking/authentication-with-clerk-in-nestjs-server-application-gpm)

### Tertiary (LOW confidence)
- Caching optimization thresholds - measure actual performance first
- Webhook vs request-time conflict resolution - monitor in production

---
*Research completed: 2026-01-28*
*Ready for roadmap: yes*
