# Populatte

## What This Is

A B2B SaaS that automates form-filling from Excel data via a browser extension. The NestJS API handles authentication, project management, and data ingestion with strategy-based Excel parsing. The Next.js dashboard manages projects and uploads. The Chrome extension maps Excel columns to form fields and auto-populates web forms.

## Core Value

**Transform tedious manual data entry into automated form population.** Upload Excel, map columns to fields, populate forms in one click.

## Requirements

### Validated

- ✓ ClerkAuthGuard validates JWT tokens — existing
- ✓ SyncUserUseCase creates/updates users from Clerk data — existing
- ✓ Webhook-based user sync (Clerk → API) — existing
- ✓ Drizzle schema with users table (clerkId, email, name, imageUrl) — existing
- ✓ Clean Architecture layers (Core/Infrastructure/Presentation) — existing
- ✓ Clerk integration on frontend (ClerkProvider, middleware) — existing
- ✓ Auth guard performs request-time user sync (create if not found, update metadata) — v1.0
- ✓ Auth guard attaches local User entity to request (not just clerkId) — v1.0
- ✓ ClerkService extracts full user claims from JWT (email, name, imageUrl) — v1.0
- ✓ CurrentUser decorator returns local User entity — v1.0
- ✓ API client with automatic Clerk token injection — v1.0
- ✓ 401 error handling with token refresh + retry — v1.0
- ✓ Type-safe API response handling with Zod schemas — v1.0
- ✓ Project CRUD (create, list, get, update, soft-delete) — v1.0
- ✓ Batch creation with file upload (POST /projects/:projectId/batches) — v2.0
- ✓ ListModeStrategy: Parse single Excel file into N rows with headers as keys — v2.0
- ✓ ProfileModeStrategy: Parse N Excel files into N rows with cell-address keys — v2.0
- ✓ Strategy selection via request body parameter — v2.0
- ✓ Atomic batch insert with database transactions (full rollback on failure) — v2.0
- ✓ JSONB normalized data storage in `rows` table — v2.0
- ✓ Source filename traceability on every row — v2.0
- ✓ File validation: max 5MB per file, max 50 files per request — v2.0
- ✓ Input validation: list_mode rejects >1 file, profile_mode accepts 1..N — v2.0
- ✓ Drizzle schema for `batches` and `rows` tables with proper relationships — v2.0
- ✓ Batch detail retrieval (metadata, columnMetadata, mode, totalRows) via GET endpoint — v2.1
- ✓ Batch list with pagination and totalRows per batch — v2.1
- ✓ Paginated row listing ordered by sourceRowIndex — v2.1
- ✓ Ownership validation on read endpoints consistent with write path (404/403) — v2.1
- ✓ Standard pagination response shape (items, total, limit, offset) — v2.1
- ✓ Soft-delete filtering on all read queries (batches, rows, projects) — v2.1
- ✓ PaginatedResult<T> generic type for consistent pagination — v2.1
- ✓ Zod-validated pagination params (limit 1-100, offset >=0) with 400 on invalid — v2.1

### Active

No active requirements. Next milestone not yet defined.

### Out of Scope

- OAuth/social login providers — Clerk handles this upstream
- Roles/permissions system — future milestone
- Session management UI — handled by Clerk components
- API rate limiting — separate infrastructure concern
- PDF ingestion strategy — future extension via Strategy Pattern
- Notion ingestion strategy — future extension via Strategy Pattern
- Key-Value heuristic detection for profile mode — deferred, cell-address keys sufficient for MVP
- Streaming/chunked upload for large files — deferred to optimization milestone
- Row-level error reporting (partial success) — entire batch is atomic for MVP

## Context

**Shipped v2.1** with 8,505+ LOC TypeScript across 130+ files (cumulative).
Tech stack: NestJS 11, Next.js 16, PostgreSQL (Drizzle ORM), Clerk, TanStack Query v5, Zod v4, SheetJS 0.20.3.

**Architecture patterns established:**
- Compare-first sync: Guard fetches stored user, compares fields, writes only on mismatch
- Guard syncs, controller consumes: Zero-database-lookup controller pattern
- Dual sync paths: Guard (request-time) vs SyncUserUseCase (webhook)
- Dual API clients: Client-side (useApiClient with 401 retry) vs Server-side (createServerApiClient)
- Factory pattern for endpoints: `createUserEndpoints(fetchFn)` composable with any fetch implementation
- Smart retry: No 4xx retry, exponential backoff for 5xx/network errors
- Strategy Pattern for extensible ingestion (ListMode, ProfileMode, future: PDF, Notion)
- CLS-based transactions for atomic batch operations via @nestjs-cls/transactional
- Chunked bulk inserts (5,000 rows/INSERT) for PostgreSQL parameter limit compliance
- Magic-byte file validation (ZIP/OLE2/CSV) before parser execution
- Symbol-based DI tokens for strategy injection (prevents provider collisions)
- Two-query pagination pattern with Promise.all for paginated results
- Shared conditions variable between data and count queries (prevents inconsistency)
- Tiebreaker sorting for deterministic pagination (sourceRowIndex ASC, id ASC)
- Ownership validation pattern: findByIdOnly → deletedAt check → userId match → 403 with security log
- Defense-in-depth: verify child resource belongs to parent (batch.projectId === projectId)

**Known tech debt:**
- Clerk JWT Dashboard config needs human re-verification if template changes (low severity)
- Pre-existing ESLint errors in v1.0 code (6 issues across sync-user, cell-access, main, webhook files)
- Pre-existing TypeScript error in list-mode.strategy.ts (Object.entries type issue)
- ContentLengthMiddleware cannot log userId (runs before auth guard — architectural trade-off)
- FilesInterceptor limits hardcoded (NestJS decorator limitation, documented as intentional)
- ListBatchesUseCase N+1 query pattern (max 101 queries at limit=100, MVP-acceptable with Promise.all)

## Constraints

- **SOLID Principles**: All implementations must follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Strict TypeScript**: No `any`, `noUncheckedIndexedAccess` enabled, explicit return types
- **Language**: All code, comments, and documentation in English
- **Existing Structure**: Must fit within established Clean Architecture layers
- **No Breaking Changes**: Existing auth, user sync, project CRUD, and data ingestion must remain intact
- **Strategy Pattern**: Ingestion uses strategy interface; new strategies extend, not modify

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Request-time sync creates users | Eliminates race condition where user authenticates before webhook | ✓ Good |
| Sync on every request (compare-first) | Keeps user metadata fresh, skips write if unchanged | ✓ Good |
| Guard attaches full User entity | Controllers work with internal User, not Clerk concepts | ✓ Good |
| Fetch wrapper over Axios | Simpler, no extra dependency, aligns with Next.js patterns | ✓ Good |
| Token refresh + retry on 401 | Better UX than immediate redirect; handles token expiry gracefully | ✓ Good |
| Separate client/server fetch wrappers | Different token acquisition, env vars, retry strategies | ✓ Good |
| Clerk skipCache (not forceRefresh) | Correct Clerk API for forcing fresh tokens | ✓ Good |
| Guard calls upsert directly (not SyncUserUseCase) | Compare-first optimization is different from webhook's unconditional upsert | ✓ Good |
| DATABASE_URL replaces SUPABASE_URL | Consistency across drizzle.config, database.config, env validation | ✓ Good |
| Partial unique index on clerkId | Allows re-creation of soft-deleted users with same clerkId | ✓ Good |
| HealthModule marked @Global() | Cross-module SyncFailureIndicator injection without circular deps | ✓ Good |
| Zod safeParse for runtime validation | Explicit error handling with detailed logging | ✓ Good |
| Factory pattern for endpoints | Composable with any fetch implementation (hook or non-hook) | ✓ Good |
| Smart retry in QueryClient | No 4xx retry, exponential backoff for 5xx/network | ✓ Good |
| useState for stable QueryClient | Prevents cache loss on re-render | ✓ Good |
| Strategy Pattern for ingestion | Open/Closed principle: add new strategies without modifying service | ✓ Good |
| Cell-address keys for profile mode | Simplest lossless flattening; Key-Value heuristic deferred | ✓ Good |
| Atomic batch transactions | All-or-nothing insert prevents partial data corruption | ✓ Good |
| SheetJS (xlsx) from CDN | Lightweight, widely used; CDN avoids npm Prototype Pollution vulnerability | ✓ Good |
| CLS-based transactions (@nestjs-cls/transactional) | Transparent transaction propagation without manual passing | ✓ Good |
| Symbol-based DI tokens for strategies | Prevents NestJS provider collisions with class-based injection | ✓ Good |
| Chunked bulk inserts (5,000 rows) | Stays under PostgreSQL 65,534 parameter limit | ✓ Good |
| Magic-byte file validation | Prevents MIME-type spoofing; no ESM compatibility issues | ✓ Good |
| Content-Length middleware for early rejection | Prevents Multer buffering oversized requests into memory | ✓ Good |
| safeParse for multipart DTO validation | Type-safe Zod validation without unsafe assertions in controller | ✓ Good |
| PaginatedResult<T> with items + total only | Use case layer composes full response; repository stays focused on data access | ✓ Good |
| Batches sorted DESC, rows ASC with tiebreaker | Newest batches first; deterministic row pagination via sourceRowIndex + id | ✓ Good |
| Shared conditions variable in pagination | Prevents inconsistency between data and count queries | ✓ Good |
| countByBatchId as dedicated method | Efficient row counting without pagination hack | ✓ Good |
| N+1 queries in ListBatchesUseCase | MVP trade-off: parallelized with Promise.all, max 101 queries at limit=100 | ✓ Good |
| Zod coercion for pagination query params | Type-safe validation with strict limits (1-100) and 400 on invalid input | ✓ Good |
| Route ordering in BatchController | @Get() → @Get(':batchId') → @Get(':batchId/rows') prevents NestJS path conflicts | ✓ Good |
| Defense-in-depth on batch endpoints | Verify batch.projectId === projectId prevents cross-project access | ✓ Good |

---
*Last updated: 2026-01-30 after v2.1 milestone complete*
