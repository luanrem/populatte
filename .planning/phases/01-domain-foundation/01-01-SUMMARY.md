---
phase: 01-domain-foundation
plan: 01
subsystem: core-domain
tags: [entities, repositories, batch, row, clean-architecture]
requires: []
provides: [Batch entity, Row entity, BatchRepository, RowRepository, BatchStatus, BatchMode, RowStatus, ColumnMetadata, ValidationMessage]
affects: [01-02 (Drizzle schema + implementations), 02-01 (parsing strategies use entities), 03-01 (use case depends on repositories)]
tech-stack:
  added: []
  patterns: [interface entities, abstract class repositories, barrel re-exports]
key-files:
  created:
    - apps/api/src/core/entities/batch.entity.ts
    - apps/api/src/core/entities/row.entity.ts
    - apps/api/src/core/repositories/batch.repository.ts
    - apps/api/src/core/repositories/row.repository.ts
  modified:
    - apps/api/src/core/entities/index.ts
    - apps/api/src/core/repositories/index.ts
key-decisions:
  - id: batch-entity-fields
    decision: "Batch uses deletedBy (string | null) for audit trail on soft deletes"
    reason: "CONTEXT.md mandates tracking who deleted for audit purposes"
  - id: row-createMany-void
    decision: "RowRepository.createMany returns Promise<void> not Promise<Row[]>"
    reason: "Pitfall 16: omit .returning() on bulk row inserts to avoid overhead"
  - id: enum-value-casing
    decision: "New enums use SCREAMING_SNAKE_CASE values (PENDING_REVIEW, LIST_MODE, VALID)"
    reason: "CONTEXT.md decision; different from v1.0 ProjectStatus (lowercase) but intentional for ingestion domain"
duration: 1m 25s
completed: 2026-01-29
---

# Phase 01 Plan 01: Core Layer Entities and Repository Contracts Summary

Batch and Row domain entities with enums (BatchStatus, BatchMode, RowStatus), helper types (ColumnMetadata, ValidationMessage), and abstract repository contracts (BatchRepository, RowRepository) following existing Clean Architecture patterns.

## Performance

- **Duration:** 1m 25s
- **Started:** 2026-01-29T14:01:43Z
- **Completed:** 2026-01-29T14:03:08Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

1. Created Batch entity interface with all required fields including columnMetadata (JSONB array of ColumnMetadata objects) and audit trail (deletedBy)
2. Created Row entity interface with JSONB data field, source traceability (sourceFileName, sourceSheetName, sourceRowIndex), and structured validation messages
3. Created BatchRepository abstract class with create, findById, findByProjectId, softDelete (with deletedBy parameter)
4. Created RowRepository abstract class with createMany (void return per Pitfall 16) and findByBatchId
5. Updated both barrel exports to include all 4 entity files and all 4 repository files

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create Batch and Row domain entities | 7ffb7a0 | batch.entity.ts, row.entity.ts, entities/index.ts |
| 2 | Create BatchRepository and RowRepository abstract classes | 857b8f0 | batch.repository.ts, row.repository.ts, repositories/index.ts |

## Files Created

| File | Purpose |
|------|---------|
| apps/api/src/core/entities/batch.entity.ts | Batch, BatchStatus, BatchMode, ColumnMetadata, CreateBatchData |
| apps/api/src/core/entities/row.entity.ts | Row, RowStatus, ValidationMessage, CreateRowData |
| apps/api/src/core/repositories/batch.repository.ts | BatchRepository abstract class |
| apps/api/src/core/repositories/row.repository.ts | RowRepository abstract class |

## Files Modified

| File | Change |
|------|--------|
| apps/api/src/core/entities/index.ts | Added batch.entity and row.entity barrel exports |
| apps/api/src/core/repositories/index.ts | Added batch.repository and row.repository barrel exports |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Batch entity includes `deletedBy: string \| null` | Audit trail for soft deletes per CONTEXT.md |
| RowRepository.createMany returns `Promise<void>` | Pitfall 16: avoid .returning() overhead on bulk inserts |
| New enums use SCREAMING_SNAKE_CASE values | CONTEXT.md decision; consistent within ingestion domain |
| ColumnMetadata as array of objects (not map) | Better for downstream consumers needing ordered column info |
| CreateRowData has optional status/validationMessages | Defaults applied at infrastructure layer; keeps core flexible |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Plan 01-02 (Drizzle schemas, mappers, repository implementations) can proceed immediately. All entity interfaces and repository contracts are in place. Key dependencies provided:

- **Batch + Row entities** -- Drizzle schema columns will mirror these interface fields
- **CreateBatchData + CreateRowData** -- Mappers will transform these into Drizzle insert shapes
- **BatchRepository + RowRepository** -- DrizzleBatchRepository and DrizzleRowRepository will implement these
- **ColumnMetadata + ValidationMessage** -- These JSONB types will be stored as `jsonb` columns

No blockers for plan 01-02.
