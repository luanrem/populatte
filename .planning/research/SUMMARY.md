# Project Research Summary

**Project:** Populatte v2.3 - Field Inventory
**Domain:** Field-level analytics and data profiling for form-filling automation
**Researched:** 2026-01-30
**Confidence:** HIGH

## Executive Summary

Field Inventory adds column-oriented data exploration to Populatte's existing row-oriented batch detail view. Research into data profiling tools (Tableau Prep, Trifacta, ydata-profiling) reveals universal patterns: field cards with metadata (type, presence, unique count), side panels for value inspection, and client-side search with debouncing. Unlike generic data profiling tools focused on statistical analysis, Populatte's differentiator is **form-mapping preparation** — users need to know "which fields can auto-map to form inputs?" not "what's the standard deviation?"

The recommended approach leverages existing infrastructure: PostgreSQL JSONB operators for field aggregation (single CTE query, not N+1 pattern), custom backend type inference (no JavaScript library exists for runtime type detection), and shadcn/ui Sheet components for non-modal value exploration. Critical dependencies include GIN indexes on JSONB columns (prevents table scans on 10K+ row batches) and pagination for high-cardinality fields (65K theoretical max distinct values).

Key risks center on JSONB query performance and mixed-type field handling. Mitigation: add GIN index before endpoint implementation, use type distribution analysis (not single inferred type), and implement pagination from day one. With 65K row limit and Clean Architecture patterns already established, this milestone extends existing patterns rather than introducing new ones.

## Key Findings

### Recommended Stack

Minimal additions to existing stack — only 2 new dependencies required. Field Inventory leverages existing Drizzle ORM with PostgreSQL JSONB operators via `sql` template tag (no ORM library supports native JSONB aggregation). Type inference requires custom implementation (no JavaScript library for runtime schema detection from values).

**Core technologies:**
- **use-debounce v10.1.0**: Client-side search debouncing — React 19 compatible, 2KB bundle, zero dependencies. Prevents lag when filtering 1000+ values.
- **shadcn/ui ScrollArea**: Long value lists in side sheet — already uses Radix UI foundation, consistent with existing components.
- **Custom FieldTypeInferenceService**: Pattern-based type detection (email regex, date formats, CPF/CNPJ, booleans) — no library exists, domain-specific rules needed.
- **PostgreSQL GIN index**: JSONB aggregation performance — prevents table scans, critical for 10K+ row batches.
- **Drizzle `sql` template + Zod**: Type-safe JSONB queries — Drizzle lacks native JSONB helpers, manual typing with runtime validation required.

**Critical version notes:**
- use-debounce 10.1.0 published Jan 2026, React 19.2.0 compatible (verified)
- ScrollArea already installed via shadcn/ui, no new peer dependencies
- Native Clipboard API (HTTPS required, localhost safe for development)

### Expected Features

Field Inventory is a **subsequent milestone** extending existing batch detail. Users expect universal data profiling patterns but scoped for form-mapping preparation.

**Must have (table stakes):**
- Field cards with name, inferred type, presence count, unique value count
- Basic type inference (string, number, date, boolean, email)
- Side panel showing all values for clicked field
- Search within value list (debounced, client-side)
- Copy individual values to clipboard (Clipboard API)
- View toggle between table and field inventory

**Should have (competitive):**
- Completeness heatmap on cards (visual gradient: red=50%, green=100%)
- Smart type badges (EMAIL, PHONE, CPF, CNPJ beyond generic string/number)
- Example values preview on card (2-3 samples, reduces clicks)
- Bulk copy all values (comma-separated or newline list)
- Sort/filter controls for card grid (A-Z, completeness, unique values)

**Defer (v2+):**
- Field-to-field relationship hints (correlation analysis — HIGH complexity)
- Statistical charts (histograms, box plots — not aligned with form-mapping mission)
- Inline value editing (source of truth is Excel, not dashboard)
- Multi-batch schema comparison (out of scope for single batch view)
- Field rename suggestions (detect A1 notation, suggest LIST_MODE — v2.4 after patterns emerge)

### Architecture Approach

Field Inventory integrates with existing Clean Architecture (Core/Infrastructure/Presentation) via repository extension pattern. No new architectural layers — adds 2 methods to RowRepository (getFieldStats, getFieldValues), implements in DrizzleRowRepository with raw SQL, and orchestrates via new Use Cases following 5-step ownership validation pattern from ListRowsUseCase.

**Major components:**

1. **Backend Field Stats Endpoint** — GET /projects/:projectId/batches/:batchId/field-stats returns aggregated stats (presence count, unique count, inferred type) for all fields in single CTE query. Type inference orchestrated in Use Case layer (application logic), not Repository (data access). Prevents N+1 pattern by aggregating all fields with LATERAL join.

2. **Backend Field Values Endpoint** — GET /projects/:projectId/batches/:batchId/fields/:fieldKey/values returns distinct values for specific field with pagination (limit/offset) and server-side search. Uses PostgreSQL DISTINCT + ORDER BY with JSONB ->> operator. Critical: paginate from day one (65K theoretical max distinct values).

3. **Frontend Field Inventory Grid** — Card-based layout consuming field stats via React Query. Each FieldCard displays metadata (type badge, presence percentage, unique count). Memoized to prevent re-renders on selection change. View toggle in header switches between table and inventory without cache invalidation.

4. **Frontend ViewValuesSheet** — Non-modal shadcn Sheet (modal={false}) for value exploration. Fetches values on demand (enabled: false until field clicked). Client-side search with use-debounce (300ms). ScrollArea for lists, virtualization deferred until proven necessary (most fields <100 unique values).

### Critical Pitfalls

1. **JSONB Aggregation Without Indexes Causes Table Scans** — Field stats queries scan all rows without GIN index. With 10K+ rows, queries timeout or take 10+ seconds. Prevention: Add `CREATE INDEX idx_ingestion_rows_data_gin ON ingestion_rows USING GIN (data jsonb_path_ops);` in migration BEFORE implementing stats endpoint. Use single CTE query with LATERAL join for all fields (not N+1 pattern).

2. **Type Inference on Mixed-Type Fields Causes Runtime Errors** — JSONB field contains mixed types across rows (row 1: "123" string, row 2: 123 number). Frontend assumes all values same type, crashes on render. Prevention: Implement type distribution (string: 90%, number: 10%) not single inferred type. Use `jsonb_typeof()` aggregation. Handle null explicitly with "(empty)" display text.

3. **Large Value Lists Overwhelm Memory and Rendering** — Field with 10K+ distinct values (transaction IDs, timestamps) crashes browser or freezes UI. Backend returns all values without pagination, frontend loads entire array into memory. Prevention: Paginate backend (limit=100, offset, search param). Use react-window FixedSizeList if values exceed 500 (defer to v2.4 if data shows need).

4. **View Toggle State Management Causes Data Refetch** — Switching between table and inventory refetches batch data instead of using React Query cache. Different query keys per view duplicate cache entries. Prevention: Shared queryKey for batch data, view state in URL params. Use `enabled` flag for stats query (only fetch when inventory view active). No invalidation on toggle.

5. **Special Characters in Field Names Break JSONB Queries** — Excel columns with spaces, dots, brackets become JSONB keys. Queries using `data->'Column Name'` fail with syntax errors. Prevention: Use parameterized queries with `sql.param(fieldName)` OR sanitize field names during Excel parsing. Store original→sanitized mapping in `columnMetadata`. A1 notation (cell addresses) conflicts with PostgreSQL patterns.

## Implications for Roadmap

Based on research, suggested 5-phase structure with clear dependency chain:

### Phase 0: Architecture Decisions
**Rationale:** Field name sanitization strategy must be decided before backend implementation. Special characters in Excel columns (spaces, "Price ($)", A1 notation) break JSONB queries if not handled consistently.

**Delivers:**
- Decision: sanitize during Excel parsing OR store mapping in columnMetadata
- GIN index migration for JSONB data column
- Type inference service interface definition

**Addresses:** Pitfall 7 (special characters), Pitfall 1 (JSONB indexes)

**Duration:** 1-2 hours (decision + migration file)

### Phase 1: Backend Field Stats
**Rationale:** Field stats endpoint is prerequisite for all UI work. Must be implemented and testable via HTTP before frontend begins. Single CTE query pattern prevents N+1 pitfalls discovered in research.

**Delivers:**
- FieldStats types in Core entities
- TypeInferenceService (custom implementation, heuristic-based)
- RowRepository.getFieldStats() interface + Drizzle implementation
- GetFieldStatsUseCase with 5-step ownership validation
- BatchController endpoint: GET /field-stats
- Zod DTO schemas for response validation

**Addresses:**
- Features: Field cards metadata (table stakes)
- Pitfall 1: JSONB aggregation (use CTE with LATERAL join)
- Pitfall 2: Type inference (implement distribution, not single type)

**Avoids:** N+1 query pattern, full-table type inference scans

**Duration:** 6-8 hours

### Phase 2: Backend Field Values
**Rationale:** Field values endpoint needed before side sheet implementation. Pagination must be implemented from day one (not retrofitted) due to 65K theoretical max distinct values.

**Delivers:**
- RowRepository.getFieldValues() interface + Drizzle implementation
- GetFieldValuesUseCase with ownership validation
- BatchController endpoint: GET /fields/:fieldKey/values
- Pagination (limit/offset) and server-side search support

**Addresses:**
- Features: Side panel values (table stakes)
- Pitfall 3: Large value lists (pagination prevents memory overwhelm)

**Duration:** 4-6 hours

### Phase 3: Frontend View Toggle & Field Inventory Grid
**Rationale:** View toggle establishes shared cache strategy before implementing views. Field cards consume stats endpoint from Phase 1. Order prevents cache invalidation issues from Pitfall 4.

**Delivers:**
- ViewToggle component (table ⟷ inventory)
- View state in URL params (preserves on refresh)
- useFieldStats React Query hook
- FieldInventoryGrid container
- FieldCard component (memoized, type badge, presence stats)
- Integration with existing batch detail page

**Addresses:**
- Features: View toggle, field cards (table stakes)
- Pitfall 4: View toggle state (shared queryKey, URL params)
- Pitfall 9: Card grid re-renders (memoization)

**Uses:** shadcn/ui Card (existing), Badge (existing), React Query v5 (existing)

**Duration:** 6-8 hours

### Phase 4: Frontend ViewValuesSheet
**Rationale:** Side sheet builds on completed field cards (Phase 3) and field values endpoint (Phase 2). Non-modal configuration critical for data exploration UX.

**Delivers:**
- ViewValuesSheet component (shadcn Sheet with modal={false})
- useFieldValues React Query hook (enabled: false until opened)
- Search input with use-debounce (300ms)
- ScrollArea for value list
- Copy button with Clipboard API + fallback
- Empty states for zero-value fields

**Addresses:**
- Features: Value inspection, search, copy (table stakes)
- Pitfall 5: Side sheet blocks interaction (modal={false})
- Pitfall 6: Clipboard fails (fallback implementation)
- Pitfall 8: Search input lags (debouncing)

**Uses:** shadcn/ui Sheet (existing), ScrollArea (NEW), use-debounce (NEW)

**Duration:** 6-8 hours

### Phase 5: Polish & Edge Cases
**Rationale:** UX refinements after core functionality validated. These improve experience but aren't blockers for usability testing.

**Delivers:**
- Loading states (skeleton loaders for cards, spinner for values)
- Error handling (toast notifications, retry buttons)
- Null value rendering ("(empty)" with muted styling)
- Escape key to close sheet
- Sort/filter controls for card grid
- Example values preview on cards

**Addresses:** Pitfall 11 (null rendering), Pitfall 12 (keyboard shortcuts), Pitfall 13 (empty states)

**Duration:** 4-6 hours

### Phase Ordering Rationale

- **Backend before frontend** (Phases 1-2 before 3-4): API must be testable via HTTP before UI consumes it. Prevents blocked frontend work.
- **Stats before values** (Phase 1 before 2): Field cards display stats summary, don't need individual values. Logical dependency.
- **View toggle before implementations** (Phase 3 before 4): Establishes cache strategy, prevents refactoring when adding sheet.
- **Core before polish** (Phases 1-4 before 5): Polish requires working system to test against. Loading states can't be verified without real queries.
- **Architecture decisions upfront** (Phase 0): Field name sanitization impacts JSONB query patterns in all backend phases. Must decide before implementation.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 0:** Field name sanitization — needs codebase analysis of existing `columnMetadata` structure. Research showed Excel allows most special chars, PostgreSQL JSONB has restrictions. Decision point: sanitize vs mapping.

**Phases with standard patterns (skip research-phase):**
- **Phase 1-2:** Backend JSONB queries — PostgreSQL operators well-documented, Drizzle `sql` template pattern verified in codebase.
- **Phase 3-4:** Frontend React Query — existing patterns in codebase (useBatch, useBatchRows), extend same approach.
- **Phase 5:** Polish — standard shadcn/ui patterns, no novel integrations.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | use-debounce v10.1.0 verified (published Jan 2026), shadcn ScrollArea official docs confirmed, Clipboard API MDN-documented. Custom type inference only MEDIUM (no library found, but pattern is standard). |
| **Features** | HIGH | Field cards, side panels, search patterns universal across Tableau Prep, Trifacta, ydata-profiling. Table stakes well-established. Differentiators align with Populatte's form-mapping mission (not generic data profiling). |
| **Architecture** | HIGH | Extends existing Clean Architecture patterns (RowRepository extension, Use Case ownership validation). JSONB queries verified with Drizzle `sql` template + community sources. GIN index recommendation is PostgreSQL best practice. |
| **Pitfalls** | HIGH | JSONB performance issues well-documented (GIN indexes, N+1 patterns). Mixed-type handling confirmed via `jsonb_typeof()`. Large list rendering solved by react-window (established pattern). Clipboard API security requirements MDN-verified. |

**Overall confidence:** HIGH

### Gaps to Address

- **Type inference heuristics:** Sample-based inference (5 values) may misclassify edge cases (ZIP codes as numbers, formatted dates as strings). Needs validation with real Populatte data during implementation. Recommendation: Start with basic patterns (email regex, ISO dates), extend based on user feedback.

- **Field name sanitization strategy:** Research confirmed special characters break JSONB queries but didn't find existing `columnMetadata` structure in codebase (not included in research scope). Phase 0 must analyze current Excel parsing to determine if sanitization already exists or needs implementation. Decision impacts all backend query patterns.

- **GIN index performance benchmarks:** No benchmark data for JSONB aggregation on Populatte's specific schema (10K rows × 20-50 fields). Research shows GIN helps JSONB lookups but `jsonb_object_keys()` still requires table scan. Recommendation: Add index in Phase 0, measure query time in Phase 1, optimize if exceeds 5 seconds.

- **Value cardinality distribution:** Unknown if Populatte batches have high-cardinality fields (>1000 distinct values). Research assumes most fields <100 unique values (typical for form data: names, dates, statuses). Recommendation: Implement pagination in Phase 2, defer virtualization to v2.4 unless testing reveals need.

## Sources

### Primary (HIGH confidence)

**Stack research:**
- [use-debounce v10.1.0 on npm](https://www.npmjs.com/package/use-debounce) — Latest version verification, React 19 compatibility
- [shadcn/ui ScrollArea Component](https://ui.shadcn.com/docs/components/scroll-area) — Installation command, API documentation
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) — Browser support, security requirements, async patterns
- [PostgreSQL JSONB Operators](https://www.postgresql.org/docs/current/functions-json.html) — Official docs for ->>, ->, ?, jsonb_object_keys()

**Features research:**
- [Tableau Prep: Examine Your Data](https://help.tableau.com/current/prep/en-us/prep_explore.htm) — Field profiling patterns
- [ydata-profiling GitHub](https://github.com/ydataai/ydata-profiling) — Data profiling UI patterns
- [Trifacta: Visual Profiling Overview](https://help.alteryx.com/aac/en/trifacta-classic/concepts/feature-overviews/overview-of-visual-profiling.html) — Card-based field exploration

**Architecture research:**
- [PostgreSQL JSONB Performance](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage) — GIN index recommendations
- [Drizzle ORM JSONB queries](https://www.answeroverflow.com/m/1188144616541802506) — Community sql template pattern
- [Clean Architecture Use Cases](https://www.milanjovanovic.tech/blog/building-your-first-use-case-with-clean-architecture) — Ownership validation patterns

**Pitfalls research:**
- [PostgreSQL JSONB and Statistics](https://blog.anayrat.info/en/2017/11/26/postgresql-jsonb-and-statistics/) — Table scan issues without indexes
- [React Virtualized Performance](https://medium.com/@ignatovich.dm/virtualization-in-react-improving-performance-for-large-lists-3df0800022ef) — Large list rendering patterns
- [Clipboard API Security](https://web.dev/articles/async-clipboard) — HTTPS requirements, user activation

### Secondary (MEDIUM confidence)

- [Type inference research](https://www.devoreur2code.com/blog/type-inference-with-typescript) — Negative result: no JavaScript library for runtime schema detection
- [shadcn Sheet modal behavior](https://medium.com/@enayetflweb/exploring-drawer-and-sheet-components-in-shadcn-ui-cf2332e91c40) — Non-modal sheet configuration
- [React Query cache strategy](https://www.developerway.com/posts/react-state-management-2025) — View toggle state management

### Tertiary (LOW confidence)

- [Excel column naming limits](https://www.excelforum.com/excel-general/568288-named-ranges-what-characters-are-or-are-not-allowed-in-the-nam.html) — Special character handling (forum discussion, needs verification with real data)

---
*Research completed: 2026-01-30*
*Ready for roadmap: yes*
