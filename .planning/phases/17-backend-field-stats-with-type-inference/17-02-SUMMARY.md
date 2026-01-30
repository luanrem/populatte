---
phase: 17-backend-field-stats-with-type-inference
plan: 02
subsystem: api
tags: [nestjs, drizzle-orm, postgresql, jsonb, cte, type-inference]

# Dependency graph
requires:
  - phase: 17-01
    provides: TypeInferenceService with TDD-driven type detection
provides:
  - GET /projects/:projectId/batches/:batchId/field-stats endpoint
  - FieldAggregation repository interface and CTE-based implementation
  - GetFieldStatsUseCase orchestrating validation + aggregation + type inference
  - Sample rows extraction for type inference
affects: [19-field-inventory-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CTE-based JSONB aggregation for field presence/unique counts"
    - "Defense-in-depth ownership validation (batch.projectId === projectId)"
    - "Zero-row edge case handling returning fields from columnMetadata"

key-files:
  created:
    - apps/api/src/core/use-cases/batch/get-field-stats.use-case.ts
  modified:
    - apps/api/src/core/repositories/batch.repository.ts
    - apps/api/src/core/repositories/row.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts
    - apps/api/src/presentation/controllers/batch.controller.ts
    - apps/api/src/infrastructure/batch/batch.module.ts

key-decisions:
  - "Single CTE-based query for field aggregation (no N+1 per field)"
  - "Empty strings not counted toward presence (filtered in SQL: data->>field != '')"
  - "First 100 rows for type inference (deterministic sample)"
  - "Presence/unique counts use ALL rows (exact, not approximate)"
  - "3 sample distinct values per field for card preview"

patterns-established:
  - "CTE with jsonb_object_keys() to extract dynamic field names from JSONB columns"
  - "Defense-in-depth ownership validation: batch.projectId === projectId after batch fetch"
  - "Zero-row batch edge case: return fields from columnMetadata with zero stats"

# Metrics
duration: 3min 36s
completed: 2026-01-30
---

# Phase 17 Plan 02: Repository Aggregation and Endpoint Summary

**CTE-based field aggregation endpoint with type inference, delivering presence/unique counts and sample values for Phase 19 UI**

## Performance

- **Duration:** 3min 36s
- **Started:** 2026-01-30T23:40:02Z
- **Completed:** 2026-01-30T23:43:38Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- CTE-based single-query aggregation for field presence/unique counts across all rows
- Sample rows extraction with deterministic sort (sourceRowIndex, id) for type inference
- GetFieldStatsUseCase orchestrating ownership validation + aggregation + type inference
- Zero-row batch edge case handling returning fields from columnMetadata
- GET /projects/:projectId/batches/:batchId/field-stats endpoint fully wired

## Task Commits

Each task was committed atomically:

1. **Task 1: Add repository methods for field aggregation and sample rows** - `3d3de85` (feat)
2. **Task 2: Create GetFieldStatsUseCase and wire endpoint** - `716bc0e` (feat)

## Files Created/Modified

**Created:**
- `apps/api/src/core/use-cases/batch/get-field-stats.use-case.ts` - Orchestrates ownership validation, aggregation, sampling, and type inference

**Modified:**
- `apps/api/src/core/repositories/batch.repository.ts` - Added FieldAggregation interface and getFieldAggregations abstract method
- `apps/api/src/core/repositories/row.repository.ts` - Added getSampleRows(batchId, limit) abstract method
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts` - Implemented CTE-based field aggregation query
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` - Implemented sample rows with deterministic sort
- `apps/api/src/presentation/controllers/batch.controller.ts` - Added GET :batchId/field-stats endpoint
- `apps/api/src/infrastructure/batch/batch.module.ts` - Registered GetFieldStatsUseCase and TypeInferenceService
- `apps/api/src/core/use-cases/batch/index.ts` - Exported GetFieldStatsUseCase

## Decisions Made

**1. Single CTE-based aggregation query**
- Rationale: Avoid N+1 queries per field, extract all field names dynamically via jsonb_object_keys() in CTE
- Implementation: CTE extracts distinct keys, main query computes presence_count and unique_count with FILTER clause
- Performance: Single round-trip to database regardless of field count

**2. Empty strings not counted toward presence**
- Rationale: Empty strings are semantically "no value", should not count as present
- Implementation: SQL filter: `data->>field IS NOT NULL AND data->>field != ''`
- Impact: Presence percentage reflects meaningful data, not just non-null fields

**3. First 100 rows for type inference**
- Rationale: Balances accuracy (large enough sample) with performance (doesn't load entire dataset)
- Implementation: getSampleRows(batchId, 100) with ORDER BY sourceRowIndex, id (deterministic)
- Impact: Type inference representative for most datasets, consistent results

**4. Presence/unique counts use ALL rows**
- Rationale: Field stats should be exact, not approximate
- Implementation: Aggregation query scans all non-deleted rows
- Impact: Accurate percentages for frontend display

**5. 3 sample distinct values per field**
- Rationale: Enough for user preview, not overwhelming
- Implementation: Extract first 3 distinct non-empty values from samples
- Impact: Field inventory cards show representative data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 19 (Field Inventory UI) can now:**
- Fetch field-level statistics via GET /projects/:projectId/batches/:batchId/field-stats
- Display presence percentage (presenceCount / totalRows * 100)
- Display uniqueness percentage (uniqueCount / presenceCount * 100)
- Show inferred type with confidence badge
- Preview 3 sample values per field

**API contract:**
```typescript
{
  totalRows: number,
  fields: [
    {
      fieldName: string,
      presenceCount: number,
      uniqueCount: number,
      inferredType: InferredType,
      confidence: number,
      sampleValues: unknown[]
    }
  ]
}
```

**Blockers:** None.

**Concerns:** None.

---
*Phase: 17-backend-field-stats-with-type-inference*
*Completed: 2026-01-30*
