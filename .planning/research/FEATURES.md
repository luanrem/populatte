# Feature Landscape: Request-Time User Synchronization

**Domain:** NestJS Authentication with Clerk Integration
**Researched:** 2026-01-28
**Confidence:** HIGH (verified against official docs, multiple sources, and existing codebase)

## Table Stakes

Features users/developers expect. Missing = production system feels incomplete or unreliable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Guard-based user sync** | Eliminates race condition where user authenticates before webhook arrives | Medium | Core value proposition; uses existing `SyncUserUseCase` |
| **Full User entity on request** | Controllers need internal User (with DB id), not just clerkId | Low | Extends `AuthenticatedRequest` interface |
| **JWT claim extraction** | Email/name/imageUrl from token enables sync without Clerk API call | Low | `ClerkService.verifySessionToken` already has interface, just returns `sub` |
| **Type-safe CurrentUser decorator** | Strongly-typed `@CurrentUser()` returning `User` entity | Low | Existing decorator returns `{ clerkId }`, needs upgrade |
| **Idempotent user creation** | Concurrent requests for same user must not create duplicates | Medium | Use `clerkId` unique constraint + upsert pattern |
| **Error propagation** | Auth failures return proper 401 with clear error messages | Low | Already exists in guard, may need refinement |
| **Token validation** | JWT signature verification before any sync attempt | Low | Already implemented via `@clerk/backend` |

## Differentiators

Features that improve DX/reliability but not strictly required for MVP.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Selective sync (conditional update)** | Only update DB when claims actually changed (compare timestamps/values) | Medium | Reduces DB writes; check `updatedAt` or hash claims |
| **Request-scoped user caching** | Single DB lookup per request even with multiple `@CurrentUser()` uses | Low | NestJS request scope + guard caches user on `request.user` |
| **Sync failure graceful degradation** | If DB sync fails, still authenticate (degrade to clerkId only) | Medium | Trade-off: some features unavailable vs total failure |
| **API client with auto-token injection** | Frontend fetch wrapper adds Bearer token automatically | Medium | Clerk provides `useAuth().getToken()` |
| **401 retry with token refresh** | On 401, refresh token and retry once before failing | Medium | Improves UX; Clerk tokens expire in 60 seconds |
| **Typed API error responses** | Consistent error shape across all endpoints | Low | Already have DTOs; extend for error cases |
| **Metadata sync from Clerk** | Sync `publicMetadata`/`privateMetadata` to local DB | Medium | Useful for custom user attributes |
| **Audit logging** | Log user sync events (create/update) for debugging | Low | Simple logger calls in `SyncUserUseCase` |
| **Health check endpoint** | Verify Clerk connectivity and DB access | Low | Useful for monitoring/alerting |

## Anti-Features

Features to explicitly NOT build. Common mistakes that add complexity without value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Polling Clerk API per request** | Adds latency (network call), rate limit risk, Clerk costs | Extract claims from JWT; webhook handles out-of-band changes |
| **Complex caching layer** | Premature optimization; request-scoped is enough initially | Start with per-request sync; add caching only if measured need |
| **Custom token refresh logic** | Clerk SDK handles token lifecycle; duplicating is error-prone | Use `@clerk/clerk-react` hooks which manage refresh |
| **Blocking on webhook delivery** | Webhooks are async by design; waiting defeats purpose | Request-time sync handles immediate needs; webhooks for consistency |
| **Full user profile replication** | Duplicating all Clerk data creates sync burden | Store only what your app needs (email, name, imageUrl) |
| **Custom session management** | Clerk manages sessions; building parallel system adds bugs | Trust Clerk for session validity; focus on local User entity |
| **Role/permission sync in this milestone** | Scope creep; separate concern with different patterns | Future milestone after basic sync works |
| **Multi-tenant user isolation** | B2B feature, but not needed for initial user sync | Handle in separate authorization layer |
| **Refresh token storage on backend** | Security risk; Clerk uses short-lived JWTs | Let Clerk SDK on frontend handle token refresh |

## Feature Dependencies

```
Token Validation (existing)
       |
       v
JWT Claim Extraction ─────┐
       |                  |
       v                  v
Guard-Based User Sync ─> Idempotent Creation
       |
       v
Full User on Request
       |
       v
Type-Safe CurrentUser Decorator
       |
       v
API Client (frontend) ─> 401 Retry Logic
```

**Dependency Notes:**
1. JWT claim extraction must happen before sync (provides data for create/update)
2. Idempotency is required for guard-based sync (concurrent requests)
3. API client can be built independently but tested end-to-end after guard works
4. Selective sync and caching are optimizations on top of basic sync

## MVP Recommendation

For this milestone, prioritize in order:

### Must Have (Production-Ready)

1. **JWT claim extraction** - Modify `ClerkService.verifySessionToken()` to return email/firstName/lastName/imageUrl
2. **Guard-based user sync** - Inject `SyncUserUseCase` into `ClerkAuthGuard`, call on every request
3. **Full User entity on request** - Change `request.user` from `{ clerkId }` to full `User` entity
4. **Type-safe CurrentUser decorator** - Update decorator return type and typings
5. **Idempotent user creation** - Ensure `SyncUserUseCase` handles concurrent requests safely

### Should Have (Better DX)

6. **API client with token injection** - Fetch wrapper using `useAuth().getToken()`
7. **401 retry logic** - Single retry after token refresh on 401
8. **Request-scoped caching** - Ensure guard only syncs once per request

### Defer to Post-MVP

- **Selective sync** - Measure if DB writes are actually a problem first
- **Audit logging** - Add when you have observability infrastructure
- **Metadata sync** - Wait until you have a use case for custom metadata
- **Health checks** - Add with broader monitoring initiative

## Implementation Complexity Estimates

| Feature | Lines of Code (est.) | Risk | Notes |
|---------|---------------------|------|-------|
| JWT claim extraction | ~20 | Low | Modify existing service method |
| Guard-based sync | ~30 | Medium | Async in guard, error handling |
| User entity on request | ~10 | Low | Type changes mostly |
| CurrentUser decorator | ~5 | Low | Type update |
| Idempotent creation | ~15 | Medium | Already have unique constraint; verify upsert |
| API client | ~50 | Low | Standard fetch wrapper pattern |
| 401 retry | ~40 | Medium | Queue management for concurrent requests |

## Sources

**HIGH Confidence (Official Docs):**
- [Clerk Webhook Sync Documentation](https://clerk.com/docs/webhooks/sync-data) - Sync patterns, when to use webhooks vs session tokens
- [NestJS Guards Documentation](https://docs.nestjs.com/guards) - Guard implementation patterns
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators) - Parameter decorator patterns

**MEDIUM Confidence (Verified Community Patterns):**
- [Authentication with Clerk in NestJS](https://dev.to/thedammyking/authentication-with-clerk-in-nestjs-server-application-gpm) - NestJS + Clerk integration patterns
- [JIT Provisioning Best Practices](https://workos.com/docs/sso/jit-provisioning) - Just-in-time user creation patterns
- [Token Refresh Patterns](https://medium.com/@ognjanovski.gavril/use-refresh-token-to-renew-access-token-and-resend-all-unauthorized-401-requests-that-failed-190e9c97fc3a) - 401 retry with token refresh

**LOW Confidence (Single Source, Verify During Implementation):**
- Selective sync optimization thresholds - measure actual performance first
- Exact Clerk JWT claim structure - verify with actual token inspection
