# Codebase Concerns

**Analysis Date:** 2026-01-28

## Tech Debt

**Incomplete TypeScript Strictness in API:**
- Issue: TypeScript strict mode not fully enabled. `noImplicitAny` is `false`, `strictBindCallApply` and `noFallthroughCasesInSwitch` are `false`
- Files: `apps/api/tsconfig.json`
- Impact: Type safety gaps may introduce runtime bugs that could be caught at compile time. API is vulnerable to implicit any types
- Fix approach: Enable all strict flags progressively, starting with `noImplicitAny: true`, fixing violations, then enabling remaining flags

**Generic Error Handling in Infrastructure Layer:**
- Issue: Database and Auth services throw generic `Error` instead of application-specific exceptions that NestJS can handle
- Files:
  - `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts` (lines 59, 81)
  - `apps/api/src/infrastructure/database/drizzle/drizzle.service.ts` (line 27)
  - `apps/api/src/infrastructure/auth/clerk.service.ts` (lines 27, 44)
- Impact: Generic errors don't trigger NestJS error filters properly. Client receives 500 errors instead of meaningful 400/401 responses
- Fix approach: Replace `new Error()` with NestJS exceptions (`BadRequestException`, `InternalServerErrorException`, `ConfigurationException`)

**Webhook Error Handling Re-throws Without Wrapping:**
- Issue: After logging webhook processing errors, the controller re-throws raw errors, causing clients to see technical stack traces
- Files: `apps/api/src/presentation/controllers/webhook.controller.ts` (line 88)
- Impact: Potential information disclosure; error details leak to external callers (Svix)
- Fix approach: Log errors for internal diagnostics, return safe HTTP status (e.g., 202 Accepted) to webhooks without exposing stack traces

**No Test Coverage for Core Business Logic:**
- Issue: Only one placeholder test exists (AppController basic "Hello World" test). Zero coverage for user sync/delete use cases, webhook verification, database operations
- Files:
  - `apps/api/src/app.controller.spec.ts` (placeholder test only)
  - No tests for: `apps/api/src/core/use-cases/user/*`, `apps/api/src/presentation/controllers/webhook.controller.ts`, `apps/api/src/infrastructure/database/drizzle/*`
- Impact: Critical business logic (user sync, webhook handling) has no safety net. Breaking changes go undetected until production
- Fix approach: Add unit tests for use cases, integration tests for database layer, webhook signature verification tests

## Known Bugs

**Null Safety Issue in Webhook Handler:**
- Symptoms: If Clerk webhook missing email address array, app crashes with "Cannot read property 'email_address' of undefined"
- Files: `apps/api/src/presentation/controllers/webhook.controller.ts` (line 70)
- Trigger: Clerk sends webhook with empty `email_addresses` array or missing email
- Workaround: None currently; code will crash
- Fix approach: Add validation: `if (!event.data.email_addresses?.length)` before accessing `[0]?.email_address`

**Race Condition in User Sync:**
- Symptoms: If two concurrent Clerk webhooks arrive for same user (user.created + user.updated simultaneously), one update may be lost
- Files:
  - `apps/api/src/core/use-cases/user/sync-user.use-case.ts` (check-then-act pattern)
  - `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts` (separate find/create/update calls)
- Trigger: User creation and update webhooks in rapid succession
- Workaround: Concurrent requests may succeed but miss latest data
- Fix approach: Use database-level UPSERT instead of separate find/create/update. Drizzle supports `.onConflict()` for atomic operations

**Middleware Overly Permissive Color Page:**
- Symptoms: `/colors` page is publicly accessible for "theme testing" but never explicitly documented as test-only
- Files: `apps/web/middleware.ts` (line 18)
- Trigger: Any unauthenticated user can access `/colors`
- Workaround: None; page is intentionally public
- Fix approach: Remove from production or move to `/admin/colors` behind authentication once admin features exist

## Security Considerations

**Insufficient Webhook Signature Validation Error Handling:**
- Risk: Malformed webhook signature headers could cause `Webhook.verify()` to throw unexpectedly; no type-level guarantee that caught errors are validation failures vs. other errors
- Files: `apps/api/src/presentation/controllers/webhook.controller.ts` (lines 51-60)
- Current mitigation: Generic try-catch treats all errors the same
- Recommendations:
  - Add explicit logging of error type (e.g., `error.code`, `error.message`)
  - Consider Svix-specific error types and handle them distinctly
  - Add monitoring/alerting for repeated signature failures (possible replay attack)

**Clerk Secret Keys in Environment - No Secrets Manager:**
- Risk: API relies on `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET` in `.env`, which are credentials
- Files: `apps/api/.env.example` (lines 4, 6), `apps/api/src/infrastructure/auth/clerk.service.ts`
- Current mitigation: `.env` files are gitignored; example provided
- Recommendations:
  - Document that credentials must never be committed (verify in pre-commit hooks)
  - In production, use proper secrets manager (AWS Secrets Manager, HashiCorp Vault, Clerk's own dashboard)
  - Add validation in config loading that throws early if secrets are missing or placeholder values

**Missing CORS Configuration:**
- Risk: No explicit CORS policy defined. NestJS defaults to allowing all origins for development
- Files: `apps/api/src/main.ts` (no CORS configuration)
- Current mitigation: None explicit
- Recommendations:
  - Add `enableCors()` configuration in main.ts with whitelisted origins
  - Restrict webhook endpoints to Svix IPs if possible
  - Document CORS requirements in README

**Potential SQL Injection via Email in Webhook:**
- Risk: Low (using Drizzle ORM with parameterized queries), but worth noting
- Files: `apps/api/src/presentation/controllers/webhook.controller.ts` (line 70), `apps/api/src/core/use-cases/user/sync-user.use-case.ts`
- Current mitigation: Drizzle ORM uses parameterized queries; user input is never concatenated into SQL
- Recommendations: Validate email format with Zod schema before database operations

## Performance Bottlenecks

**No Database Connection Pooling Configuration:**
- Problem: Pool size defaults to 10 connections; no guidance on tuning for production
- Files: `apps/api/src/infrastructure/config/database.config.ts` (line 5), `apps/api/src/infrastructure/database/drizzle/drizzle.service.ts` (line 32)
- Cause: Generic Pool config, no monitoring or tuning strategy
- Improvement path:
  - Document recommended pool sizes for different deployment scenarios
  - Add metrics for pool utilization (idle/active connections)
  - Implement connection timeout monitoring and alerting

**Synchronous Module Initialization:**
- Problem: `DrizzleService.onModuleInit()` is synchronous but creates pool synchronously. NestJS waits for all module init before starting
- Files: `apps/api/src/infrastructure/database/drizzle/drizzle.service.ts` (line 25)
- Cause: Database startup blocks entire application startup
- Improvement path: Convert to async initialization, or ensure pool creation doesn't block (already async-safe, but worth documenting)

**N+1 Query Potential in User Sync:**
- Problem: `SyncUserUseCase.execute()` performs separate queries: first to find existing user, then create/update
- Files: `apps/api/src/core/use-cases/user/sync-user.use-case.ts` (line 23), `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts`
- Cause: Two-phase logic (check existence, then act)
- Improvement path: Use database UPSERT to combine into single atomic operation

## Fragile Areas

**WebhookController Tightly Coupled to Clerk:**
- Files: `apps/api/src/presentation/controllers/webhook.controller.ts`
- Why fragile:
  - Hard-coded Clerk event types (`user.created`, `user.updated`, `user.deleted`)
  - Assumes specific Clerk data structure (email_addresses array)
  - Svix/Clerk dependency cannot be easily swapped
- Safe modification:
  - Before changing event handling, add unit tests mocking webhook payloads
  - Consider creating webhook adapter/bridge layer to decouple Clerk specifics from use cases
  - Add integration tests with Svix SDK
- Test coverage: Missing entirely; no webhook tests exist

**UserRepository Sparse Error Context:**
- Files: `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts`
- Why fragile:
  - Generic "Failed to create user" error with no context (no clerkId, no input data)
  - "User not found" error only includes clerkId, not table state
- Safe modification:
  - Always include input parameters in error messages for debugging
  - Add logging before throwing to capture state
  - Consider adding `ConflictException` for duplicate clerkId attempts
- Test coverage: Missing

**Current User Decorator Assumes Guard Execution:**
- Files: `apps/api/src/presentation/decorators/current-user.decorator.ts`, `apps/api/src/presentation/controllers/user.controller.ts`
- Why fragile:
  - Decorator assumes `request.user` is set by guard. If guard is removed or controller used without guard, decorator silently returns undefined
  - No type safety enforcing guard presence
- Safe modification:
  - Before modifying, ensure `@UseGuards(ClerkAuthGuard)` is always paired with `@CurrentUser()`
  - Consider using NestJS's built-in `@GetUser()` or creating a custom decorator that enforces guard presence
- Test coverage: Only in basic e2e test; no explicit decorator tests

**Page Placeholder Pages Have No Implementation:**
- Files:
  - `apps/web/app/(platform)/projects/page.tsx`
  - `apps/web/app/(platform)/mappings/page.tsx`
  - `apps/web/app/(platform)/team/page.tsx`
  - `apps/web/app/(platform)/billing/page.tsx`
  - `apps/web/app/(platform)/onboarding/page.tsx`
- Why fragile:
  - All protected routes render only `<PagePlaceholder>` with no actual functionality
  - Users hitting these routes see "under construction" but no way to navigate back or understand feature status
  - No API endpoints connected; feature cannot be built without changing multiple layers simultaneously
- Safe modification:
  - Add breadcrumb/navigation to placeholders so users aren't lost
  - Create separate issue tracker for each feature with dependency mapping (API endpoint required, etc.)
- Test coverage: None for these pages; no snapshot or rendering tests

**API Has No Global Error Filter:**
- Files: `apps/api/src/app.module.ts`
- Why fragile:
  - Each controller must handle errors individually
  - Inconsistent error responses possible across different endpoints
  - Changes to error format require updates everywhere
- Safe modification:
  - Before adding new endpoints, create a global `HttpExceptionFilter` in NestJS
  - Test filter with various exception types
  - Document expected error response format
- Test coverage: No filter tests; manual testing only

## Scaling Limits

**Database Connection Pool at 10 Default:**
- Current capacity: 10 concurrent database connections (from `.env` default)
- Limit: With multiple users making requests simultaneously, pool exhaustion occurs around 10-20 concurrent connections under moderate load
- Scaling path:
  - Monitor connection usage in production
  - Increase `DATABASE_POOL_SIZE` based on metrics (aim for 20-50 for small production)
  - Consider connection pooling proxy (PgBouncer) for larger deployments
  - Implement request queuing in NestJS if pool remains limited

**No Pagination on Database Queries:**
- Problem: User repository only fetches single users, but future queries (project listings, data tables) may return unbounded results
- Files: `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts`
- Scaling path:
  - Add pagination parameters to repository methods before adding listing endpoints
  - Implement cursor-based pagination for better performance with large datasets

**Single Database Instance, No Replication:**
- Current: Single PostgreSQL instance (Supabase), no read replicas
- Scaling path:
  - As read queries increase (dashboards, reporting), add read replicas
  - Route analytics/reporting queries to replicas only
  - Keep write operations on primary

## Dependencies at Risk

**Clerk SDK Major Version Not Locked to Pattern:**
- Risk: `@clerk/backend` at `^2.29.3` may receive breaking changes in v3 without warning
- Files: `apps/api/package.json` (line 27)
- Impact: Next major release could break authentication entirely
- Migration plan:
  - Monitor Clerk release notes quarterly
  - Test major version upgrades in staging before deploying
  - Consider pinning to specific minor version in production (e.g., `2.29.x`)

**Drizzle ORM Rapid Development Phase:**
- Risk: Drizzle at `^0.45.1` is actively evolving; frequent breaking changes in minor versions possible
- Files: `apps/api/package.json` (line 32)
- Impact: Migrations between versions may be non-trivial
- Migration plan:
  - Track Drizzle changelog and migration guides
  - Test version upgrades against schema generation and migrations
  - Consider locking to specific patch version for production stability

**Next.js Version 16 Still in Active Development:**
- Risk: Next.js 16 is recent; edge cases and performance regressions possible
- Files: `apps/web/package.json` (line 21)
- Impact: Production issues may stem from framework bugs
- Migration plan:
  - Monitor Next.js releases and GitHub issues
  - Keep React and supporting packages in sync with Next.js recommendations
  - Test major version upgrades in staging environment

**No Lockfile in Git (pnpm workspaces):**
- Risk: `pnpm-lock.yaml` should be committed to ensure deterministic installs across developers/CI
- Files: Check if `.gitignore` excludes lockfile
- Impact: Developers may have different transitive dependencies
- Migration plan: Ensure `pnpm-lock.yaml` is committed and never ignored

## Missing Critical Features

**No Error Recovery for Webhook Processing:**
- Problem: If webhook handler throws, request returns 5xx to Svix but no retry mechanism exists
- Blocks: Cannot rely on webhook-driven user syncing in production without replay capability
- Fix approach:
  - Queue webhook events in database (mark as pending, processing, completed)
  - Implement retry logic with exponential backoff
  - Provide admin UI to manually retry failed webhooks

**No Input Validation for Webhook Payloads:**
- Problem: Webhook handler trusts Clerk data structure without runtime validation
- Blocks: Cannot safely handle malformed payloads or API changes
- Fix approach:
  - Add Zod schemas validating Clerk webhook data (`email_addresses` array, required fields, etc.)
  - Reject invalid payloads with clear error messages
  - Add integration tests with various payload shapes

**No API Versioning Strategy:**
- Problem: All endpoints at `/users`, `/webhooks` with no version prefix
- Blocks: Cannot evolve API without breaking existing clients
- Fix approach:
  - Adopt REST versioning (e.g., `/v1/users`, `/v2/users`)
  - Document versioning policy in API README
  - Plan deprecation windows for old versions

**No Monitoring/Observability:**
- Problem: No structured logging, tracing, or metrics collection
- Blocks: Cannot diagnose production issues or understand performance characteristics
- Fix approach:
  - Add structured logging (Winston, Pino) with correlation IDs
  - Integrate distributed tracing (OpenTelemetry) for request tracking
  - Add APM (Application Performance Monitoring) integration

## Test Coverage Gaps

**Critical Webhook Handling Path Untested:**
- What's not tested:
  - Svix signature verification success/failure
  - Clerk event type routing (user.created vs user.updated vs user.deleted)
  - Null safety in email extraction
  - Race conditions between concurrent webhook events
- Files: `apps/api/src/presentation/controllers/webhook.controller.ts`
- Risk: Webhook handler is single point of failure for user sync. Any regression goes undetected in CI
- Priority: **High** - This is critical for production reliability

**Database Repository Operations Untested:**
- What's not tested:
  - CRUD operations (create, read, update, delete)
  - Error cases (duplicate clerkId, missing user)
  - Transaction behavior
  - Pool cleanup on module destroy
- Files:
  - `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts`
  - `apps/api/src/infrastructure/database/drizzle/drizzle.service.ts`
- Risk: Database layer changes go untested; production data corruption possible
- Priority: **High** - Data layer is critical

**Use Case Logic Untested:**
- What's not tested:
  - SyncUserUseCase create vs update branching
  - DeleteUserUseCase idempotency
  - Dependency injection and module initialization
- Files: `apps/api/src/core/use-cases/user/*`
- Risk: Business logic changes are not validated before deployment
- Priority: **High** - Core domain logic

**Web Frontend Has No Tests:**
- What's not tested:
  - Page component rendering
  - Clerk authentication integration
  - Navigation between routes
  - Responsive layout behavior
- Files: `apps/web/app/**`, `apps/web/components/**`
- Risk: UI regressions only caught manually or by users
- Priority: **Medium** - UI is less critical than API but still user-facing

**API Integration Tests Missing:**
- What's not tested:
  - End-to-end request/response cycles
  - Error response formats
  - Status codes for different scenarios (400, 401, 404, 500)
  - Clerk guard authentication flow
- Files: `apps/api/test/*` (only placeholder e2e test exists)
- Risk: API contract changes not caught; clients may receive unexpected responses
- Priority: **High** - Integration testing is essential for confidence

---

*Concerns audit: 2026-01-28*
