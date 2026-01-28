# End-to-End Authentication & User Synchronization

## What This Is

A robust authentication and user synchronization flow between Clerk, the NestJS backend, and the Next.js frontend for Populatte. This milestone transforms the existing webhook-only user sync into a request-time sync mechanism, ensuring users are always available in the local database when making authenticated API calls, while providing a type-safe API client for the frontend.

## Core Value

**Every authenticated request must have access to the local database user entity — not just the Clerk ID.** Controllers should never have to manually fetch users; the auth infrastructure handles it transparently.

## Requirements

### Validated

- ✓ ClerkAuthGuard validates JWT tokens — existing
- ✓ SyncUserUseCase creates/updates users from Clerk data — existing
- ✓ Webhook-based user sync (Clerk → API) — existing
- ✓ Drizzle schema with users table (clerkId, email, name, imageUrl) — existing
- ✓ Clean Architecture layers (Core/Infrastructure/Presentation) — existing
- ✓ Clerk integration on frontend (ClerkProvider, middleware) — existing

### Active

- [ ] Auth guard performs request-time user sync (create if not found, update metadata)
- [ ] Auth guard attaches local User entity to request (not just clerkId)
- [ ] ClerkService extracts full user claims from JWT (email, name, imageUrl)
- [ ] CurrentUser decorator returns local User entity
- [ ] API client with automatic Clerk token injection
- [ ] 401 error handling with token refresh + retry
- [ ] Type-safe API response handling

### Out of Scope

- OAuth/social login providers — Clerk handles this upstream
- Roles/permissions system — future milestone
- Session management UI — handled by Clerk components
- API rate limiting — separate infrastructure concern
- Webhook changes — existing webhook flow remains intact

## Context

**Technical Environment:**
- Monorepo with Turborepo + NPM Workspaces
- Backend: NestJS 11 with Clean Architecture (Core/Infrastructure/Presentation)
- Frontend: Next.js 16 with App Router
- Database: PostgreSQL via Drizzle ORM
- Auth: Clerk (external) with local user mirror

**Current Implementation:**
- ClerkAuthGuard validates token but only attaches `clerkId` to request
- Controllers must manually call `userRepository.findByClerkId()` (brittle)
- If user authenticates before webhook arrives, they get 404 (race condition)
- ClerkService discards JWT claims (email/name/imageUrl not extracted)
- No standardized API client on frontend — each component would fetch differently

**Architecture Decisions Already Made:**
- Drizzle ORM (not Prisma) for database access
- Clean Architecture with repository pattern
- Dependency injection via NestJS DI container
- Clerk for authentication (not rolling our own)

## Constraints

- **SOLID Principles**: All implementations must follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Strict TypeScript**: No `any`, `noUncheckedIndexedAccess` enabled, explicit return types
- **Language**: All code, comments, and documentation in English
- **Existing Structure**: Must fit within established Clean Architecture layers
- **No Breaking Changes**: Webhook flow must continue working alongside request-time sync

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Request-time sync creates users | Eliminates race condition where user authenticates before webhook | — Pending |
| Sync on every request (not just first) | Keeps user metadata fresh (email/name changes propagate quickly) | — Pending |
| Fetch wrapper over Axios | Simpler, no extra dependency, aligns with Next.js patterns | — Pending |
| Token refresh + retry on 401 | Better UX than immediate redirect; handles token expiry gracefully | — Pending |
| Guard attaches full User entity | Controllers shouldn't need to know about Clerk; only work with internal User | — Pending |

---
*Last updated: 2026-01-28 after initialization*
