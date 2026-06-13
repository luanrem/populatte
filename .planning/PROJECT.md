# Populatte

## What This Is

A B2B SaaS that automates form-filling from Excel data via a browser extension. The NestJS API handles authentication, project management, data ingestion with strategy-based Excel parsing, field-level analytics with type inference, mapping/step CRUD for form-filling recipes, and batch identifier configuration. The Next.js dashboard manages projects, file uploads, data visualization with paginated batch tables, field exploration with card-based inventory, and full mapping/step management with drag-and-drop editing. The Chrome extension (WXT + Manifest V3) uses a persistent Side Panel UI with two tabs (Captura/Preencher), supporting COPILOTO mode (manual fill with row navigation, clickable steps list with element highlighting, recent rows history, and compact icon-grid mode) and capture mode (click-to-capture visual mapping creation inside the persistent panel), with connection code auth, project/batch selection, mapping detection, DOM-based form filling with CSS/XPath selectors, row status tracking, and meaningful row identifiers.

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
- ✓ React Query hooks for batch list, detail, rows, and upload mutation — v2.2
- ✓ Zod response schemas for batch API responses — v2.2
- ✓ FormData upload support in API client — v2.2
- ✓ Project detail page with breadcrumb navigation — v2.2
- ✓ Upload modal with List/Profile mode selector and drag-and-drop — v2.2
- ✓ Client-side file validation (size, type, count) — v2.2
- ✓ Responsive batch grid with mode badges and relative dates — v2.2
- ✓ Dynamic data table with server-side pagination — v2.2
- ✓ Smooth page transitions with keepPreviousData — v2.2
- ✓ Complete dashboard upload-to-view flow — v2.2
- ✓ Backend field stats endpoint with CTE-based aggregation and type inference — v2.3
- ✓ Backend field values endpoint with paginated search and dual count system — v2.3
- ✓ Field Inventory card grid with type badges, presence bars, and mode-aware defaults — v2.3
- ✓ View Values side sheet with infinite scroll, debounced search, and copy-to-clipboard — v2.3
- ✓ View toggle between table and field inventory on any batch — v2.3
- ✓ Type inference engine with Brazilian locale support (CPF/CNPJ/CEP, DD/MM/YYYY, R$ currency) — v2.3
- ✓ Mapping entity with project ownership, target URL, optional success trigger — v3.0
- ✓ Step entity with ordered actions (fill/click/wait/verify), selector fallbacks, sourceFieldKey XOR fixedValue — v3.0
- ✓ Full CRUD for mappings (create, list, get, update, soft-delete) — v3.0
- ✓ Full CRUD for steps (create, update, delete, reorder) — v3.0
- ✓ Prefix-based URL matching for extension lookup — v3.0
- ✓ Auto-increment step ordering on create — v3.0
- ✓ Ownership validation following 404/403 separation pattern — v3.0
- ✓ Defense-in-depth: step belongs to mapping, mapping belongs to project — v3.0
- ✓ Extension builds with WXT + Vite + Manifest V3 — v4.0
- ✓ TypeScript configured for all contexts (popup, background, content script) — v4.0
- ✓ Type-safe message bus enables communication between all contexts — v4.0
- ✓ chrome.storage abstraction layer handles session and local persistence — v4.0
- ✓ Shared types integrated from @populatte/types package — v4.0
- ✓ Extension loads successfully in Chrome developer mode — v4.0
- ✓ Web app generates 5-minute connection code via POST /auth/extension-code — v4.0
- ✓ Extension exchanges code for 30-day JWT via POST /auth/extension-token — v4.0
- ✓ GET /auth/me validates token and returns user info — v4.0
- ✓ Extension code is single-use (invalidated after exchange) — v4.0
- ✓ Extension auth endpoints follow Clean Architecture patterns — v4.0
- ✓ PATCH /projects/:projectId/batches/:batchId/rows/:rowId updates row status — v4.0
- ✓ Row status supports PENDING, VALID, ERROR values — v4.0
- ✓ Optional errorMessage field stores failure reason — v4.0
- ✓ Row status ownership validation follows 404/403 pattern — v4.0
- ✓ User clicks "Connect" in popup to start auth flow — v4.0
- ✓ Extension opens web app connection page in new tab — v4.0
- ✓ User copies code from web app and pastes in extension — v4.0
- ✓ Extension exchanges code for JWT and stores in chrome.storage.local — v4.0
- ✓ Connection status indicator shows authenticated/disconnected state — v4.0
- ✓ On 401 response, extension prompts user to reconnect — v4.0
- ✓ Project selector dropdown fetches and displays user's projects — v4.0
- ✓ Batch selector dropdown fetches batches for selected project — v4.0
- ✓ Row indicator shows current row number and total rows — v4.0
- ✓ Fill button triggers form fill for current row — v4.0
- ✓ Next button advances to next row after fill — v4.0
- ✓ Stop button aborts ongoing fill operation — v4.0
- ✓ Mapping indicator shows when current URL has available mapping — v4.0
- ✓ State persists and restores when popup closes and reopens — v4.0
- ✓ Selector engine finds elements via CSS selector — v4.0
- ✓ Selector engine finds elements via XPath — v4.0
- ✓ Fallback chain tries alternative selectors when primary fails — v4.0
- ✓ Fill action populates input/textarea/select elements — v4.0
- ✓ Fill action uses native setters to trigger React/Vue reactivity — v4.0
- ✓ Click action clicks buttons and links — v4.0
- ✓ Wait action pauses execution for specified duration — v4.0
- ✓ Step executor processes steps in order and reports results — v4.0
- ✓ URL change trigger detects when page navigates to success URL pattern — v4.0
- ✓ Text appears trigger detects when success message appears on page — v4.0
- ✓ Element disappears trigger detects when form/modal is removed — v4.0
- ✓ Timeout prevents infinite waiting (configurable, default 30s) — v4.0
- ✓ Background detects URL change and checks for matching mappings — v4.0
- ✓ Background fetches mapping detail with steps for current URL — v4.0
- ✓ Background sends steps and row data to content script for execution — v4.0
- ✓ Content script reports fill success/failure to background — v4.0
- ✓ Background updates row status via API after fill attempt — v4.0
- ✓ Popup shows fill progress (current step, status) — v4.0
- ✓ Error state shows retry option for failed fills — v4.0
- ✓ User can manually advance to next row after verification (COPILOTO mode) — v4.0
- ✓ Project/batch update and soft-delete CRUD with cascade deletion — v5.0
- ✓ Batch identifier field configuration (primary + secondary) with field inventory validation — v5.0
- ✓ Dashboard inline editing for projects and batches with batch settings modal — v5.0
- ✓ Dashboard mappings list with CRUD operations and instruction modal — v5.0
- ✓ Dashboard mapping editor with properties form, unsaved changes guard, and step management — v5.0
- ✓ Dashboard step edit modal with action type, selectors, source/fixed value, and options — v5.0
- ✓ Dashboard drag-and-drop step reorder with portal overlay — v5.0
- ✓ Extension capture mode with click-to-capture, element highlighting, and storage-based step sync — v5.0
- ✓ Extension mapping save flow with success state and dashboard link — v5.0
- ✓ Extension row identifier display with copy-to-clipboard and prev/next navigation — v5.0
- ✓ Chrome Side Panel with persistent UI that stays open during page interaction — v5.1
- ✓ Tabs structure (Captura / Preencher) with state-aware enable/disable — v5.1
- ✓ Clickable steps list with element highlighting on page — v5.1
- ✓ Recent rows history section with status indicators and click navigation — v5.1
- ✓ Capture mode fully functional in Side Panel (persistent capture) — v5.1
- ✓ Compact mode with step icon strip and hover tooltips — v5.1
- ✓ Port-based lifecycle detection with auto-reconnect on service worker termination — v5.1
- ✓ Keyboard shortcut (Ctrl+B / Cmd+B) for compact mode toggle — v5.1

### Active

- [ ] AUTOPILOTO mode — auto-advance rows after successful fills
- [ ] Keyboard shortcuts for fill (Ctrl+Shift+F) and next row (Ctrl+Shift+N)
- [ ] Field highlighting during fill execution
- [ ] Batch progress summary in Side Panel header

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
- Domain-specific type detection (CPF, CNPJ, EMAIL, PHONE) — deferred to future type enhancement milestone
- Completeness heatmap, sort/filter controls, bulk copy for field inventory — UI enhancements deferred
- GIN index on JSONB data column — performance optimization deferred until needed
- CSS selector validation in API — extension validates selectors against live DOM
- Redis caching for mappings — optimization deferred
- Mapping versioning/history — future enhancement
- Mapping import/export — future enhancement
- Mapping duplication/cloning — future enhancement
- Auto-capture fallback selectors — only primary selector in capture; fallbacks added via dashboard
- Test mapping in dashboard — test via extension only, validates real DOM
- Smart field detection — unreliable without training data
- Multi-URL workflows — high complexity, single-form MVP first
- Settings page in Side Panel — placeholder only, full settings deferred
- Multi-tab capture coordination — single-tab capture only, cross-tab adds race conditions
- Offline support for recentes — requires sync complexity
- Programmatic panel resize — Chrome Side Panel API has no width control
- Toggle between popup and Side Panel — popup fully replaced by Side Panel (simpler single UI surface)
- Shared component extraction (popup/Side Panel reuse) — unnecessary after popup removal

## Context

**Shipped v5.1** with Side Panel migration and UX improvements (86 files changed, +11,009/-1,145 lines, 15 plans across 6 phases).
Tech stack: NestJS 11, Next.js 16, PostgreSQL (Drizzle ORM), Clerk, TanStack Query v5, Zod v4, SheetJS 0.20.3, react-dropzone 14, react-intersection-observer, shadcn/ui, dnd-kit, **WXT 0.20.13**, Manifest V3, React 19 (extension), jose (JWT), Chrome Side Panel API.

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
| FormData Content-Type skip | Conditionally omit Content-Type for FormData to allow browser multipart boundary | ✓ Good |
| Fixed query key without pagination params | Simplifies cache invalidation on upload (invalidate all batch lists for project) | ✓ Good |
| react-dropzone for file upload | Robust drag-and-drop with validation hooks; type assertions for strict TS | ✓ Good |
| Mode selector as side-by-side cards | Visual clarity for List vs Profile mode (more intuitive than dropdown) | ✓ Good |
| keepPreviousData for pagination | Prevents loading flash between page transitions; previous data stays visible | ✓ Good |
| Dynamic columns from columnMetadata | Supports any Excel structure; preserves original column order and headers | ✓ Good |
| Sticky row number column | Preserves context when horizontally scrolling wide tables | ✓ Good |
| Tooltip on every cell | Simpler than conditional truncation detection; acceptable DOM overhead for MVP | ✓ Good |
| Page size change resets offset | Prevents invalid pagination state (e.g., offset=200 with limit=25) | ✓ Good |
| TDD for TypeInferenceService | RED-GREEN-REFACTOR catches edge cases during test writing; 35 tests | ✓ Good |
| Brazilian date check BEFORE ISO parse | Prevents DD/MM/YYYY misinterpretation as MM/DD/YYYY American format | ✓ Good |
| 80% confidence threshold with STRING fallback | Mixed-type columns default to STRING with 1.0 confidence | ✓ Good |
| Single CTE-based field aggregation | No N+1 per field; jsonb_object_keys extracts dynamic field names | ✓ Good |
| Empty strings not counted toward presence | Semantically "no value"; presence reflects meaningful data | ✓ Good |
| First 100 rows for type inference sample | Balances accuracy with performance; deterministic sort | ✓ Good |
| Parallel CTE queries for field values | Promise.all for values+matchingCount and totalDistinctCount | ✓ Good |
| Dual count system (matching + total) | Enables "X of Y matches (Z total)" rich pagination UX | ✓ Good |
| ILIKE search on values only | Total count stays constant; UI shows matches vs total | ✓ Good |
| Field key validation via normalizedKey | Consistent with field stats and overall system field key handling | ✓ Good |
| URL-encoded field keys at controller | decodeURIComponent handles spaces/special chars in Excel headers | ✓ Good |
| z.enum for InferredType | Matches backend enum values exactly; compile-time safety | ✓ Good |
| Mode-aware view defaults | PROFILE_MODE → inventory, LIST_MODE → table via useEffect on batch.mode | ✓ Good |
| Type badge color coding | STRING=slate, NUMBER=blue, DATE=amber, BOOLEAN=emerald, UNKNOWN=gray | ✓ Good |
| Key-prop remount for field switching | React Compiler compatible; cleaner than useEffect setState reset | ✓ Good |
| React Compiler auto-memoization | Removed manual useMemo; compiler handles optimization | ✓ Good |
| Sentinel-based infinite scroll | IntersectionObserver ref on invisible div triggers fetchNextPage | ✓ Good |
| useDebounce generic hook (300ms) | Reusable across search inputs; prevents excessive API calls | ✓ Good |
| Copy feedback with CheckCheck icon | 1.5s setTimeout reset; clipboard API in browser context | ✓ Good |
| No userId param in MappingRepository | Ownership validated at use-case layer via project lookup | ✓ Good |
| SuccessConfig uses jsonb with typed $type<>() | Compile-time safety while allowing future extension | ✓ Good |
| Steps use hard-delete (no deletedAt) | Steps are cheap to recreate; soft-delete adds unnecessary complexity | ✓ Good |
| Inverted URL prefix matching | Extension can find mappings where stored targetUrl is prefix of current URL | ✓ Good |
| Page (1-indexed) in ListMappingsResult | Per CONTEXT.md requirement, calculated as Math.floor(offset / limit) + 1 | ✓ Good |
| findByIdWithDeleted for delete flow | Enables proper 404 for already soft-deleted mappings | ✓ Good |
| z.preprocess for successTrigger enum coercion | Avoids TypeScript comparison errors with empty string to null | ✓ Good |
| Step routes nested under /mappings/:mappingId | REST resource hierarchy; mapping already establishes project ownership | ✓ Good |
| Zod refine for mutual exclusion | sourceFieldKey/fixedValue validation at DTO level for early rejection | ✓ Good |
| Zod refine for duplicate detection in reorder | Detects duplicate step IDs before reaching use case layer | ✓ Good |
| StepOrder auto-increments via getMaxStepOrder | maxOrder + 1 on creation; no manual order assignment needed | ✓ Good |
| Strict reorder validation | Validates exact match (length, duplicates, missing, extra IDs) | ✓ Good |
| Defense-in-depth on step operations | Verify step.mappingId === URL mappingId before ownership chain | ✓ Good |
| WXT 0.20.13 over CRXJS | Built-in storage and messaging abstractions, MV3 support, multi-browser | ✓ Good |
| Service Worker state via chrome.storage | 30-second termination risk means all state must be persisted | ✓ Good |
| Native property setters for form fills | React/Vue controlled components require setter access for reactivity | ✓ Good |
| Jose library for extension JWT | Already in ecosystem, no CommonJS issues, modern async API | ✓ Good |
| In-memory lockout map | Simple brute-force protection (5 attempts, 15min timeout), Redis for prod | ✓ Good |
| 6-digit numeric connection codes | Familiar from 2FA, easy to type, 1M combinations with short expiry | ✓ Good |
| fetchWithAuth clears auth on 401 | Auto-disconnect on invalid token, broadcasts STATE_UPDATED | ✓ Good |
| Discriminated union message types | Type-safe message passing with explicit type field | ✓ Good |
| Module state for current mapping | Represents UI selection, may differ from preferences when auto-selected | ✓ Good |
| Badge count (not checkmark) for mappings | Indicates multiple mapping matches at a glance | ✓ Good |
| 100ms URL polling in content script | Navigation events unreliable in content scripts | ✓ Good |
| MutationObserver for success triggers | Efficient DOM watching for text_appears and element_disappears | ✓ Good |
| Defensive undefined check in sendMessage | Content script may not respond, prevents crash in FILL_START | ✓ Good |
| Cascade soft-delete without transaction | Idempotent soft-delete is retryable; no atomicity needed for MVP | ✓ Good |
| Response enrichment in use cases | Use cases inject repositories to add computed data (totalRows) | ✓ Good |
| Config replaces list view for batch settings | Modal-free, simpler navigation than batch detail tabs | ✓ Good |
| dnd-kit in extension (same as web) | Consistent DnD behavior across apps | ✓ Good |
| Storage-based step sync in capture | Popup cannot receive messages when closed; chrome.storage.local | ✓ Good |
| Background as message router | Popup cannot directly message content scripts | ✓ Good |
| Module-level captureMode instance | Persists across messages, cleaned up on CAPTURE_STOP | ✓ Good |
| Store identifier keys at batch selection | Fetch once at BATCH_SELECT, use for all rows | ✓ Good |
| Navigation arrows hidden for single-row batches | Reduces UI clutter, conditional rendering | ✓ Good |
| createPortal for DragOverlay | Prevents clipping by overflow containers | ✓ Good |
| Side Panel replaces popup entirely | Persistent UI solves popup-closes-on-click; simpler single surface | ✓ Good |
| Port-based communication for Side Panel | Enables disconnect detection, per-tab isolation, lifecycle management | ✓ Good |
| Per-tab state via Map<tabId, TabState> | URL-dependent state isolated; selection state remains global | ✓ Good |
| Exponential backoff reconnection (500ms-8s) | Auto-reconnect on SW termination with max 5 retries, reset on success | ✓ Good |
| Keepalive alarm at 4 minutes | Extends SW lifetime to prevent premature termination | ✓ Good |
| Tab bar with custom CSS tooltip | Instant hover display (no native title delay); shadcn-style aesthetic | ✓ Good |
| Optimistic tab switch before async ops | Instant feedback, rollback on error | ✓ Good |
| Sticky footer pattern for fill controls | Row navigator + fill controls always visible at bottom | ✓ Good |
| Steps list collapsed by default | Reduces visual clutter; expanded via chevron toggle | ✓ Good |
| Amber outline for step highlighting | Distinct from blue capture mode; auto-dismiss after 3s | ✓ Good |
| CSS tooltip via group-hover for badges | Instant display, no delay; reused across steps and compact mode | ✓ Good |
| Recent rows in chrome.storage.local per batch | FIFO eviction (max 10), survives panel close/reopen | ✓ Good |
| Compact mode as internal CSS layout | No Chrome panel resize API; transforms within full panel width | ✓ Good |
| 3-column icon grid for compact mode | ~85px per cell; badges for step number, warning, and fill result | ✓ Good |
| Ctrl+B / Cmd+B keyboard shortcut | Familiar toggle pattern; CSS transitions for smooth animation | ✓ Good |

## Current Milestone: Planning Next

v5.1 Side Panel & UX Improvements shipped 2026-02-20. See MILESTONES.md for details.

Next milestone TBD — run `/gsd:new-milestone` to define scope.

---
*Last updated: 2026-02-20 after v5.1 milestone completed*
