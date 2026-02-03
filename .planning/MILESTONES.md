# Project Milestones: Populatte

## v3.0 Backend Mapping (Shipped: 2026-02-03)

**Delivered:** Mapping CRUD layer that associates Excel columns to web form selectors, enabling the Chrome extension to fetch and execute form-filling recipes with full ownership validation and defense-in-depth security.

**Phases completed:** 21-23 (6 plans total)

**Key accomplishments:**
- Mapping and Step domain models with Drizzle schemas, pgEnums (success_trigger, step_action), and repository abstractions
- Complete mapping CRUD (create, list, get, update, soft-delete) with project ownership validation (404/403 separation)
- Complete step CRUD (create, update, delete, reorder) with auto-assigned stepOrder and hard delete
- Defense-in-depth security: step -> mapping -> project -> user ownership chain on all step operations
- Inverted URL prefix matching for extension lookup (stored targetUrl is prefix of current page URL)
- Zod DTO validation with mutual exclusion refinement (sourceFieldKey XOR fixedValue) and duplicate detection for reorder

**Stats:**
- 58 files changed (+6,254 / -58 lines)
- ~6,302 lines of TypeScript (API only)
- 3 phases, 6 plans
- 1 day (2026-02-02 → 2026-02-03)
- Execution time: ~17min (avg 2m 47s/plan)

**Git range:** `docs(21)` → `docs(23)`

**What's next:** v3.1 Mapping Frontend or v3.2 Extension Integration — `/gsd:new-milestone` to define scope

---

## v2.3 Field Inventory (Shipped: 2026-02-02)

**Delivered:** Field-level analytics and exploration for ingested Excel data, enabling users to view per-field statistics (type, presence, uniqueness) and browse/search/copy individual field values via a card-based inventory with side sheet.

**Phases completed:** 17-20 (7 plans total)

**Key accomplishments:**
- Type inference engine with Brazilian locale support (CPF/CNPJ/CEP, DD/MM/YYYY, R$ currency) and 80% confidence threshold via TDD
- CTE-based single-query field aggregation for per-field stats (presence, uniqueness, inferred type) without N+1
- Paginated field values endpoint with ILIKE search, dual count system (matching + total), and parallel CTE queries
- Field Inventory card grid with color-coded type badges, presence progress bars, mode-aware defaults, and search filtering
- View Values side sheet with infinite scroll (IntersectionObserver), debounced search, copy-to-clipboard with inline feedback
- End-to-end field exploration flow: upload → view batch → toggle to inventory → click card → browse/search/copy values

**Stats:**
- 60 files changed (+8,441 / -203 lines)
- ~12,057 lines of TypeScript (cumulative)
- 4 phases, 7 plans, 14 tasks
- 3 days (2026-01-30 → 2026-02-02)
- Execution time: ~20m 30s (avg 2m 46s/plan)

**Git range:** `docs(17)` → `docs(20)`

**What's next:** Next milestone TBD — `/gsd:new-milestone` to define scope

---

## v2.2 Dashboard Upload & Listing UI (Shipped: 2026-01-30)

**Delivered:** Frontend interface for uploading Excel files and viewing ingested data, connecting the Next.js dashboard to batch/row API endpoints with a complete project detail → upload → batch grid → data table flow.

**Phases completed:** 13-16 (4 plans total)

**Key accomplishments:**
- React Query + Zod batch API layer with FormData upload support and cache invalidation
- Upload modal with List/Profile mode selector cards and drag-and-drop file zone (react-dropzone)
- Responsive batch grid with Portuguese relative dates and colored mode badges
- Dynamic data table with server-side pagination, keepPreviousData, sticky row numbers, and tooltips
- Complete dashboard upload flow: Project detail → Upload → Batch grid → Batch detail with paginated data

**Stats:**
- 14 source files created/modified (40 total with docs/lock)
- 1,696 lines of TypeScript added
- 4 phases, 4 plans, 10 tasks
- 1 day (2026-01-30, single session)
- Execution time: 15m 54s (avg 3m 57s/plan)

**Git range:** `feat(13-01)` → `docs(16)`

**What's next:** Next milestone TBD — `/gsd:new-milestone` to define scope

---

## v2.1 Batch Read Layer (Shipped: 2026-01-30)

**Delivered:** Read endpoints for batch metadata and paginated row data, closing the read cycle so the dashboard can display ingested Excel data for user validation.

**Phases completed:** 11-12 (2 plans total)

**Key accomplishments:**
- PaginatedResult<T> generic type with Promise.all two-query pattern for optimal performance
- Paginated repository methods with comprehensive soft-delete filtering across all read queries
- Three GET endpoints (batch list, batch detail, paginated rows) with 404/403 ownership validation
- countByBatchId repository method for efficient totalRows computation
- Zod-validated pagination (limit 1-100, offset >=0) with strict validation (400 on invalid, no silent fallback)
- Defense-in-depth cross-project access prevention (batch.projectId === projectId)

**Stats:**
- 15 files created/modified
- 435 lines of TypeScript
- 2 phases, 2 plans, 4 tasks
- 1 day (2026-01-30, single session)

**Git range:** `feat(11-01)` → `docs(12)`

**What's next:** Next milestone TBD — `/gsd:new-milestone` to define scope

---

## v2.0 Data Ingestion Engine (Shipped: 2026-01-29)

**Delivered:** Robust Excel file ingestion pipeline with Strategy Pattern parsing, atomic database transactions, and multi-layer file validation for the NestJS backend.

**Phases completed:** 1-10 (12 plans total)

**Key accomplishments:**
- Domain foundation with Batch/Row entities, Drizzle schemas, and chunked bulk insert (5,000 rows/INSERT)
- CLS-based transaction infrastructure with atomic rollback and SheetJS Excel parsing
- Strategy Pattern ingestion: ListModeStrategy (header-based) and ProfileModeStrategy (cell-address)
- Transactional CreateBatch use case with project ownership validation (404/403 separation)
- REST endpoint with Multer file upload, Clerk auth, size limits, and magic-byte file validation
- Zod v4 DTO validation with custom error messages and safeParse pattern

**Stats:**
- 51 files created/modified
- 3,259 lines of TypeScript
- 10 phases, 12 plans, ~20 tasks
- 1 day from start to ship (2026-01-29, single session)

**Git range:** `feat(01-01)` → `docs(10)`

**What's next:** Next milestone TBD — `/gsd:new-milestone` to define scope

---

## v1.0 End-to-End Auth & User Sync (Shipped: 2026-01-28)

**Delivered:** Request-time user synchronization between Clerk, NestJS backend, and Next.js frontend with type-safe API client and automatic token management.

**Phases completed:** 1-3 (5 plans total)

**Key accomplishments:**
- Atomic user sync on every authenticated request via ClerkAuthGuard with compare-first optimization
- Full User entity attached to request object — controllers never manually fetch users
- Dual API client (client-side with 401 retry, server-side with fresh tokens) for type-safe authenticated requests
- TanStack Query data layer with Zod runtime validation and smart retry (no 4xx, exponential backoff for 5xx)
- Health monitoring infrastructure with sync failure rate tracking
- Database schema extended with soft delete, atomic upsert, and Joi env validation

**Stats:**
- 65 files created/modified
- 4,244 lines of TypeScript
- 3 phases, 5 plans, 12 tasks
- Executed on 2026-01-28 (single session)

**Git range:** `feat(01-01)` → `docs(03)`

**What's next:** Next milestone TBD — `/gsd:new-milestone` to define scope

---
