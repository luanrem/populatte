# Project Research Summary

**Project:** Populatte v2.0 Data Ingestion Engine
**Domain:** Excel file parsing, normalization, and batch storage for B2B form-filling SaaS
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

The v2.0 Data Ingestion Engine adds Excel file upload, parsing, and normalized storage to Populatte's existing NestJS Clean Architecture backend. Experts building this type of system converge on a well-established stack: SheetJS for Excel parsing, Multer (bundled with NestJS) for file uploads, PostgreSQL JSONB for flexible document storage, and the Strategy Pattern for handling multiple ingestion modes. All four research dimensions agree on the core approach, and no conflicts emerged between researchers. The existing codebase (NestJS 11, Drizzle ORM 0.45.1, Zod v4, PostgreSQL) requires zero changes -- only additive dependencies.

The recommended approach is a Strategy Pattern-based system where `ListModeStrategy` (1 file with headers producing N rows) and `ProfileModeStrategy` (N files with cell-address keys producing N rows) share a common `IngestionStrategy` interface in the Core layer, with concrete implementations in Infrastructure. Transaction management uses `@nestjs-cls/transactional` with automatic propagation via `TransactionHost`, eliminating manual transaction parameter passing. The architecture maps cleanly onto 7 sequential build phases driven by dependency order: Core entities/interfaces first, then database schema, then transaction support, then strategies, then the ingestion service, then the use case, and finally the controller.

The dominant risk is security, not complexity. Three of the seven critical pitfalls are security-related: SheetJS npm registry installs a vulnerable 4-year-old version (Prototype Pollution), Multer MIME validation is trivially bypassable, and XLSX files are ZIP archives susceptible to ZIP bombs. The mitigation path is clear for all three -- CDN installation, magic-byte validation, and file-size limits -- but these must be implemented from the start, not retrofitted. The secondary risk is memory: `memoryStorage()` with 50 files at 5MB each can consume 250MB per request. Concurrency limiting and sequential buffer processing are essential.

## Key Findings

### Recommended Stack

The existing stack needs only three additive dependencies. No migrations, no replacements, no version bumps.

**Core technologies:**
- **xlsx (SheetJS) 0.20.3+ from CDN** -- Excel parsing (.xlsx/.csv). MUST install from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, never from npm registry (npm version is 0.18.5 with CVE-2023-30533 Prototype Pollution). Types are bundled; do NOT install `@types/xlsx`.
- **Multer 2.0.1+** (bundled with `@nestjs/platform-express@11.0.1`) -- File upload handling. Already installed; verify version is 2.0.1+ to avoid CVE-2025-47944 (DoS). Use `memoryStorage()` since files are parsed immediately, not stored.
- **@nestjs-cls/transactional + nestjs-cls + Drizzle adapter** -- Automatic transaction propagation via `@Transactional()` decorator and `TransactionHost`. Eliminates manual transaction parameter passing. New dependency, well-documented.

**Supporting:**
- **@types/multer 2.0.0** -- TypeScript definitions for `Express.Multer.File`.
- **nestjs-zod** (optional) -- Bridges Zod v4 schemas to NestJS DTOs via `createZodDto()`.

**What NOT to use:**
- `npm install xlsx` -- installs vulnerable 0.18.5 from npm registry
- `@types/xlsx` -- types already bundled in CDN package
- `class-validator` decorators for file validation -- use Zod v4 schemas instead
- `.readFile()` from SheetJS -- use `.read(buffer)` with memoryStorage

### Expected Features

**Must have (v2.0 table stakes):**
- File upload with type/size validation (5MB/file, 50 files/request)
- .xlsx and .csv format support
- Real-time validation feedback (per-row errors with cell references)
- Atomic batch operations (all rows inserted or none via transaction)
- JSONB storage with source traceability (fileName, rowIndex, sheetName)
- Basic error reporting (which rows failed, why)
- Progress indicators (upload progress bar, processing spinner)

**Should have (v2.0 differentiators):**
- Strategy Pattern support (ListMode + ProfileMode) -- most competitors only support row-based imports
- Source traceability in JSONB -- every data point tracks its origin file/row/cell
- Multi-file batch upload (up to 50 files for ProfileMode)

**Defer (v2.x):**
- Error export as downloadable file
- Data preview table UI before commit
- Upload history/audit trail
- Duplicate detection

**Defer (v3+):**
- Smart column mapping suggestions (AI/heuristic)
- Incremental upload support (append vs replace)
- Schema versioning

**Anti-features (avoid):**
- Automatic data transformation/cleaning -- creates unpredictable behavior
- .xls legacy support -- binary format with security issues
- Unlimited file sizes -- kills server performance
- Real-time collaborative editing of uploaded data -- scope creep into spreadsheet app
- Formula/macro execution -- security risk, parsing complexity

### Architecture Approach

The architecture follows NestJS Clean Architecture with a feature module pattern. The `IngestionStrategy` interface lives in Core (domain abstraction), while concrete strategies (`ListModeStrategy`, `ProfileModeStrategy`), the `IngestionService` (strategy context), and the `IngestionModule` (feature module) live in Infrastructure. Transaction boundaries wrap the use case via `@Transactional()`, and repositories participate automatically via `TransactionHost<DrizzleClient>`.

**Major components:**
1. **BatchesController** (Presentation) -- HTTP multipart upload, Zod DTO validation, delegates to use case
2. **CreateBatchUseCase** (Core) -- Orchestrates ingestion, wraps in `@Transactional()` for atomicity, verifies project ownership
3. **IngestionStrategy** (Core interface) -- Contract with `parseFiles()` and `validateInput()` methods
4. **IngestionService** (Infrastructure) -- Strategy context; selects strategy by mode, coordinates parsing + persistence
5. **ListModeStrategy / ProfileModeStrategy** (Infrastructure) -- Concrete parsers using SheetJS
6. **BatchRepository / RowRepository** (Core interface, Infrastructure implementation) -- CRUD with `TransactionHost`
7. **IngestionModule** (Infrastructure) -- Feature module providing strategies and service

**Key architectural decisions:**
- Strategy interface in Core, implementations in Infrastructure (Dependency Inversion)
- IngestionService as strategy context in Infrastructure (coordinates infrastructure-level strategies)
- `@Transactional()` on use case, NOT on repositories (business operation scope)
- Strategies return `ParsedRow[]` only -- persistence handled by IngestionService (Single Responsibility)
- Repositories registered in global `DrizzleModule`, consistent with existing pattern

### Critical Pitfalls

Research identified 19 pitfalls (7 critical, 7 moderate, 5 minor). All four researchers agree on the same top risks. Here are the top 5 that must be addressed before writing any code:

1. **SheetJS from npm = vulnerable** -- `npm install xlsx` gets 0.18.5 with Prototype Pollution. Install from CDN: `pnpm add xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Verify with `pnpm list xlsx`.
2. **Memory exhaustion from concurrent uploads** -- 50 files x 5MB x N concurrent requests. Use concurrency limiting (semaphore), process files sequentially within a request, null buffer references after parsing. Calculate `--max-old-space-size` for worst case.
3. **Multer MIME validation is security theater** -- `file.mimetype` comes from client headers, trivially spoofed. Validate ZIP magic bytes (`0x504B0304`) on the buffer AFTER upload, BEFORE parsing.
4. **PostgreSQL 65,534 parameter limit on batch insert** -- With ~10 columns, max ~6,553 rows per INSERT. Chunk inserts within the transaction at 5,000 rows per statement.
5. **Excel dates parsed as serial numbers** -- Without `cellDates: true`, dates become meaningless integers (45658 instead of 2025-01-29). Always pass `{ cellDates: true, cellNF: true }` to `XLSX.read()`.

**Additional critical-to-moderate pitfalls to handle during implementation:**
- ZIP bombs via malicious XLSX (mitigated by 5MB limit, but consider worker thread isolation)
- pnpm lockfile corruption with CDN tarball URLs (test `--frozen-lockfile` in CI immediately)
- JSONB null vs undefined semantic mismatch (normalize all `undefined` to `null` before storage)
- Strategy DI token overwrite (use distinct tokens per strategy, not a shared token)
- Merged cells cause silent data loss (check `!merges` and propagate or document limitation)
- Zod v4 breaking changes (`error.issues` not `error.errors`, top-level `z.uuid()`)

## Implications for Roadmap

Based on combined research, the architecture document prescribes a clear 7-phase build order driven by dependency chains. Each phase enables the next and maps to specific features and pitfall mitigations.

### Phase 1: Core Entities and Interfaces

**Rationale:** Everything depends on domain abstractions. Zero external dependencies makes this the natural starting point. This is pure TypeScript with no library integration.
**Delivers:** `Batch` entity, `Row` entity, `BatchRepository` abstract class, `RowRepository` abstract class, `IngestionStrategy` interface, `ParsedRow` type
**Addresses:** Architecture foundation for all subsequent phases
**Avoids:** N/A (no external dependencies, no pitfall exposure)
**Research flag:** Standard patterns -- skip phase research. Clean Architecture entity/repository patterns are well-documented in the existing codebase.

### Phase 2: Database Schema and Repositories

**Rationale:** Repositories implement Core interfaces from Phase 1. Database schema must exist before any data can be persisted. This phase introduces the JSONB column design.
**Delivers:** Drizzle schemas for `batches` and `rows` tables, `DrizzleBatchRepository`, `DrizzleRowRepository`, database migration, updated `DrizzleModule`
**Addresses:** JSONB storage with source traceability (FEATURES), batch metadata with column list (Pitfall 19)
**Avoids:** Pitfall 5 (parameter limit) -- implement chunked inserts in `createMany()`. Pitfall 11 (null vs undefined) -- normalize in repository mapper. Pitfall 16 (returning() overhead) -- omit `.returning()` on bulk row inserts.
**Research flag:** Standard patterns -- existing repository pattern in codebase provides template.

### Phase 3: Transaction Support

**Rationale:** Must be in place before the use case layer. Requires Phase 2 (DrizzleModule) for the transactional adapter configuration. This is the most complex infrastructure setup phase.
**Delivers:** `nestjs-cls` + `@nestjs-cls/transactional` + Drizzle adapter installed and configured, `ClsModule` in `AppModule`, existing repositories migrated to `TransactionHost`, `@Transactional()` decorator operational
**Addresses:** Atomic batch operations (FEATURES table stakes), rollback capability (FEATURES)
**Avoids:** Pitfall 10 (race conditions) -- use `read committed` + unique constraints, not `serializable`. Pitfall anti-pattern of manual transaction parameter passing.
**Research flag:** NEEDS RESEARCH -- `@nestjs-cls/transactional` with Drizzle adapter is newer tooling. The architecture doc provides configuration examples, but integration with the existing `DrizzleService` provider token needs validation during implementation.

### Phase 4: SheetJS Installation and Excel Parsing Strategies

**Rationale:** Strategies depend on Phase 1 (interface) but not on Phases 2-3 (database). However, grouping after Phase 3 means strategies can be integration-tested end-to-end. This phase carries the highest pitfall density (9 of 19 pitfalls).
**Delivers:** SheetJS installed from CDN, `ListModeStrategy`, `ProfileModeStrategy`, type-safe cell access helpers, date normalization, magic-byte validation utility, unit tests for both strategies
**Addresses:** Strategy Pattern (FEATURES differentiator), .xlsx/.csv support (FEATURES table stakes)
**Avoids:** Pitfall 1 (npm registry vulnerability), Pitfall 2 (pnpm lockfile corruption), Pitfall 6 (dates as numbers), Pitfall 7 (ZIP bombs), Pitfall 8 (merged cells), Pitfall 9 (formula cached values), Pitfall 13 (TypeScript strict mode), Pitfall 14 (empty sheets), Pitfall 18 (ESM/CJS confusion)
**Research flag:** NEEDS RESEARCH -- SheetJS CDN installation with pnpm lockfile behavior should be validated early. Date handling across Windows/Mac Excel epochs needs testing with real files.

### Phase 5: Ingestion Service and Module

**Rationale:** Depends on Phase 2 (repositories) and Phase 4 (strategies). The service is the Strategy context that wires parsing to persistence.
**Delivers:** `IngestionService` with `selectStrategy()` and `execute()`, `IngestionModule` with strategy providers, integration tests
**Addresses:** Strategy Pattern orchestration, multi-file batch upload coordination
**Avoids:** Pitfall 12 (DI token overwrite) -- use distinct class injection (not string tokens) or a strategy registry. Pitfall anti-pattern of strategies depending on repositories.
**Research flag:** Standard patterns -- Strategy context is a straightforward NestJS service.

### Phase 6: Use Case

**Rationale:** Depends on Phase 3 (transactions) and Phase 5 (IngestionService). The use case is the business logic orchestrator.
**Delivers:** `CreateBatchUseCase` with `@Transactional()`, project ownership validation, integration tests with real transactions
**Addresses:** Atomic batch operations (end-to-end), project authorization
**Avoids:** Anti-pattern of transaction boundaries in repositories.
**Research flag:** Standard patterns -- follows existing `CreateProjectUseCase` pattern.

### Phase 7: Presentation Layer (Controller + Upload UX)

**Rationale:** Last phase because it depends on everything. Controller is the thinnest layer.
**Delivers:** `BatchesController` with `FilesInterceptor`, `CreateBatchDto` with Zod v4 schema, `ZodValidationPipe` for file metadata, file size/type validation middleware, client-side upload validation in web dashboard
**Addresses:** File upload with validation (FEATURES), real-time validation feedback, progress indicators, error reporting
**Avoids:** Pitfall 3 (MIME bypass) -- magic-byte validation before parsing. Pitfall 4 (memory exhaustion) -- concurrency limiting, sequential processing. Pitfall 15 (full upload before rejection) -- client-side size check. Pitfall 17 (Zod v4 breaking changes) -- use v4 API exclusively.
**Research flag:** NEEDS RESEARCH for the web dashboard upload UX (progress indicators, error display, multi-file selection). The API side is standard NestJS patterns.

### Phase Ordering Rationale

- **Phases 1-3 form the infrastructure foundation.** They must be sequential because each depends on the previous: entities define interfaces, schemas implement them, transactions wrap them.
- **Phase 4 (strategies) is the highest-risk phase** with 9 of 19 pitfalls. Placing it after the infrastructure foundation means failures can be caught before integration.
- **Phases 5-6 are integration phases** that wire strategies to persistence within transactions. They are straightforward once the foundation exists.
- **Phase 7 is deferred to last** because the controller is the thinnest layer and can be built quickly once the backend is solid. This also allows parallel development of the web dashboard upload UI.
- **This order avoids the common mistake of building the controller first** and discovering transaction/parsing issues late.

### Research Flags Summary

**Phases needing deeper research during planning:**
- **Phase 3 (Transaction Support):** `@nestjs-cls/transactional` Drizzle adapter integration with existing `DrizzleService` provider token. Configuration specifics need validation.
- **Phase 4 (Excel Parsing):** SheetJS CDN + pnpm lockfile stability. Date handling across Excel epochs. Merged cell strategy decision.
- **Phase 7 (Upload UX):** Web dashboard multi-file upload component, progress tracking, error display patterns.

**Phases with standard patterns (skip phase research):**
- **Phase 1 (Core Entities):** Follows existing entity/repository pattern in codebase.
- **Phase 2 (Database Schema):** Follows existing Drizzle schema pattern.
- **Phase 5 (Ingestion Service):** Standard NestJS service with DI.
- **Phase 6 (Use Case):** Follows existing `CreateProjectUseCase` pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs. SheetJS CDN installation, Multer 2.0.1+ CVE fixes, Drizzle JSONB/transactions all documented. No novel or experimental dependencies. |
| Features | HIGH | Feature landscape informed by competitor analysis (Flatfile, CSVBox) and B2B SaaS best practices. Table stakes are well-established in the domain. Differentiators are unique to Populatte's form-filling context. |
| Architecture | HIGH | Clean Architecture patterns verified against NestJS official docs and `@nestjs-cls/transactional` documentation. Strategy Pattern placement justified by Dependency Inversion Principle. Existing codebase provides template for all component patterns. |
| Pitfalls | HIGH | 19 pitfalls identified with HIGH confidence on 15 of them. All critical pitfalls verified against official documentation or CVE databases. Prevention strategies are concrete and actionable. |

**Overall confidence:** HIGH

### Gaps to Address

- **pnpm lockfile behavior with CDN tarballs:** Pitfall 2 identified a known pnpm bug (#7368) that may or may not be fixed in the project's pnpm version. Must be validated empirically by running `pnpm install --frozen-lockfile` in a clean environment after adding SheetJS. Consider vendoring the tarball as fallback.
- **`@nestjs-cls/transactional` Drizzle adapter token resolution:** The architecture doc shows `drizzleInstanceToken: DrizzleService` but the actual token used by the existing `DrizzleService` provider needs verification. Mismatch here would cause silent transaction non-propagation.
- **SheetJS ESM vs CJS resolution in NestJS:** The project uses `moduleResolution: "nodenext"` which may resolve to SheetJS's ESM entry point. The `import * as XLSX from 'xlsx'` pattern should be tested to confirm it resolves correctly at both compile time and runtime.
- **Multi-file memory profiling:** The 250MB worst-case calculation (50 files x 5MB) is theoretical. Actual memory behavior depends on V8 garbage collection timing and buffer allocation patterns. Should be validated with a load test before production deployment.
- **Merged cell handling decision:** Research identified the pitfall and two mitigation paths (propagate values vs document limitation). The product decision on which path to take has not been made. This should be decided during Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- [SheetJS Official Documentation](https://docs.sheetjs.com/) -- Installation, cell objects, merges, formulae, NestJS integration
- [SheetJS CDN](https://cdn.sheetjs.com/xlsx/) -- Authoritative distribution source
- [NestJS Official Docs](https://docs.nestjs.com/) -- File upload, custom providers, modules
- [@nestjs-cls/transactional](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional) -- Transaction management with CLS
- [Drizzle ORM Official Docs](https://orm.drizzle.team/) -- Transactions, batch API, insert, JSONB columns
- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/) -- JSONB types, transaction isolation
- [Zod v4 Changelog](https://zod.dev/v4/changelog) -- Breaking changes
- [Multer npm](https://www.npmjs.com/package/multer) -- memoryStorage, limits, API

### Secondary (MEDIUM confidence)
- [CVE-2025-47944](https://github.com/nestjs/nest/issues/15171), [CVE-2025-48997](https://github.com/nestjs/nest/issues/15236), [CVE-2025-7338](https://zeropath.com/blog/cve-2025-7338-multer-dos-vulnerability) -- Multer security advisories
- [CVE-2023-30533](https://security.snyk.io/vuln/SNYK-JS-XLSX-5457926) -- SheetJS npm Prototype Pollution
- [pnpm issue #7368](https://github.com/pnpm/pnpm/issues/7368) -- CDN tarball lockfile bug
- [Drizzle MAX_PARAMETERS_EXCEEDED](https://www.answeroverflow.com/m/1148695514821435443) -- PostgreSQL parameter limit
- [Multer File Type Validation](https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l) -- MIME bypass analysis
- [Flatfile](https://flatfile.com/), [CSVBox](https://csvbox.io/) -- Competitor feature analysis

### Tertiary (LOW confidence)
- [NestJS Strategy Pattern Discussion #5573](https://github.com/nestjs/nest/issues/5573) -- Community implementation patterns
- [Multer Memory Trap Analysis](https://medium.com/@codewithmunyao/the-multer-memory-trap-why-your-file-upload-strategy-is-killing-your-server-89f9e8797e58) -- Memory pressure analysis
- Performance benchmarks (batch insert speedup, parse times) -- Estimates from community reports, not lab-tested

---
*Research completed: 2026-01-29*
*Ready for roadmap: yes*
