---
phase: 01-prerequisites
plan: 01
subsystem: database
tags: [drizzle, postgresql, supabase, joi, clerk, upsert, soft-delete]

# Dependency graph
requires:
  - phase: none
    provides: first phase
provides:
  - Extended user schema with soft delete and sync tracking
  - Atomic upsert repository method (INSERT ON CONFLICT DO UPDATE)
  - Environment variable validation at startup (Joi)
  - Clerk JWT template with user profile claims
affects: [02-backend-sync]

# Tech tracking
tech-stack:
  added: [joi]
  patterns: [atomic-upsert, soft-delete, partial-unique-index, env-validation]

key-files:
  created:
    - apps/api/src/infrastructure/config/env.validation.ts
  modified:
    - apps/api/src/infrastructure/database/drizzle/schema/users.schema.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts
    - apps/api/src/core/repositories/user.repository.ts
    - apps/api/src/core/entities/user.entity.ts
    - apps/api/src/infrastructure/database/drizzle/mappers/user.mapper.ts
    - apps/api/src/infrastructure/config/index.ts
    - apps/api/src/app.module.ts
    - apps/api/src/infrastructure/config/database.config.ts

key-decisions:
  - "Partial unique index on clerkId excludes soft-deleted records"
  - "setWhere optimization only updates when values actually change"
  - "DATABASE_URL replaces SUPABASE_URL for database config consistency"

patterns-established:
  - "Soft delete: deletedAt column with partial unique indexes"
  - "Atomic upsert: onConflictDoUpdate with setWhere for conditional updates"
  - "Env validation: Joi schema in ConfigModule.forRoot()"

# Metrics
completed: 2026-01-28
---

# Plan 01-01: Prerequisites Summary

**Extended user schema with soft delete, atomic upsert via ON CONFLICT DO UPDATE, Joi env validation, and Clerk JWT profile claims**

## Performance

- **Tasks:** 3 (2 auto + 1 human checkpoint)
- **Files modified:** 9

## Accomplishments
- User schema extended with `lastSyncedAt`, `deletedAt`, `source` columns
- Partial unique index on `clerkId` excludes soft-deleted records
- Atomic `upsert()` method with `setWhere` optimization — only updates when values change
- Joi validation schema fails app startup on missing `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, or `DATABASE_URL`
- Clerk JWT session token configured with email, firstName, lastName, imageUrl claims

## Task Commits

1. **Task 1: Extend user schema and add upsert method** - `d7fd8fc` (feat)
2. **Task 2: Add environment variable validation** - `d5e7f72` (feat)
3. **Task 3: Configure Clerk JWT and verify end-to-end** - human checkpoint (approved)

**Orchestrator fix:** `6129bea` (fix: use pnpm and DATABASE_URL for database config)

## Files Created/Modified
- `apps/api/src/infrastructure/database/drizzle/schema/users.schema.ts` - Added lastSyncedAt, deletedAt, source columns and partial indexes
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts` - Atomic upsert method
- `apps/api/src/core/repositories/user.repository.ts` - Abstract upsert signature
- `apps/api/src/core/entities/user.entity.ts` - UpsertUserData interface and updated User entity
- `apps/api/src/infrastructure/database/drizzle/mappers/user.mapper.ts` - Map new fields
- `apps/api/src/infrastructure/config/env.validation.ts` - Joi validation schema
- `apps/api/src/infrastructure/config/index.ts` - Export env validation
- `apps/api/src/app.module.ts` - ConfigModule with validation
- `apps/api/src/infrastructure/config/database.config.ts` - Fixed to read DATABASE_URL

## Decisions Made
- Used `DATABASE_URL` consistently across drizzle.config.ts, database.config.ts, and env.validation.ts (replaced `SUPABASE_URL`)
- Partial unique index pattern for soft delete — allows re-creation of deleted users with same clerkId

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] database.config.ts read wrong env var**
- **Found during:** Orchestrator review (post-execution)
- **Issue:** `database.config.ts` read `SUPABASE_URL` (REST API URL) instead of `DATABASE_URL` (PostgreSQL connection string)
- **Fix:** Changed to `process.env['DATABASE_URL']`, updated .env.example
- **Committed in:** `6129bea`

**2. [Rule 3 - Blocking] npm used instead of pnpm**
- **Found during:** Orchestrator review (post-execution)
- **Issue:** Executor ran `npm install joi` creating package-lock.json instead of using pnpm
- **Fix:** Removed package-lock.json, verified pnpm-lock.yaml is correct
- **Committed in:** `6129bea`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for project consistency. No scope creep.

## Issues Encountered
None beyond the deviations listed above.

## User Setup Required
- Clerk JWT session token configured with profile claims (completed by user)
- DATABASE_URL added to apps/api/.env (completed by user)
- Database schema pushed via `drizzle-kit push` (completed by user)

## Next Phase Readiness
- Database schema ready for user sync operations
- Upsert method available for ClerkAuthGuard to call in Phase 2
- JWT tokens contain all claims needed for user sync
- No blockers for Phase 2

---
*Phase: 01-prerequisites*
*Completed: 2026-01-28*
