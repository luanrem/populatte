# Populatte

## What This Is

A B2B SaaS that automates form-filling from Excel data via a browser extension. The NestJS API handles authentication, project management, and data ingestion. The Next.js dashboard manages projects and uploads. The Chrome extension maps Excel columns to form fields and auto-populates web forms.

## Core Value

**Transform tedious manual data entry into automated form population.** Upload Excel, map columns to fields, populate forms in one click.

## Current Milestone: v2.0 Data Ingestion Engine

**Goal:** Create a robust API to ingest unstructured Excel files and normalize them into standardized JSONB format in PostgreSQL, using the Strategy Pattern to support multiple ingestion modes.

**Target features:**
- File upload with Multer (max 5MB/file, max 50 files/request)
- Strategy Pattern: `ListModeStrategy` (one file, many rows) and `ProfileModeStrategy` (many files, one entity per file)
- Atomic batch operations with database transactions
- JSONB normalized data storage with source traceability

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

### Active

- [ ] Batch creation with file upload (POST /projects/:projectId/batches)
- [ ] ListModeStrategy: Parse single Excel file into N rows with headers as keys
- [ ] ProfileModeStrategy: Parse N Excel files into N rows with cell-address keys
- [ ] Strategy selection via request body parameter
- [ ] Atomic batch insert with database transactions (full rollback on failure)
- [ ] JSONB normalized data storage in `rows` table
- [ ] Source filename traceability on every row
- [ ] File validation: max 5MB per file, max 50 files per request
- [ ] Input validation: list_mode rejects >1 file, profile_mode accepts 1..N
- [ ] Drizzle schema for `batches` and `rows` tables with proper relationships

### Out of Scope

- OAuth/social login providers — Clerk handles this upstream
- Roles/permissions system — future milestone
- Session management UI — handled by Clerk components
- API rate limiting — separate infrastructure concern
- Frontend upload UI — v2.0 is backend-only (API first)
- PDF ingestion strategy — future extension via Strategy Pattern
- Notion ingestion strategy — future extension via Strategy Pattern
- Key-Value heuristic detection for profile mode — deferred, cell-address keys for MVP
- Streaming/chunked upload for large files — deferred to optimization milestone
- Row-level error reporting (partial success) — entire batch is atomic for MVP

## Context

**Shipped v1.0** with 4,244 LOC TypeScript across 65 files.
Tech stack: NestJS 11, Next.js 16, PostgreSQL (Drizzle ORM), Clerk, TanStack Query v5, Zod v4.

**Architecture patterns established:**
- Compare-first sync: Guard fetches stored user, compares fields, writes only on mismatch
- Guard syncs, controller consumes: Zero-database-lookup controller pattern
- Dual sync paths: Guard (request-time) vs SyncUserUseCase (webhook)
- Dual API clients: Client-side (useApiClient with 401 retry) vs Server-side (createServerApiClient)
- Factory pattern for endpoints: `createUserEndpoints(fetchFn)` composable with any fetch implementation
- Smart retry: No 4xx retry, exponential backoff for 5xx/network errors

**v2.0 adds:**
- Strategy Pattern for extensible ingestion (ListMode, ProfileMode, future: PDF, Notion)
- Database transactions for atomic batch operations
- File upload handling with Multer
- Excel parsing with SheetJS (xlsx)

**Known tech debt:**
- Clerk JWT Dashboard config needs human re-verification if template changes (low severity)

## Constraints

- **SOLID Principles**: All implementations must follow Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Strict TypeScript**: No `any`, `noUncheckedIndexedAccess` enabled, explicit return types
- **Language**: All code, comments, and documentation in English
- **Existing Structure**: Must fit within established Clean Architecture layers
- **No Breaking Changes**: Existing auth, user sync, and project CRUD must remain intact
- **Backend Only**: v2.0 is API-first; no frontend changes in this milestone
- **Strategy Pattern**: Ingestion must use strategy interface, no `if/else` blocks in service
- **Atomic Operations**: Batch inserts wrapped in database transactions

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
| Strategy Pattern for ingestion | Open/Closed principle: add new strategies without modifying service | — Pending |
| Cell-address keys for profile mode | Simplest lossless flattening; Key-Value heuristic deferred | — Pending |
| Atomic batch transactions | All-or-nothing insert prevents partial data corruption | — Pending |
| SheetJS (xlsx) for Excel parsing | Lightweight, widely used, handles .xlsx format | — Pending |

---
*Last updated: 2026-01-29 after v2.0 milestone initialization*
