---
phase: 01-domain-foundation
plan: 02
subsystem: infrastructure-persistence
tags: [drizzle, schema, repository, migration, postgresql, jsonb, chunking]
requires: [01-01]
provides: [ingestion_batches schema, ingestion_rows schema, DrizzleBatchRepository, DrizzleRowRepository, BatchMapper, RowMapper, migration 0001]
affects: [02-01 (parsing service inserts via repositories), 03-01 (use cases depend on repository DI)]
tech-stack:
  added: []
  patterns: [pgEnum for domain enums, JSONB for flexible data, chunked bulk insert, provide/useClass DI, undefined-to-null normalization in mappers]
key-files:
  created:
    - apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts
    - apps/api/src/infrastructure/database/drizzle/schema/ingestion-rows.schema.ts
    - apps/api/src/infrastructure/database/drizzle/mappers/batch.mapper.ts
    - apps/api/src/infrastructure/database/drizzle/mappers/row.mapper.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts
    - apps/api/drizzle/0001_illegal_network.sql
  modified:
    - apps/api/src/infrastructure/database/drizzle/schema/index.ts
    - apps/api/src/infrastructure/database/drizzle/drizzle.module.ts
    - apps/api/drizzle/meta/_journal.json
key-decisions:
  - id: enum-values-match-domain
    decision: "pgEnum values use SCREAMING_SNAKE_CASE matching domain entity enum values (PENDING_REVIEW, LIST_MODE, VALID)"
    reason: "Ensures simple `as BatchStatus` cast in mapper works correctly at runtime, following same pattern as v1.0 where pgEnum values match entity values"
  - id: chunked-insert-5000
    decision: "createMany chunks at 5,000 rows per INSERT"
    reason: "PostgreSQL 65,534 parameter limit; 9 params per row = max ~7,281 rows; 5,000 provides safe margin"
  - id: no-returning-bulk
    decision: "createMany omits .returning() on bulk inserts"
    reason: "Pitfall 16: avoid overhead of returning large result sets on bulk operations"
duration: 3m 01s
completed: 2026-01-29
---

# Phase 01 Plan 02: Infrastructure Persistence Layer Summary

Drizzle schemas, mappers, and repository implementations for ingestion_batches and ingestion_rows with 5,000-row chunked bulk insert and JSONB normalization.

## Performance

| Metric         | Value                    |
| -------------- | ------------------------ |
| Duration       | 3m 01s                   |
| Started        | 2026-01-29T14:07:44Z     |
| Completed      | 2026-01-29T14:10:45Z     |
| Tasks          | 2/2                      |
| Files created  | 7                        |
| Files modified | 3                        |

## Accomplishments

1. **Drizzle schemas** for `ingestion_batches` (12 columns, 3 FKs, 2 indexes) and `ingestion_rows` (11 columns, 1 FK, 1 index) with pgEnums for batch_status, batch_mode, and row_status.

2. **Migration generated** (`0001_illegal_network.sql`) with CREATE TYPE, CREATE TABLE, ALTER TABLE (FK constraints), and CREATE INDEX statements.

3. **BatchMapper and RowMapper** convert DB rows to domain entities with enum casting (`as BatchStatus`, `as RowStatus`) and undefined-to-null normalization (Pitfall 11).

4. **DrizzleBatchRepository** implements create (with .returning()), findById, findByProjectId, and softDelete (with deletedBy audit trail). All read queries filter `isNull(deletedAt)`.

5. **DrizzleRowRepository** implements createMany with 5,000-row chunking (Pitfall 5) and no .returning() (Pitfall 16), plus findByBatchId with soft-delete filtering.

6. **DrizzleModule** updated with 4 repository providers (UserRepository, ProjectRepository, BatchRepository, RowRepository) and 5 exports (DrizzleService + 4 repositories), all globally available.

## Task Commits

| Task | Name                                             | Commit    | Key Files                                                    |
| ---- | ------------------------------------------------ | --------- | ------------------------------------------------------------ |
| 1    | Create Drizzle schemas for ingestion tables       | `3b7d5ac` | ingestion-batches.schema.ts, ingestion-rows.schema.ts, index.ts, 0001_illegal_network.sql |
| 2    | Create mappers, repositories, register in module  | `8bd3dad` | batch.mapper.ts, row.mapper.ts, drizzle-batch.repository.ts, drizzle-row.repository.ts, drizzle.module.ts |

## Files Created

| File | Purpose |
| ---- | ------- |
| `apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts` | ingestion_batches table with FK to projects/users, batch_status/batch_mode pgEnums, columnMetadata JSONB, deletedBy audit |
| `apps/api/src/infrastructure/database/drizzle/schema/ingestion-rows.schema.ts` | ingestion_rows table with FK to ingestion_batches, row_status pgEnum, data JSONB, source traceability fields |
| `apps/api/src/infrastructure/database/drizzle/mappers/batch.mapper.ts` | BatchMapper.toDomain with enum casting, JSONB casting, undefined-to-null normalization |
| `apps/api/src/infrastructure/database/drizzle/mappers/row.mapper.ts` | RowMapper.toDomain with enum casting, JSONB casting, undefined-to-null normalization |
| `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts` | DrizzleBatchRepository extending BatchRepository (create, findById, findByProjectId, softDelete) |
| `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` | DrizzleRowRepository extending RowRepository (createMany with chunking, findByBatchId) |
| `apps/api/drizzle/0001_illegal_network.sql` | Migration: 3 enums, 2 tables, 4 FK constraints, 3 indexes |

## Files Modified

| File | Change |
| ---- | ------ |
| `apps/api/src/infrastructure/database/drizzle/schema/index.ts` | Added exports for ingestion-batches and ingestion-rows schemas |
| `apps/api/src/infrastructure/database/drizzle/drizzle.module.ts` | Added BatchRepository/RowRepository providers and exports |
| `apps/api/drizzle/meta/_journal.json` | Updated by drizzle-kit generate |

## Decisions Made

| Decision | Rationale |
| -------- | --------- |
| pgEnum values use SCREAMING_SNAKE_CASE matching domain enums | Runtime safety: `row.status as BatchStatus` cast works because DB value matches enum value. Same pattern as v1.0 where pgEnum `'active'` matches `ProjectStatus.Active = 'active'` |
| createMany chunks at 5,000 rows | PostgreSQL 65,534 param limit with ~9 params/row = max ~7,281 rows. 5,000 provides margin |
| No .returning() on bulk inserts | Pitfall 16: avoid returning large result sets. createMany returns void |
| IngestionRowInsert type annotation on values array | Fix TypeScript strict mode error: status fallback `'VALID'` widened to `string` without explicit typing |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pgEnum values changed from lowercase to SCREAMING_SNAKE_CASE**
- **Found during:** Task 1
- **Issue:** Plan specified lowercase pgEnum values (`'pending_review'`, `'list_mode'`, `'valid'`) but Plan 01-01 created domain enums with SCREAMING_SNAKE_CASE values (`'PENDING_REVIEW'`, `'LIST_MODE'`, `'VALID'`). The mapper's `as BatchStatus` cast would silently produce incorrect values at runtime if DB stored lowercase but entity expected uppercase.
- **Fix:** Used SCREAMING_SNAKE_CASE values in pgEnums to match domain entity enum values, following the same pattern as v1.0 (where `projectStatusEnum('active')` matches `ProjectStatus.Active = 'active'`).
- **Files modified:** ingestion-batches.schema.ts, ingestion-rows.schema.ts
- **Commit:** 3b7d5ac

**2. [Rule 3 - Blocking] TypeScript type error on createMany values array**
- **Found during:** Task 2
- **Issue:** `row.status ?? 'VALID'` widened to `string` type, which was not assignable to the pgEnum's literal union type `'VALID' | 'WARNING' | 'ERROR'`. TypeScript strict mode rejected the insert.
- **Fix:** Added `IngestionRowInsert` type annotation on the values array and used `RowStatus.Valid` with cast to `IngestionRowInsert['status']` for proper typing.
- **Files modified:** drizzle-row.repository.ts
- **Commit:** 8bd3dad

## Issues Encountered

No blocking issues. Both deviations were auto-fixed during execution.

## Next Phase Readiness

**Phase 01 complete.** All domain foundation artifacts are in place:
- Core layer: entities (Batch, Row) + repository contracts (BatchRepository, RowRepository)
- Infrastructure layer: Drizzle schemas + mappers + repository implementations + migration

**Ready for Phase 02** (Parsing and Ingestion Logic):
- Repositories are DI-injectable via DrizzleModule
- CreateBatchData and CreateRowData types define the insert contract
- JSONB columns accept arbitrary data structures for parsed Excel content
- Chunked createMany handles bulk row insertion safely

**No blockers for Phase 02.**
