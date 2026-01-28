# Technology Stack: NestJS + Clerk Request-Time User Sync

**Project:** Populatte - Authentication Enhancement
**Researched:** 2026-01-28
**Overall Confidence:** HIGH

## Executive Summary

Your existing stack is already well-positioned for request-time user sync. The primary gap is extending the `ClerkAuthGuard` to resolve local `User` entities from JWT claims, not just attach `clerkId`. This document recommends patterns that work within your Clean Architecture constraints.

**Key Recommendation:** Use a guard-based approach (not interceptor) that leverages existing `SyncUserUseCase` to ensure users exist in your database at request time.

---

## Current Stack (Already Installed)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| `@clerk/backend` | ^2.29.3 | JWT verification, Clerk API | **Keep** |
| `@nestjs/common` | ^11.0.1 | NestJS core framework | **Keep** |
| `@nestjs/config` | ^4.0.2 | Configuration management | **Keep** |
| `drizzle-orm` | ^0.45.1 | Database ORM | **Keep** |
| `svix` | ^1.84.1 | Webhook signature verification | **Keep** |

**Verdict:** No new packages required. Your stack is complete for request-time sync.

---

## Recommended Stack for Request-Time Sync

### Core Authentication Pattern

| Component | Recommendation | Confidence | Rationale |
|-----------|---------------|------------|-----------|
| Token Verification | `verifyToken()` from `@clerk/backend` | HIGH | Already implemented; returns `sub` (userId) claim |
| User Sync Strategy | Guard-based with `SyncUserUseCase` | HIGH | Reuses existing use case; Clean Architecture compliant |
| User Entity Resolution | Extend guard to attach full `User` entity | HIGH | Single source of truth for authenticated user |
| Fallback Data Source | Clerk API via `clerkClient.users.getUser()` | MEDIUM | Only needed if JWT lacks user metadata |

### JWT Token Claims Available

From `verifyToken()` response (verified via [Clerk docs](https://clerk.com/docs/reference/backend/verify-token)):

| Claim | Type | Description | Available |
|-------|------|-------------|-----------|
| `sub` | string | User ID (Clerk ID) | Always |
| `sid` | string | Session ID | Always |
| `exp` | number | Expiration timestamp | Always |
| `iat` | number | Issued at timestamp | Always |
| `azp` | string | Authorized party (origin) | Always |
| `email` | string | User email | Via JWT Template |
| `firstName` | string | First name | Via JWT Template |
| `lastName` | string | Last name | Via JWT Template |

**Important:** Email and name are NOT included by default. You must configure a [JWT Template in Clerk Dashboard](https://clerk.com/docs/guides/sessions/jwt-templates) to include them.

---

## Implementation Approaches

### Approach 1: JWT Template Enhancement (RECOMMENDED)

**Confidence:** HIGH
**Why:** Eliminates Clerk API calls on every request; all user data available in JWT.

**Setup Required:**
1. Configure Clerk JWT Template to include user fields
2. Extend guard to parse additional claims
3. Use `SyncUserUseCase` when user not in DB

**JWT Template Configuration (Clerk Dashboard):**
```json
{
  "email": "{{user.primary_email_address}}",
  "firstName": "{{user.first_name}}",
  "lastName": "{{user.last_name}}",
  "imageUrl": "{{user.image_url}}"
}
```

**Pros:**
- Zero additional API calls
- Sub-millisecond user data access
- Works offline (no Clerk API dependency at request time)

**Cons:**
- JWT size increases slightly (~200 bytes)
- Data can be stale until next token refresh (typically 60s)

### Approach 2: Clerk API Fetch on Miss (ALTERNATIVE)

**Confidence:** MEDIUM
**Why:** Useful if you cannot modify JWT templates or need real-time data.

**Implementation:**
1. Guard verifies token, gets `sub` (clerkId)
2. Query local DB for user by clerkId
3. If miss, call `clerkClient.users.getUser(clerkId)`
4. Sync user to local DB
5. Attach User entity to request

**Pros:**
- Always current data from Clerk
- Works without JWT template changes

**Cons:**
- Adds ~50-150ms latency on cache miss
- Depends on Clerk API availability
- Rate limits apply (100 req/sec on free tier)

---

## Pattern Recommendation: Enhanced Auth Guard

**Confidence:** HIGH
**Source:** Validated against [NestJS Guards docs](https://docs.nestjs.com/guards) and [Clerk Backend SDK](https://clerk.com/docs/reference/backend/overview)

### Why Guard (Not Interceptor)

| Concern | Guard | Interceptor |
|---------|-------|-------------|
| Execution Order | Before route handler | After guards |
| Can reject request | Yes | No (must throw) |
| Request mutation | Yes | Yes |
| Request-scoped injection | Complex | Easier |
| Authentication purpose | Designed for this | Not designed for auth |

**Decision:** Guard is the correct NestJS primitive for authentication. Your existing `ClerkAuthGuard` is correctly implemented.

### Architecture Alignment

```
Request Flow with Clean Architecture:

1. HTTP Request
   |
2. ClerkAuthGuard (Presentation layer)
   ├── verifyToken() → JWT claims
   ├── SyncUserUseCase.execute() → User entity (Core layer)
   └── Attach User to request
   |
3. Controller (Presentation layer)
   └── Access User via @CurrentUser() decorator
```

**Key Insight:** The guard should use the existing `SyncUserUseCase` for user resolution. This maintains Clean Architecture by keeping the guard in the Presentation layer while delegating business logic to the Core layer.

---

## Required Changes Summary

### 1. Clerk Dashboard Configuration

Configure JWT Session Token Template to include user claims:

```json
{
  "email": "{{user.primary_email_address}}",
  "firstName": "{{user.first_name}}",
  "lastName": "{{user.last_name}}",
  "imageUrl": "{{user.image_url}}"
}
```

**Confidence:** HIGH - Verified via [Clerk JWT Templates docs](https://clerk.com/docs/guides/sessions/jwt-templates)

### 2. Update ClerkService Token Payload

Extend `ClerkTokenPayload` to include additional claims from JWT template:

```typescript
// Current (insufficient)
interface ClerkTokenPayload {
  sub: string;
}

// Required
interface ClerkTokenPayload {
  sub: string;      // clerkId
  email?: string;   // From JWT template
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}
```

### 3. Update ClerkAuthGuard

Enhance to:
1. Parse full JWT claims
2. Call `SyncUserUseCase` to ensure user exists
3. Attach `User` entity (not just clerkId) to request

### 4. Update AuthenticatedRequest Interface

```typescript
// Current
interface AuthenticatedRequest extends Request {
  user: { clerkId: string };
}

// Required
interface AuthenticatedRequest extends Request {
  user: User; // Full User entity from Core layer
}
```

### 5. Update @CurrentUser Decorator

Already correctly implemented - returns `request.user`. Will automatically return full `User` entity after guard changes.

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| `@nestjs/passport` with Clerk | Adds unnecessary abstraction; `verifyToken()` is simpler |
| `@nestjs/jwt` | Clerk handles JWT verification; would duplicate functionality |
| Interceptor for auth | Guards are the NestJS idiom for authentication |
| Global request-scoped providers | Known NestJS issues with guards ([GitHub #2130](https://github.com/nestjs/nest/issues/2130)) |
| Custom JWT validation | Clerk's `verifyToken()` handles signature verification correctly |

---

## ClerkClient Setup (If Needed for API Calls)

Only required if using Approach 2 (Clerk API Fetch on Miss):

```typescript
// infrastructure/auth/clerk-client.provider.ts
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

export const CLERK_CLIENT = 'CLERK_CLIENT';

export const ClerkClientProvider = {
  provide: CLERK_CLIENT,
  useFactory: (configService: ConfigService) => {
    return createClerkClient({
      secretKey: configService.get('CLERK_SECRET_KEY'),
    });
  },
  inject: [ConfigService],
};
```

**Note:** Your current implementation uses `verifyToken()` directly, which is sufficient. `createClerkClient()` is only needed if you need to call Clerk's Backend API (e.g., `clerkClient.users.getUser()`).

---

## Version Compatibility Matrix

| Package | Current | Latest Verified | Notes |
|---------|---------|-----------------|-------|
| `@clerk/backend` | ^2.29.3 | 2.x | Stable; `verifyToken()` API unchanged |
| `@nestjs/common` | ^11.0.1 | 11.x | Latest major; guard API stable |
| `drizzle-orm` | ^0.45.1 | 0.45.x | Active development; no breaking changes |

**Confidence:** MEDIUM - Versions verified via WebSearch; recommend `npm outdated` check before implementation.

---

## Performance Considerations

| Scenario | Latency Impact | Recommendation |
|----------|---------------|----------------|
| JWT-only (Approach 1) | ~0ms | Preferred |
| DB lookup (user exists) | ~1-5ms | Acceptable |
| Clerk API call (miss) | ~50-150ms | Avoid for common paths |
| JWT + DB + Clerk API | ~50-160ms | Maximum latency scenario |

**Optimization Strategy:**
1. Always include user data in JWT template
2. Webhooks handle user create/update (already implemented)
3. Guard only syncs on miss (rare after webhook sync)

---

## Sources

### HIGH Confidence (Official Documentation)
- [Clerk verifyToken() Reference](https://clerk.com/docs/reference/backend/verify-token) - Token verification API
- [Clerk Session Tokens](https://clerk.com/docs/guides/sessions/session-tokens) - JWT claims documentation
- [Clerk JWT Templates](https://clerk.com/docs/guides/sessions/jwt-templates) - Custom claims configuration
- [Clerk getUser() Reference](https://clerk.com/docs/reference/backend/user/get-user) - Backend API for user data

### MEDIUM Confidence (Community Verified)
- [NestJS + Clerk Auth (DEV.to)](https://dev.to/thedammyking/authentication-with-clerk-in-nestjs-server-application-gpm) - Implementation patterns
- [NestJS Guards Documentation](https://docs.nestjs.com/guards) - Guard execution order and patterns

### LOW Confidence (Requires Validation)
- [NestJS Request-Scoped Issues](https://github.com/nestjs/nest/issues/2130) - Guard injection caveats

---

## Checklist for Implementation

- [ ] Configure JWT Template in Clerk Dashboard with user fields
- [ ] Update `ClerkTokenPayload` interface to include new claims
- [ ] Update `ClerkService.verifySessionToken()` to return full payload
- [ ] Inject `SyncUserUseCase` into `ClerkAuthGuard`
- [ ] Update guard to call `SyncUserUseCase.execute()` and attach User entity
- [ ] Update `AuthenticatedRequest` interface to use `User` type
- [ ] Test with existing JWT (should fail gracefully until template configured)
- [ ] Test with new JWT (should sync and return User entity)
