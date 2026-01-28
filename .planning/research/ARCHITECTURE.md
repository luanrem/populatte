# Architecture Patterns: Request-Time User Sync

**Domain:** NestJS Authentication with Clean Architecture
**Researched:** 2026-01-28
**Confidence:** HIGH (based on NestJS lifecycle documentation, Clerk SDK behavior, and Clean Architecture principles)

## Executive Summary

This document provides architecture guidance for implementing request-time user synchronization in a NestJS Clean Architecture codebase with Clerk authentication. The goal is to ensure that when a user makes an authenticated request, their local database record is automatically created or updated with the latest data from Clerk, without violating SOLID principles or Clean Architecture boundaries.

## Recommended Architecture

### Approach: Interceptor-Based User Sync

**Recommendation:** Use a dedicated `UserSyncInterceptor` that runs after the `ClerkAuthGuard` to handle user synchronization.

**Why not in the Guard?**
- Guards have a single responsibility: determine if a request should proceed (authorization)
- Adding database sync to the guard violates Single Responsibility Principle
- Guards should be fast and focused on access control, not data synchronization

**Why not in Middleware?**
- Middleware runs before guards, so we don't have the verified clerkId yet
- Middleware lacks access to NestJS dependency injection context needed for repositories

**Why Interceptor?**
- Interceptors run after guards, so we have the authenticated clerkId
- Interceptors have full DI access for injecting use cases
- Interceptors can enrich the request object before it reaches the controller
- Clean separation: guard handles auth, interceptor handles sync

### Component Boundaries

| Component | Responsibility | Layer | Communicates With |
|-----------|---------------|-------|-------------------|
| `ClerkAuthGuard` | Verify JWT, attach clerkId to request | Infrastructure | ClerkService |
| `UserSyncInterceptor` | Sync user data, attach User entity to request | Infrastructure | SyncUserUseCase, ClerkService |
| `SyncUserUseCase` | Upsert user in database | Core | UserRepository (abstraction) |
| `ClerkService` | Fetch user data from Clerk API | Infrastructure | Clerk SDK |
| `UserRepository` | Database operations | Core (interface) / Infrastructure (impl) | Drizzle/Database |
| `CurrentUser` decorator | Extract User from request | Presentation | Request object |

### Data Flow

```
Request with Bearer Token
         |
         v
+------------------+
| ClerkAuthGuard   |  1. Extract token from header
|                  |  2. Verify JWT with Clerk
|                  |  3. Attach { clerkId } to request
|                  |  4. Return true/false (allow/deny)
+------------------+
         |
         v (if allowed)
+----------------------+
| UserSyncInterceptor  |  5. Get clerkId from request
|                      |  6. Fetch full user from Clerk API
|                      |  7. Call SyncUserUseCase.execute()
|                      |  8. Attach User entity to request
+----------------------+
         |
         v
+------------------+
| Controller       |  9. @CurrentUser() receives full User entity
|                  | 10. No manual lookup needed
+------------------+
```

### Request Object Evolution

```typescript
// After ClerkAuthGuard (current state)
request.user = {
  clerkId: "user_2abc123..."
}

// After UserSyncInterceptor (new state)
request.user = {
  clerkId: "user_2abc123...",
  // Added by interceptor:
  dbUser: {
    id: "uuid-here",
    clerkId: "user_2abc123...",
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    imageUrl: "https://...",
    createdAt: Date,
    updatedAt: Date
  }
}
```

## Patterns to Follow

### Pattern 1: Interceptor Calling Use Case

**What:** The interceptor should delegate to `SyncUserUseCase` rather than containing sync logic directly.

**When:** Always - interceptors should orchestrate, not implement business logic.

**Example:**

```typescript
// infrastructure/auth/interceptors/user-sync.interceptor.ts
@Injectable()
export class UserSyncInterceptor implements NestInterceptor {
  public constructor(
    private readonly syncUserUseCase: SyncUserUseCase,
    private readonly clerkService: ClerkService,
  ) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { clerkId } = request.user;

    // Fetch fresh user data from Clerk
    const clerkUser = await this.clerkService.getUserById(clerkId);

    if (clerkUser) {
      // Delegate to use case for sync logic
      const dbUser = await this.syncUserUseCase.execute({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      });

      // Enrich request with database user
      request.user.dbUser = dbUser;
    }

    return next.handle();
  }
}
```

### Pattern 2: Extended Request Interface

**What:** Define a typed interface that extends the base request with sync'd user data.

**When:** To maintain type safety throughout the request lifecycle.

**Example:**

```typescript
// infrastructure/auth/guards/clerk-auth.guard.ts
import { User } from '../../../core/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user: {
    clerkId: string;
    dbUser?: User; // Populated by UserSyncInterceptor
  };
}
```

### Pattern 3: Updated CurrentUser Decorator

**What:** Update the decorator to return the full User entity instead of just clerkId.

**When:** After implementing the interceptor.

**Example:**

```typescript
// presentation/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { User } from '../../core/entities/user.entity';
import { AuthenticatedRequest } from '../../infrastructure/auth/guards/clerk-auth.guard';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user.dbUser) {
      throw new UnauthorizedException('User not synchronized');
    }

    return request.user.dbUser;
  },
);
```

### Pattern 4: ClerkService Extension for User Fetching

**What:** Add a method to ClerkService to fetch full user data from Clerk API.

**When:** The interceptor needs user profile data (email, name, imageUrl) not available in JWT.

**Why needed:** Clerk JWT tokens only include `sub` (user ID) by default. User profile data requires either:
1. Custom JWT templates (adds complexity, cookie size limits)
2. API call to Clerk (recommended - single source of truth)

**Example:**

```typescript
// infrastructure/auth/clerk.service.ts
import { clerkClient, User as ClerkUser } from '@clerk/backend';

@Injectable()
export class ClerkService {
  // ... existing methods ...

  public async getUserById(clerkId: string): Promise<ClerkUser | null> {
    try {
      return await clerkClient.users.getUser(clerkId);
    } catch {
      return null;
    }
  }
}
```

### Pattern 5: Selective Sync with Decorator

**What:** Allow routes to opt-out of sync if they don't need user data.

**When:** Performance optimization for routes that only need authentication, not user data.

**Example:**

```typescript
// infrastructure/auth/decorators/skip-user-sync.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const SKIP_USER_SYNC_KEY = 'skipUserSync';
export const SkipUserSync = () => SetMetadata(SKIP_USER_SYNC_KEY, true);

// In interceptor:
public async intercept(context: ExecutionContext, next: CallHandler) {
  const skipSync = this.reflector.getAllAndOverride<boolean>(
    SKIP_USER_SYNC_KEY,
    [context.getHandler(), context.getClass()],
  );

  if (skipSync) {
    return next.handle();
  }

  // ... sync logic ...
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Sync Logic in Guard

**What:** Adding database synchronization directly in `ClerkAuthGuard`.

**Why bad:**
- Violates Single Responsibility Principle (guard now does auth AND sync)
- Makes guard slower (database + API calls on every request)
- Harder to test (guard needs database mocks)
- Can't skip sync on routes that don't need it

**Instead:** Keep guard focused on JWT verification; use interceptor for sync.

### Anti-Pattern 2: Sync Logic in Controller

**What:** Calling `SyncUserUseCase` in every controller method that needs user data.

**Why bad:**
- Code duplication across controllers
- Easy to forget in new endpoints
- Controllers become cluttered with infrastructure concerns

**Instead:** Centralize in interceptor; controllers receive ready-to-use User entity.

### Anti-Pattern 3: Storing All User Data in JWT

**What:** Using Clerk JWT templates to embed email, name, imageUrl in the token.

**Why bad:**
- Cookie size limit (4KB) - can break auth if exceeded
- Stale data - token refreshes every 60 seconds, but changes may be missed
- Increases token size, slowing every request

**Instead:** Fetch from Clerk API when needed; API is source of truth.

### Anti-Pattern 4: Direct Repository Access in Interceptor

**What:** Injecting `UserRepository` directly into `UserSyncInterceptor`.

**Why bad:**
- Interceptor (Infrastructure) would depend on Repository (also Infrastructure)
- Bypasses use case layer, losing business logic centralization
- If sync logic changes, must update interceptor instead of use case

**Instead:** Interceptor calls `SyncUserUseCase`; use case owns sync logic.

### Anti-Pattern 5: Sync on Every Request Without Throttling

**What:** Always hitting Clerk API + database on every authenticated request.

**Why bad:**
- Unnecessary API calls for Clerk (rate limits, latency)
- Database writes on every request (even if data unchanged)
- Performance degradation at scale

**Instead:** Consider sync throttling strategies (covered in Scalability section).

## Clean Architecture Compliance

### Layer Dependencies

```
Presentation (Controllers, DTOs)
      |
      v (depends on)
Core (Use Cases, Entities, Repository Interfaces)
      ^
      | (implements)
Infrastructure (Guards, Interceptors, Repository Impls, External Services)
```

**Key rules maintained:**

1. **Interceptor (Infrastructure) depends on Use Case (Core)** - Correct direction
2. **Use Case (Core) depends on Repository interface (Core)** - Correct direction
3. **Core never imports from Infrastructure** - Preserved

### File Placement

| Component | Path | Layer |
|-----------|------|-------|
| `UserSyncInterceptor` | `src/infrastructure/auth/interceptors/user-sync.interceptor.ts` | Infrastructure |
| `SyncUserUseCase` | `src/core/use-cases/user/sync-user.use-case.ts` | Core (already exists) |
| `ClerkService` | `src/infrastructure/auth/clerk.service.ts` | Infrastructure (needs extension) |
| `AuthenticatedRequest` | `src/infrastructure/auth/guards/clerk-auth.guard.ts` | Infrastructure (needs update) |
| `CurrentUser` | `src/presentation/decorators/current-user.decorator.ts` | Presentation (needs update) |
| `SkipUserSync` | `src/infrastructure/auth/decorators/skip-user-sync.decorator.ts` | Infrastructure (new) |

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Clerk API calls | Acceptable (no throttling needed) | Consider caching user data | Mandatory caching + background sync |
| Database writes | Upsert on every request OK | Track lastSyncedAt, skip if recent | Background job for sync, request uses cached |
| Request latency | ~50ms added acceptable | Consider parallel fetch | Async sync, don't block request |

### Throttling Strategy (for scale)

For immediate needs (10K users), add a `lastSyncedAt` field and skip sync if recent:

```typescript
// In UserSyncInterceptor
const existingUser = await this.userRepository.findByClerkId(clerkId);
const shouldSync = !existingUser ||
  (Date.now() - existingUser.lastSyncedAt.getTime()) > 5 * 60 * 1000; // 5 minutes

if (shouldSync) {
  // Sync from Clerk
}
```

For high scale (1M+ users), consider background sync with Redis caching.

## Build Order Implications

Based on component dependencies, implement in this order:

### Phase 1: Extend ClerkService

Add `getUserById` method to fetch user data from Clerk API.

**Dependencies:** None
**Enables:** UserSyncInterceptor can fetch user data

### Phase 2: Update AuthenticatedRequest Interface

Add `dbUser?: User` to the request interface.

**Dependencies:** None (type-only change)
**Enables:** Type safety for enriched request

### Phase 3: Create UserSyncInterceptor

Implement the interceptor calling SyncUserUseCase.

**Dependencies:** ClerkService.getUserById, SyncUserUseCase (exists)
**Enables:** Automatic user sync on requests

### Phase 4: Register Interceptor Globally

Add interceptor to AuthModule or AppModule.

**Dependencies:** UserSyncInterceptor created
**Enables:** All guarded routes get user sync

### Phase 5: Update CurrentUser Decorator

Return `dbUser` instead of just `clerkId`.

**Dependencies:** UserSyncInterceptor registered
**Enables:** Controllers receive full User entity

### Phase 6: Update Controllers

Simplify controllers to use new CurrentUser return type.

**Dependencies:** CurrentUser decorator updated
**Enables:** Clean controller code, no manual lookups

### Phase 7 (Optional): Add SkipUserSync Decorator

For performance optimization on routes that don't need user data.

**Dependencies:** UserSyncInterceptor with Reflector support
**Enables:** Selective sync opt-out

## Summary

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Where to sync? | Interceptor | Runs after guard, full DI access, clean separation |
| How to sync? | Call SyncUserUseCase | Maintains Clean Architecture, centralizes logic |
| Get user data from? | Clerk API call | JWT doesn't include profile data by default |
| Attach to request? | `request.user.dbUser` | Extends existing pattern, type-safe |
| Throttle? | Optional lastSyncedAt | Not needed initially, add for scale |

## Sources

- [NestJS Request Lifecycle](https://docs.nestjs.com/faq/request-lifecycle) - Official documentation on middleware/guard/interceptor execution order
- [Clerk Session Tokens](https://clerk.com/docs/guides/sessions/session-tokens) - Default JWT claims documentation
- [Clerk JWT Templates](https://clerk.com/docs/guides/sessions/jwt-templates) - Custom claims documentation
- [Clerk JIT Provisioning](https://clerk.com/docs/guides/configure/auth-strategies/enterprise-connections/jit-provisioning) - Just-in-time user sync patterns
- [NestJS Guards vs Interceptors](https://medium.com/@kevinpatelcse/guards-vs-middlewares-vs-interceptors-vs-pipes-in-nestjs-a-comprehensive-guide-37841a7873f1) - Comprehensive comparison guide
- [Clean Architecture with NestJS](https://v-checha.medium.com/building-enterprise-grade-nestjs-applications-a-clean-architecture-template-ebcb6462c692) - Enterprise patterns reference
