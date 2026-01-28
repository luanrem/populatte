# Domain Pitfalls: NestJS + Clerk Request-Time User Sync

**Domain:** Authentication middleware with request-time user synchronization
**Researched:** 2026-01-28
**Confidence:** HIGH (verified against Clerk docs, NestJS patterns, PostgreSQL behavior)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or security vulnerabilities.

---

### Pitfall 1: JWT Claims Missing User Data

**What goes wrong:** The guard extracts `sub` (user ID) from the Clerk JWT but tries to access `email`, `name`, or `imageUrl` which are not included in default session tokens. The sync fails silently or creates users with null metadata.

**Why it happens:** Clerk's default session token only includes:
- `sub` (user ID)
- `sid` (session ID)
- `iat`, `exp`, `nbf` (timing claims)
- `iss`, `azp` (issuer/authorized party)

User personal data (email, name, imageUrl) requires either:
1. Custom session token configuration in Clerk Dashboard
2. Backend API call to Clerk to fetch user details

**Consequences:**
- Users created with null email/name fields
- Sync appears to work but produces incomplete data
- Silent data quality degradation

**Prevention:**
1. Configure custom session token in Clerk Dashboard to include:
   ```json
   {
     "email": "{{user.primary_email_address}}",
     "firstName": "{{user.first_name}}",
     "lastName": "{{user.last_name}}",
     "imageUrl": "{{user.image_url}}"
   }
   ```
2. Update `ClerkService.verifySessionToken()` to extract these claims from the verified payload
3. Add explicit null checks and log warnings when claims are missing

**Detection:**
- Users in database have null `email` despite being authenticated
- `ClerkTokenPayload` interface has optional fields that are always undefined
- Sync use case receives incomplete input

**Phase mapping:** Phase 1 (Core Implementation) - Must configure JWT template before building sync logic

**Sources:**
- [Clerk Session Tokens Documentation](https://clerk.com/docs/guides/sessions/session-tokens)
- [Clerk Customize Session Token](https://clerk.com/docs/guides/sessions/customize-session-tokens)

---

### Pitfall 2: Concurrent Request Race Condition on User Creation

**What goes wrong:** Two requests arrive simultaneously for a new user. Both check if user exists (returns null), both attempt to create the user, second insert fails with duplicate key violation on `clerkId`.

**Why it happens:** The current `SyncUserUseCase.execute()` pattern is:
```typescript
const existingUser = await this.userRepository.findByClerkId(input.clerkId);
if (existingUser) {
  return this.userRepository.update(...)
}
return this.userRepository.create(...)
```

This "check-then-act" pattern is not atomic. Between the check and the create, another request can complete the same flow.

**Consequences:**
- 500 errors on user's first requests
- Inconsistent user experience
- Guard throws exception, breaking request flow
- Potential for partial state if transaction handling is incomplete

**Prevention:**
Use PostgreSQL `INSERT ON CONFLICT` (upsert) instead of check-then-act:

```typescript
// In DrizzleUserRepository
public async upsert(data: UpsertUserData): Promise<User> {
  const result = await this.drizzle
    .getClient()
    .insert(users)
    .values({
      clerkId: data.clerkId,
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      imageUrl: data.imageUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: data.email,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        imageUrl: data.imageUrl ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  const row = result[0];
  if (!row) throw new Error('Upsert failed unexpectedly');
  return UserMapper.toDomain(row);
}
```

This is atomic at the database level - no race condition possible.

**Detection:**
- Duplicate key errors in logs during initial user auth
- Intermittent 500 errors on authentication
- Users reporting login failures that "fix themselves" on retry

**Phase mapping:** Phase 1 (Core Implementation) - Critical architectural decision before implementation

**Sources:**
- [PostgreSQL ON CONFLICT Troubleshooting](https://adllm.app/articles/postgresql-on-conflict-duplicate-key-error-concurrent-upsert-troubleshooting/)
- [Drizzle ORM Upsert Documentation](https://orm.drizzle.team/docs/guides/upsert)
- [AWS Blog: Hidden dangers of duplicate key violations](https://aws.amazon.com/blogs/database/hidden-dangers-of-duplicate-key-violations-in-postgresql-and-how-to-avoid-them/)

---

### Pitfall 3: Guard Exception Handling Leaks Internal Errors

**What goes wrong:** The guard's async database operation fails (connection timeout, constraint violation, etc.) and the raw error propagates to the client, potentially exposing internal architecture details or causing confusing error responses.

**Why it happens:** NestJS guards run before exception filters for some error types. If `canActivate()` throws an unhandled exception during the sync operation, it may not be properly transformed into a user-friendly HTTP response.

**Consequences:**
- Internal error details leaked to clients (security risk)
- Inconsistent error response format
- Difficult debugging (error source unclear)
- Client receives 500 instead of appropriate 401/503

**Prevention:**
1. Wrap all async operations in try-catch within the guard
2. Transform database errors into appropriate HTTP exceptions
3. Log the actual error for debugging
4. Return appropriate status codes:
   - Database unavailable: 503 Service Unavailable
   - Sync failed but token valid: Consider proceeding without local user (degraded mode)
   - Token invalid: 401 Unauthorized

```typescript
public async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest<Request>();
  const token = this.extractTokenFromHeader(request);

  if (!token) {
    throw new UnauthorizedException('Missing authorization token');
  }

  const payload = await this.clerkService.verifySessionToken(token);
  if (!payload) {
    throw new UnauthorizedException('Invalid or expired token');
  }

  try {
    const user = await this.syncUserUseCase.execute({
      clerkId: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      imageUrl: payload.imageUrl,
    });

    (request as AuthenticatedRequest).user = user;
    return true;
  } catch (error) {
    this.logger.error('User sync failed', { clerkId: payload.sub, error });
    // Decision: fail closed (throw) or fail open (proceed with clerkId only)
    throw new ServiceUnavailableException('Authentication service temporarily unavailable');
  }
}
```

**Detection:**
- 500 errors in auth endpoints with database-related stack traces
- Clients seeing internal error messages
- Inconsistent error response shapes

**Phase mapping:** Phase 1 (Core Implementation) - Build into guard from the start

**Sources:**
- [NestJS Error Handling Patterns](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)

---

### Pitfall 4: Request-Scoped Provider Performance Cascade

**What goes wrong:** Making `ClerkAuthGuard` or `SyncUserUseCase` request-scoped causes the entire dependency chain to become request-scoped, dramatically impacting performance.

**Why it happens:** NestJS scope propagation: if `CatsController <- CatsService <- CatsRepository` and `CatsService` is request-scoped, then `CatsController` also becomes request-scoped. Every request creates new instances of the entire dependency tree.

**Consequences:**
- Significant performance degradation (new instances per request)
- Increased memory usage
- GC pressure under load
- Slower response times

**Prevention:**
1. Keep guard, use case, and repository as singletons (default scope)
2. Pass request-specific data (user claims) as method parameters, not constructor injection
3. If you need request context, use `nestjs-cls` (Continuation Local Storage) instead of request scope
4. Never inject request-scoped providers into singleton providers

The current implementation is correct: `SyncUserUseCase` takes input as method parameter, not constructor:
```typescript
public async execute(input: SyncUserInput): Promise<User>  // Correct: data passed per-call
```

**Detection:**
- Performance profiling shows instance creation overhead
- Memory usage grows with concurrent requests
- `@Injectable({ scope: Scope.REQUEST })` anywhere in auth chain

**Phase mapping:** Phase 1 (Core Implementation) - Design decision, verify during review

**Sources:**
- [NestJS Injection Scopes Documentation](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS CLS for Request Context](https://papooch.github.io/nestjs-cls/)
- [Understanding Scopes in NestJS](https://dev.to/abhivyaktii/understanding-scopes-in-nestjs-a-comprehensive-guide-8j0)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded functionality.

---

### Pitfall 5: Database Query on Every Request Without Caching

**What goes wrong:** Every authenticated request triggers a database upsert, even when the user was just synced milliseconds ago. This creates unnecessary database load and latency.

**Why it happens:** The "sync on every request" requirement is interpreted literally without considering caching or skip conditions.

**Consequences:**
- 1 extra database query per authenticated request
- Increased database load (N requests = N upserts)
- Higher p99 latency
- Unnecessary writes trigger `updatedAt` changes (audit confusion)

**Prevention:**
Consider these optimization strategies (in order of recommendation):

1. **Skip sync if claims unchanged:** Cache a hash of claims in request context; skip upsert if unchanged from last sync (within same session)

2. **Time-based skip:** Only sync if last sync was > N seconds ago (store lastSyncedAt in user record or cache)

3. **Request-scoped cache:** Use `nestjs-cls` to cache user within request, avoiding duplicate queries in same request

4. **Conditional upsert:** Only UPDATE if data actually changed:
```sql
INSERT INTO users (clerk_id, email, ...)
ON CONFLICT (clerk_id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW()
WHERE users.email IS DISTINCT FROM EXCLUDED.email
  OR users.first_name IS DISTINCT FROM EXCLUDED.first_name
  -- etc.
```

**Trade-off consideration:** For MVP, always-sync is simpler and ensures data freshness. Optimize later if monitoring shows it's a bottleneck.

**Detection:**
- Database monitoring shows high write rate to users table
- Authentication latency higher than expected
- `updatedAt` timestamp changes every request even with no data change

**Phase mapping:** Phase 3 (Optimization) - Not required for MVP, add metrics first

**Sources:**
- [WorkOS Query Caching with NestJS](https://workos.com/blog/query-caching-nest-js-and-typeorm)
- [NestJS Caching Documentation](https://docs.nestjs.com/techniques/caching)

---

### Pitfall 6: Webhook and Request-Time Sync Conflict

**What goes wrong:** Both webhook and request-time sync attempt to update the same user simultaneously, causing conflicting updates or unnecessary database contention.

**Why it happens:**
- User updates profile in Clerk
- Webhook fires with new data
- User makes request at the same time (with old JWT)
- Both sync mechanisms race to update

**Consequences:**
- Temporary data inconsistency
- Database contention
- Old data from JWT overwrites newer webhook data

**Prevention:**
1. Use `updatedAt` comparison or version field to implement "last write wins" semantics
2. Or prefer webhook data over JWT data when timestamps are close
3. JWT data is inherently stale (short-lived but could be seconds old)
4. Design the upsert to be idempotent - same data = no-op

Simplest solution: Accept last-write-wins semantics. The data will eventually be consistent, and both sources should have the same data within seconds.

**Detection:**
- User reports name change not reflecting immediately, then appearing, then disappearing briefly
- Audit logs show rapid succession of updates from different sources
- `updatedAt` changes multiple times within seconds for same user

**Phase mapping:** Phase 2 (Integration) - Document behavior, monitor for issues

**Sources:**
- [Clerk Webhooks Documentation](https://clerk.com/docs/webhooks/sync-data)
- [Clerk Webhooks vs Backend API Comparison](https://clerk.com/blog/webhooks-v-bapi)

---

### Pitfall 7: CurrentUser Decorator Returns Incomplete Type

**What goes wrong:** The `@CurrentUser()` decorator returns the raw request.user object, but TypeScript types don't reflect the full `User` entity. Developers access properties that might be undefined, causing runtime errors.

**Why it happens:** The current decorator returns `request.user` which is typed as `{ clerkId: string }` in `AuthenticatedRequest`. After implementing request-time sync, it should return the full `User` entity, but the types might not be updated.

**Consequences:**
- Runtime `undefined` property access errors
- IDE autocomplete shows wrong properties
- Type safety theater - compiles but fails at runtime

**Prevention:**
1. Update `AuthenticatedRequest` interface to use full `User` entity:
```typescript
export interface AuthenticatedRequest extends Request {
  user: User;  // Full User entity, not just { clerkId: string }
}
```

2. Consider making decorator type-safe with explicit return type:
```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
```

3. Add runtime validation in decorator if paranoid:
```typescript
if (!request.user?.id) {
  throw new UnauthorizedException('User not found in request');
}
```

**Detection:**
- TypeScript errors when accessing User properties
- Runtime errors: "Cannot read property 'id' of undefined"
- Developers manually casting `as User` throughout codebase

**Phase mapping:** Phase 1 (Core Implementation) - Update types as part of guard changes

**Sources:**
- [NestJS Custom Decorators Documentation](https://docs.nestjs.com/custom-decorators)
- [NestJS Parameter Decorator Type Safety](https://dev.to/micalevisk/nestjs-tip-type-safety-on-parameter-decorators-24mn)

---

### Pitfall 8: Session Token Size Limit Exceeded

**What goes wrong:** Adding too many custom claims to the session token causes Clerk to fail to set the cookie, breaking authentication entirely.

**Why it happens:** Clerk stores session tokens in cookies. Most browsers cap cookies at 4KB. After Clerk's default claims, only ~1.2KB remains for custom claims.

**Consequences:**
- Authentication completely breaks
- Cookie silently not set
- Difficult to diagnose (no clear error message)
- App appears to work in development (smaller claims) but fails in production

**Prevention:**
1. Keep custom claims minimal - only include what's needed for sync:
   ```json
   {
     "email": "{{user.primary_email_address}}",
     "firstName": "{{user.first_name}}",
     "lastName": "{{user.last_name}}",
     "imageUrl": "{{user.image_url}}"
   }
   ```
2. Never include large metadata objects in session token
3. For additional data, fetch via Clerk Backend API or store in your database
4. Test with maximum-length realistic data (long names, long email addresses)

**Detection:**
- Authentication works in development, fails in production
- Cookie not present in browser despite successful authentication
- Clerk Dashboard shows successful login but app can't access session

**Phase mapping:** Phase 1 (Core Implementation) - Configure JWT template conservatively

**Sources:**
- [Clerk Session Tokens - Size Limitations](https://clerk.com/docs/guides/sessions/session-tokens)
- [Clerk User Metadata](https://clerk.com/docs/guides/users/extending)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

---

### Pitfall 9: Clerk Service Swallows Verification Errors

**What goes wrong:** The current `ClerkService.verifySessionToken()` catches all errors and returns `null`, losing valuable debugging information about why verification failed.

```typescript
catch {
  return null;  // All errors treated the same
}
```

**Why it happens:** Defensive programming to prevent crashes, but too defensive.

**Consequences:**
- Can't distinguish between expired tokens, malformed tokens, and configuration errors
- Debugging auth issues is harder
- Configuration problems (missing secret key) silent in production

**Prevention:**
1. Log the error before returning null:
```typescript
} catch (error) {
  this.logger.warn('Token verification failed', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  return null;
}
```

2. Or throw specific exceptions for configuration errors (they shouldn't be swallowed):
```typescript
} catch (error) {
  if (error.message?.includes('secret key')) {
    throw error; // Configuration error - don't swallow
  }
  this.logger.warn('Token verification failed', { error });
  return null;
}
```

**Detection:**
- Auth failures with no log entries
- Difficulty debugging "why isn't auth working"
- Configuration errors discovered late in deployment

**Phase mapping:** Phase 1 (Core Implementation) - Quick improvement during implementation

---

### Pitfall 10: Missing Index on clerkId Column

**What goes wrong:** The `clerkId` column is used for lookups on every authenticated request, but if it lacks an index, performance degrades as the users table grows.

**Why it happens:** Unique constraint might be assumed to create an index, or index creation forgotten during schema design.

**Consequences:**
- Slow authentication as users table grows
- Full table scans on every request
- Performance cliff when reaching certain user counts

**Prevention:**
1. Verify `clerkId` has a unique index (unique constraint should create one automatically)
2. Add explicit index if not present:
```typescript
// In Drizzle schema
export const users = pgTable('users', {
  // ... columns
}, (table) => ({
  clerkIdIdx: uniqueIndex('users_clerk_id_idx').on(table.clerkId),
}));
```

3. Run `EXPLAIN ANALYZE` on the lookup query to verify index usage

**Detection:**
- Slow authentication under load
- `EXPLAIN` shows sequential scan instead of index scan
- Database metrics show increasing query time for user lookups

**Phase mapping:** Phase 1 (Core Implementation) - Verify during schema review

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Core Implementation | JWT claims missing user data | Configure Clerk JWT template FIRST before writing guard code |
| Phase 1: Core Implementation | Race condition on user creation | Use database upsert from day one, not check-then-act |
| Phase 1: Core Implementation | Types out of sync with runtime | Update `AuthenticatedRequest` interface immediately when changing guard |
| Phase 2: Integration | Webhook/request-time conflict | Document "last write wins" behavior, add monitoring |
| Phase 3: Optimization | Over-engineering caching | Measure first, optimize only if metrics show bottleneck |

---

## Pre-Implementation Checklist

Before writing any code:

- [ ] Clerk JWT template configured with email, firstName, lastName, imageUrl
- [ ] Verified clerkId has unique index in database schema
- [ ] Decided on upsert vs check-then-act (use upsert)
- [ ] Updated `AuthenticatedRequest` interface to include full `User` type
- [ ] Added logging to `ClerkService.verifySessionToken()` catch block
- [ ] Documented "last write wins" behavior for webhook + request-time conflict

---

## Sources Summary

**HIGH Confidence (Official Documentation):**
- [Clerk Session Tokens](https://clerk.com/docs/guides/sessions/session-tokens) - JWT claims, size limits
- [Clerk Customize Session Token](https://clerk.com/docs/guides/sessions/customize-session-tokens) - Adding custom claims
- [Clerk Webhooks Sync Data](https://clerk.com/docs/webhooks/sync-data) - Eventually consistent nature
- [Drizzle ORM Upsert](https://orm.drizzle.team/docs/guides/upsert) - ON CONFLICT syntax
- [NestJS Guards](https://docs.nestjs.com/guards) - Guard lifecycle
- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes) - Scope propagation

**MEDIUM Confidence (Verified Patterns):**
- [PostgreSQL ON CONFLICT Troubleshooting](https://adllm.app/articles/postgresql-on-conflict-duplicate-key-error-concurrent-upsert-troubleshooting/)
- [AWS Blog: Duplicate Key Violations](https://aws.amazon.com/blogs/database/hidden-dangers-of-duplicate-key-violations-in-postgresql-and-how-to-avoid-them/)
- [NestJS Error Handling](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/)
- [NestJS CLS](https://papooch.github.io/nestjs-cls/)

**LOW Confidence (Community Patterns):**
- [WorkOS Query Caching](https://workos.com/blog/query-caching-nest-js-and-typeorm) - Caching strategies
- [Clerk Webhooks vs BAPI](https://clerk.com/blog/webhooks-v-bapi) - Sync pattern comparison
