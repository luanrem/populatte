---
phase: 02-backend-sync
plan: 01
subsystem: auth
tags: [clerk, jwt, nestjs, terminus, health-check, upsert]

# Dependency graph
requires:
  - phase: 01-prerequisites
    provides: User schema with soft delete, atomic upsert repository method
provides:
  - Full JWT claim extraction (email, firstName, lastName, imageUrl)
  - Atomic webhook-based user sync via upsert
  - Health monitoring endpoint with sync failure rate tracking
  - Global SyncFailureIndicator for guard injection
affects: [02-02-backend-sync]

# Tech tracking
tech-stack:
  added: [@nestjs/terminus]
  patterns: [health-indicator, global-module, jwt-claim-extraction]

key-files:
  created:
    - apps/api/src/infrastructure/health/sync-failure.indicator.ts
    - apps/api/src/infrastructure/health/health.controller.ts
    - apps/api/src/infrastructure/health/health.module.ts
  modified:
    - apps/api/src/infrastructure/auth/clerk.service.ts
    - apps/api/src/core/use-cases/user/sync-user.use-case.ts
    - apps/api/src/app.module.ts

key-decisions:
  - "ClerkService email field required (not optional) since it's mandatory JWT claim"
  - "SyncUserUseCase scoped to webhook flow only (guard will handle its own sync)"
  - "HealthModule marked @Global() for cross-module SyncFailureIndicator injection"
  - "Health endpoint is public (no auth guard) for monitoring infrastructure access"

patterns-established:
  - "Health indicators: Extend HealthIndicator base, implement isHealthy() with getStatus()"
  - "Failure tracking: Rolling window via counter halving at 1000 attempts"
  - "Global module: Use @Global() decorator for cross-cutting concerns like health monitoring"

# Metrics
duration: 2min
completed: 2026-01-28
---

# Phase 2 Plan 01: Foundation Services Summary

**JWT claim extraction with email/profile fields, atomic webhook sync via upsert, and health monitoring with 5% failure threshold**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-28T19:00:54Z
- **Completed:** 2026-01-28T19:03:11Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- ClerkService extracts full JWT payload (sub, email, firstName, lastName, imageUrl) with logging on verification failures
- SyncUserUseCase simplified to single atomic upsert call, resolving Phase 1 verifier blocker
- Health monitoring infrastructure with GET /health endpoint reporting sync failure rate
- SyncFailureIndicator exported globally for guard injection in Plan 02-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ClerkService to extract full JWT claims** - `26a15d2` (feat)
2. **Task 2: Fix SyncUserUseCase to use upsert** - `f0a61fc` (fix)
3. **Task 3: Create health monitoring module with sync failure indicator** - `2450ee5` (feat)

## Files Created/Modified
- `apps/api/src/infrastructure/auth/clerk.service.ts` - Extract email (required), firstName, lastName, imageUrl (optional) from JWT; add Logger for verification failures
- `apps/api/src/core/use-cases/user/sync-user.use-case.ts` - Replace find+update/create branching with single userRepository.upsert() call (webhook-scoped)
- `apps/api/src/infrastructure/health/sync-failure.indicator.ts` - Track sync attempts/failures with 5% threshold, rolling window via counter halving
- `apps/api/src/infrastructure/health/health.controller.ts` - Public GET /health endpoint with @HealthCheck() decorator
- `apps/api/src/infrastructure/health/health.module.ts` - Global module exporting SyncFailureIndicator for cross-module injection
- `apps/api/src/app.module.ts` - Import HealthModule alongside existing modules
- `apps/api/package.json` - Added @nestjs/terminus dependency

## Decisions Made
- **Email field required in ClerkTokenPayload**: Clerk JWT template guarantees email claim, making it non-optional simplifies downstream type handling
- **SyncUserUseCase webhook-only scope**: Use case remains simple atomic upsert for webhook flow; guard (Plan 02-02) will implement compare-first sync logic for request-time optimization
- **HealthModule marked @Global()**: Allows guard to inject SyncFailureIndicator without circular dependencies or explicit imports
- **Public health endpoint**: No authentication required on GET /health for monitoring tools (Kubernetes liveness probes, uptime monitors) to access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ClerkService ready to provide full user claims to guard
- SyncUserUseCase refactored per Phase 1 verifier feedback
- Health monitoring infrastructure in place for guard to record sync outcomes
- SyncFailureIndicator globally available for guard injection
- No blockers for Plan 02-02 (guard enhancement)

---
*Phase: 02-backend-sync*
*Completed: 2026-01-28*
