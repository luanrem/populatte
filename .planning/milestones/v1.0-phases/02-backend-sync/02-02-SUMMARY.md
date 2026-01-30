---
phase: 02-backend-sync
plan: 02
subsystem: auth
tags: [clerk, jwt, nestjs, compare-first, guard, decorator]

# Dependency graph
requires:
  - phase: 02-01-backend-sync
    provides: ClerkTokenPayload with full claims, UserRepository upsert method, SyncFailureIndicator
provides:
  - ClerkAuthGuard with compare-first sync optimization (fetch, compare, conditionally upsert)
  - AuthenticatedRequest.user as full User entity (not just clerkId)
  - CurrentUser decorator returning full User entity with type safety
  - Simplified controller pattern: guard syncs, controller consumes
affects: [02-03-backend-sync, future-authenticated-endpoints]

# Tech tracking
tech-stack:
  added: []
  patterns: [compare-first-sync, guard-based-user-sync, full-entity-on-request]

key-files:
  created: []
  modified:
    - apps/api/src/infrastructure/auth/guards/clerk-auth.guard.ts
    - apps/api/src/presentation/decorators/current-user.decorator.ts
    - apps/api/src/presentation/controllers/user.controller.ts

key-decisions:
  - "Guard calls userRepository.upsert() directly (not SyncUserUseCase - webhook-scoped)"
  - "Compare-first optimization: fetch stored user, compare profile fields, skip write if unchanged"
  - "Sync failures return 503 ServiceUnavailableException (not 401 UnauthorizedException)"
  - "Use import type for User in controller to satisfy isolatedModules + emitDecoratorMetadata"

patterns-established:
  - "Phase 2 controller pattern: guard handles sync, controller consumes full User entity without database call"
  - "Compare-first sync: hasChanges() normalizes undefined to null to prevent false positives"
  - "Health tracking: record sync success/failure on both code paths for accurate monitoring"

# Metrics
duration: 2min 24s
completed: 2026-01-28
---

# Phase 2 Plan 02: Guard-Based User Sync Summary

**ClerkAuthGuard with compare-first sync attaches full User entity to every authenticated request, enabling zero-database-lookup controller pattern**

## Performance

- **Duration:** 2 min 24 sec
- **Started:** 2026-01-28T19:06:56Z
- **Completed:** 2026-01-28T19:09:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- ClerkAuthGuard performs request-time user synchronization with compare-first optimization (fetch, compare profile fields, upsert only on mismatch)
- AuthenticatedRequest.user changed from `{clerkId: string}` to full `User` entity - core Phase 2 type change
- CurrentUser decorator returns type-safe User entity, eliminating manual database lookups in controllers
- UserController.getMe() simplified to synchronous method returning User directly (guard does all work)

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance ClerkAuthGuard with compare-first sync and error handling** - `0644d89` (feat)
2. **Task 2: Update CurrentUser decorator and simplify UserController** - `59b096c` (refactor)

## Files Created/Modified
- `apps/api/src/infrastructure/auth/guards/clerk-auth.guard.ts` - Compare-first sync logic: fetch stored user, compare profile fields (email, firstName, lastName, imageUrl), upsert via userRepository.upsert() only on mismatch; AuthenticatedRequest.user now full User entity; sync failures return 503 with health tracking
- `apps/api/src/presentation/decorators/current-user.decorator.ts` - Explicit User return type, imports User entity and AuthenticatedRequest
- `apps/api/src/presentation/controllers/user.controller.ts` - Simplified to synchronous getMe() returning User from decorator; removed UserRepository injection, NotFoundException import, CurrentUserPayload interface

## Decisions Made
- **Guard calls userRepository.upsert() directly**: Compare-first optimization (fetch, compare, conditionally write) is fundamentally different from SyncUserUseCase's unconditional upsert. SyncUserUseCase remains scoped to webhook flow (Plan 02-01).
- **hasChanges() normalizes undefined to null**: Prevents false positives when stored value is null and JWT payload omits field (e.g., `user.firstName === null` vs `payload.firstName === undefined`).
- **Sync failures return 503**: ServiceUnavailableException (temporary infrastructure issue) instead of 401 UnauthorizedException (auth problem). Generic message prevents leaking internals.
- **Use import type for User in controller**: TypeScript decorator metadata with isolatedModules requires type-only imports for decorator signature types.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript decorator metadata type import**
- **Issue:** Initial implementation used `import { User }` in UserController, causing TS1272 error with isolatedModules + emitDecoratorMetadata
- **Resolution:** Changed to `import type { User }` per TypeScript strict mode requirements
- **Category:** Auto-fixed via Rule 3 (blocking issue) - required for compilation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Every authenticated request now has full User entity attached (AuthenticatedRequest.user)
- CurrentUser decorator provides type-safe User access in controllers
- Controllers never need to manually fetch user from database (guard handles sync)
- Phase 2 pattern established: guard syncs, controller consumes
- Health indicator tracks sync success/failure rate for monitoring
- Ready for Plan 02-03 (webhook-based sync testing and integration)

---
*Phase: 02-backend-sync*
*Completed: 2026-01-28*
