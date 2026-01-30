# Roadmap: Populatte v2.0 Data Ingestion Engine

## Milestones

- v1.0 End-to-End Auth & User Sync (shipped 2026-01-28)
- v2.0 Data Ingestion Engine (in progress)

## Overview

This milestone adds a robust Excel file ingestion pipeline to the existing NestJS backend. The journey starts by establishing domain abstractions and database schema (foundation), then introduces transaction support and SheetJS-powered parsing strategies (the core ingestion engine), then wires the orchestration layer and use case (business logic), and finally exposes everything through a validated HTTP endpoint (presentation layer). By completion, the API accepts multipart file uploads, parses Excel data through strategy-selected parsers, and atomically persists normalized JSONB rows with full source traceability. No frontend changes -- backend only.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions if needed

- [x] **Phase 1: Domain Foundation and Database Schema** - Core entities, repository interfaces, Drizzle schema, and repository implementations
- [x] **Phase 2: Transaction Support and Excel Parsing Strategies** - CLS-based transaction infrastructure and SheetJS-powered ListMode/ProfileMode strategies
- [x] **Phase 3: Ingestion Service** - Strategy selection and parse-then-persist orchestration
- [x] **Phase 4: Ingestion Module** - NestJS module wiring for strategies and ingestion service
- [x] **Phase 5: CreateBatch Use Case** - Transactional use case with project ownership validation
- [x] **Phase 6: Transaction Rollback Test** - Integration test proving atomic rollback behavior
- [x] **Phase 7: Batch Endpoint** - Controller with Multer file upload and ClerkAuthGuard
- [x] **Phase 8: Upload Size Limits** - Multer size/count enforcement with early rejection
- [ ] **Phase 9: File Content Validation** - Magic-byte inspection for Excel file verification
- [ ] **Phase 10: Batch DTO Validation** - Zod v4 schema for mode field and controller delegation

## Phase Details

### Phase 1: Domain Foundation and Database Schema

**Goal**: Domain abstractions and persistent storage exist for batches and rows, following established Clean Architecture patterns
**Depends on**: Nothing (first phase)
**Requirements**: REQ-06, REQ-07, REQ-10
**Research flag**: Standard patterns -- skip phase research. Follows existing entity/repository/schema patterns in the v1.0 codebase.

**Success Criteria** (what must be TRUE):
  1. `Batch` and `Row` domain entities exist in the Core layer with all required fields (id, projectId, userId, mode, fileCount, rowCount for batch; batchId, data as JSONB, sourceFileName for row)
  2. `BatchRepository` and `RowRepository` abstract classes define the persistence contract in Core, including a `createMany()` method on RowRepository that chunks inserts to stay under the PostgreSQL 65,534 parameter limit
  3. Drizzle schemas for `batches` and `rows` tables exist with proper foreign key relationships (rows -> batches -> projects), and a database migration runs successfully
  4. `DrizzleBatchRepository` and `DrizzleRowRepository` implement the abstract classes and are registered in `DrizzleModule`, consistent with the existing provider pattern

**Pitfall mitigations**:
- Pitfall 5 (parameter limit): `createMany()` must chunk inserts at ~5,000 rows per INSERT statement
- Pitfall 11 (null vs undefined): Repository mappers normalize all `undefined` to `null` before JSONB storage
- Pitfall 16 (returning overhead): Omit `.returning()` on bulk row inserts
- Pitfall 19 (inconsistent JSONB schemas): Store column list as metadata on the `batches` table

**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Core layer entities (Batch, Row) and abstract repository contracts
- [x] 01-02-PLAN.md — Drizzle schemas, mappers, repository implementations, DrizzleModule registration, migration

---

### Phase 2: Transaction Support and Excel Parsing Strategies

**Goal**: Atomic transaction infrastructure is operational and both Excel parsing strategies correctly transform files into normalized ParsedRow arrays
**Depends on**: Phase 1
**Requirements**: REQ-02, REQ-03, REQ-05, REQ-09
**Research flag**: NEEDS RESEARCH -- `@nestjs-cls/transactional` Drizzle adapter integration with existing `DrizzleService` provider token needs validation. SheetJS CDN installation + pnpm lockfile stability and date handling across Excel epochs need testing.

**Success Criteria** (what must be TRUE):
  1. `@nestjs-cls/transactional` is installed and configured with the Drizzle adapter; the `@Transactional()` decorator wraps repository operations in a real database transaction that rolls back on any thrown error
  2. `ListModeStrategy` parses a single Excel file buffer into N `ParsedRow` objects where each row's `data` field uses the first-row headers as keys, and rejects input when more than 1 file is provided
  3. `ProfileModeStrategy` parses N Excel file buffers into N `ParsedRow` objects where each row's `data` field uses cell-address keys (e.g., "A1", "B2"), and accepts 1 to N files
  4. Both strategies set `sourceFileName` on every parsed row, handle `cellDates: true` for date normalization, and normalize `undefined` values to `null`
  5. SheetJS is installed from CDN (not npm registry) and `pnpm install --frozen-lockfile` succeeds cleanly

**Pitfall mitigations**:
- Pitfall 1 (npm vulnerability): Install SheetJS exclusively from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- Pitfall 2 (pnpm lockfile): Test `--frozen-lockfile` in clean environment immediately after adding SheetJS
- Pitfall 6 (dates as numbers): Always pass `{ cellDates: true, cellNF: true }` to `XLSX.read()`
- Pitfall 7 (ZIP bombs): 5MB upload limit constrains decompression ratio; consider parse timeout
- Pitfall 8 (merged cells): Document limitation (top-left cell value only) for MVP; defer propagation
- Pitfall 9 (formula cached values): Use cached `.v` values; document limitation for users
- Pitfall 10 (race conditions): Use `read committed` isolation + unique constraints, not `serializable`
- Pitfall 12 (DI token overwrite): Use distinct class injection for each strategy, not shared string tokens
- Pitfall 13 (TypeScript strict mode): Create type-safe cell access helpers for SheetJS
- Pitfall 14 (empty sheets): Validate parsed row count > 0 before returning
- Pitfall 18 (ESM/CJS): Use `import * as XLSX from 'xlsx'`, only use `.read(buffer)` never `.readFile()`

**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Transaction infrastructure (CLS + Drizzle adapter), SheetJS CDN install, shared Excel types/helpers/strategy interface
- [x] 02-02-PLAN.md — ListModeStrategy, ProfileModeStrategy implementations, ExcelModule registration

---

### Phase 3: Ingestion Service

**Goal**: `IngestionService` selects the correct parsing strategy based on mode and coordinates the parse-then-persist flow without any `if/else` parsing logic
**Depends on**: Phase 2
**Requirements**: REQ-04
**Research flag**: Standard patterns -- follows existing service patterns in the codebase.

**Success Criteria** (what must be TRUE):
  1. `IngestionService` selects the correct strategy based on a mode parameter (`list_mode` or `profile_mode`) and coordinates parsing followed by persistence, without any `if/else` parsing logic in the service itself

**Pitfall mitigations**:
- Pitfall 12 (DI token overwrite): Verify both strategies are independently injectable
- Anti-pattern avoidance: Strategies return `ParsedRow[]` only -- persistence handled by `IngestionService`, not strategies

**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md — IngestionService with strategy selection and parse-persist orchestration

---

### Phase 4: Ingestion Module

**Goal**: `IngestionModule` wires strategies and ingestion service for NestJS dependency injection
**Depends on**: Phase 3
**Requirements**: REQ-04
**Research flag**: Standard patterns -- follows existing module patterns in the codebase.

**Success Criteria** (what must be TRUE):
  1. `IngestionModule` provides both strategies and the ingestion service, exports `IngestionService` for use case injection

**Pitfall mitigations**:
- Pitfall 12 (DI token overwrite): Use Symbol-based tokens for strategy injection (consistent with ExcelModule)

**Plans**: 1 plan

Plans:
- [x] 04-01-PLAN.md — IngestionModule setup with ExcelModule import and service export

---

### Phase 5: CreateBatch Use Case

**Goal**: Transactional use case validates project ownership, orchestrates ingestion, and guarantees atomic commit/rollback of batch + rows
**Depends on**: Phase 4
**Requirements**: REQ-05
**Research flag**: Standard patterns -- follows existing use case patterns with @Transactional() from Phase 2.

**Success Criteria** (what must be TRUE):
  1. `CreateBatchUseCase` validates project ownership, calls `IngestionService`, and the entire operation (batch insert + all row inserts) either fully commits or fully rolls back via `@Transactional()`

**Pitfall mitigations**:
- Transaction boundary: Ensure `@Transactional()` wraps the full execute() method so batch and row inserts share the same transaction

**Plans**: 1 plan

Plans:
- [x] 05-01-PLAN.md — CreateBatchUseCase with ownership validation and transactional orchestration

---

### Phase 6: Transaction Rollback Test

**Goal**: Integration test proves that a failed row insert rolls back the batch insert, preventing orphaned batches
**Depends on**: Phase 5
**Requirements**: REQ-05
**Research flag**: Standard patterns -- NestJS testing module with database setup.

**Success Criteria** (what must be TRUE):
  1. An integration test demonstrates that a failed row insert rolls back the batch insert (no orphaned batches)

**Pitfall mitigations**:
- Test isolation: Each test should use a clean transaction that rolls back after assertion

**Plans**: 1 plan

Plans:
- [x] 06-01-PLAN.md — Integration test with happy-path and rollback-path scenarios for CreateBatchUseCase

---

### Phase 7: Batch Endpoint

**Goal**: HTTP endpoint accepts multipart file uploads with authentication, delegating to the use case
**Depends on**: Phase 5
**Requirements**: REQ-01
**Research flag**: Standard patterns -- NestJS controller with Multer interceptor is well-documented.

**Success Criteria** (what must be TRUE):
  1. `POST /projects/:projectId/batches` accepts `multipart/form-data` with a `mode` field and `files` array, protected by `ClerkAuthGuard`, and returns `{ batchId, rowCount }` on success

**Pitfall mitigations**:
- Controller should delegate entirely to use case -- no parsing or persistence logic in controller

**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — BatchController with Multer interceptor, Zod DTO, BatchModule wiring, and AppModule import

---

### Phase 8: Upload Size Limits

**Goal**: Multer enforces file size and count limits at the interceptor level, rejecting oversized uploads before any parsing
**Depends on**: Phase 7
**Requirements**: REQ-08
**Research flag**: Standard patterns -- Multer limits configuration.

**Success Criteria** (what must be TRUE):
  1. Multer enforces max 5MB per file and max 50 files per request at the interceptor level; oversized files are rejected with a clear 413 error before any parsing occurs

**Pitfall mitigations**:
- Pitfall 4 (memory exhaustion): Set Multer `limits` defensively
- Pitfall 15 (full upload before rejection): Content-Length middleware for early rejection of oversized requests

**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Multer limits configuration and Content-Length middleware

---

### Phase 9: File Content Validation

**Goal**: Magic-byte inspection validates that uploaded files are genuine Excel/ZIP archives before SheetJS processes them
**Depends on**: Phase 7
**Requirements**: REQ-08
**Research flag**: Standard patterns -- buffer inspection for file type validation.

**Success Criteria** (what must be TRUE):
  1. File content is validated via magic-byte inspection (ZIP PK signature `0x504B0304`) after Multer processes the buffer but before SheetJS parses it; non-Excel files are rejected with a 400 error

**Pitfall mitigations**:
- Pitfall 3 (MIME bypass): Validate ZIP magic bytes on buffer, never trust `file.mimetype` alone

**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — Magic-byte validation pipe/guard for Excel file verification

---

### Phase 10: Batch DTO Validation

**Goal**: Zod v4 schema validates the mode field and the controller delegates to use case without containing business logic
**Depends on**: Phase 7
**Requirements**: REQ-01
**Research flag**: Standard patterns -- follows existing Zod DTO patterns in the codebase.

**Success Criteria** (what must be TRUE):
  1. `CreateBatchDto` uses a Zod v4 schema to validate the `mode` field, and the controller delegates to `CreateBatchUseCase` without containing any parsing or persistence logic

**Pitfall mitigations**:
- Pitfall 17 (Zod v4): Use v4 API exclusively (`error.issues`, top-level `z.uuid()`)

**Plans**: 1 plan

Plans:
- [ ] 10-01-PLAN.md — CreateBatchDto Zod schema and controller delegation wiring

---

## Requirement Coverage

| Requirement | Description | Phase |
|-------------|-------------|-------|
| REQ-01 | Batch creation with file upload (POST /projects/:projectId/batches) | Phase 7 + Phase 10 |
| REQ-02 | ListModeStrategy: Parse single Excel file into N rows with headers as keys | Phase 2 |
| REQ-03 | ProfileModeStrategy: Parse N Excel files into N rows with cell-address keys | Phase 2 |
| REQ-04 | Strategy selection via request body parameter | Phase 3 + Phase 4 |
| REQ-05 | Atomic batch insert with database transactions (full rollback on failure) | Phase 2 (infrastructure) + Phase 5 (wiring) + Phase 6 (test) |
| REQ-06 | JSONB normalized data storage in `rows` table | Phase 1 |
| REQ-07 | Source filename traceability on every row | Phase 1 |
| REQ-08 | File validation: max 5MB per file, max 50 files per request | Phase 8 + Phase 9 |
| REQ-09 | Input validation: list_mode rejects >1 file, profile_mode accepts 1..N | Phase 2 |
| REQ-10 | Drizzle schema for `batches` and `rows` tables with proper relationships | Phase 1 |

**Coverage: 10/10 requirements mapped. No orphans.**

## Progress

**Execution Order:** 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8/9/10 (8, 9, 10 are independent)

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Domain Foundation and Database Schema | 2/2 | Complete | 2026-01-29 |
| 2. Transaction Support and Excel Parsing Strategies | 2/2 | Complete | 2026-01-29 |
| 3. Ingestion Service | 1/1 | Complete | 2026-01-29 |
| 4. Ingestion Module | 1/1 | Complete | 2026-01-29 |
| 5. CreateBatch Use Case | 1/1 | Complete | 2026-01-29 |
| 6. Transaction Rollback Test | 1/1 | Complete | 2026-01-29 |
| 7. Batch Endpoint | 1/1 | Complete | 2026-01-29 |
| 8. Upload Size Limits | 1/1 | Complete | 2026-01-29 |
| 9. File Content Validation | 0/1 | Not started | - |
| 10. Batch DTO Validation | 0/1 | Not started | - |
