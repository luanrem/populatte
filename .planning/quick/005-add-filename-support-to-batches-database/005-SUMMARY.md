---
phase: quick-005
plan: 01
subsystem: ingestion
tags: [drizzle, schema, migration, batch, filename, ui]
dependency-graph:
  requires: []
  provides: [batch-name-column, filename-display]
  affects: []
tech-stack:
  added: []
  patterns: [nullable-column-migration, field-propagation-through-layers]
key-files:
  created:
    - apps/api/drizzle/0004_lean_the_order.sql
  modified:
    - apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts
    - apps/api/src/core/entities/batch.entity.ts
    - apps/api/src/infrastructure/database/drizzle/mappers/batch.mapper.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
    - apps/api/src/infrastructure/excel/ingestion.service.ts
    - apps/api/src/core/use-cases/batch/create-batch.use-case.ts
    - apps/api/src/presentation/controllers/batch.controller.ts
    - apps/web/lib/api/schemas/batch.schema.ts
    - apps/web/components/projects/batch-card.tsx
    - apps/web/components/projects/batch-detail-header.tsx
decisions: []
metrics:
  duration: 4m 14s
  completed: 2026-01-30
---

# Quick Task 005: Add Filename Support to Batches Database

**One-liner:** Nullable `name` varchar column on `ingestion_batches` persisting the uploaded filename through all backend layers to the UI.

## What Was Done

### Task 1: Add name column to Drizzle schema and generate migration
- Added `varchar('name', { length: 255 })` nullable column to `ingestionBatches` table definition
- Added `varchar` to the pg-core imports
- Generated migration file `0004_lean_the_order.sql` with `ALTER TABLE "ingestion_batches" ADD COLUMN "name" varchar(255);`
- Pushed migration to local database with `drizzle-kit push --force`

### Task 2: Update backend entities, mapper, repository, ingestion service, and controller
- **batch.entity.ts**: Added `name: string | null` to `Batch` interface and `name?: string | null` to `CreateBatchData`
- **batch.mapper.ts**: Added `name: row.name ?? null` mapping in `toDomain()`
- **drizzle-batch.repository.ts**: Added `name: data.name ?? null` to the `.values()` insert object
- **ingestion.service.ts**: Added `name?: string` to `IngestInput` and passed `name: input.name` to `batchRepository.create()`
- **create-batch.use-case.ts**: Added `name?: string` to `CreateBatchInput` and passed `name: input.name` to `ingestionService.ingest()`
- **batch.controller.ts**: Extracted `uploadedFiles[0]?.originalname` (Multer property) as `batchName` and passed it to the use case

### Task 3: Update frontend schema and display batch name in UI
- **batch.schema.ts**: Added `name: z.string().nullable().optional()` to `batchResponseSchema`
- **batch-card.tsx**: Added `FileSpreadsheet` icon import; added batch name as first element with "Sem nome" fallback before the date line
- **batch-detail-header.tsx**: Added `FileSpreadsheet` icon import; added `<h2>` title with batch name and "Sem nome" fallback; updated breadcrumb from hardcoded "Importacao" to `batch.name ?? "Importacao"`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- API type-check (`tsc --noEmit`): PASS
- Web type-check (`tsc --noEmit`): PASS
- API tests (`jest`): 2 suites, 3 tests, all passing
- API lint: clean
- Web lint: pre-existing errors only (unrelated files), no new issues

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 2f92c6b | feat(quick-005): add nullable name column to ingestion_batches schema |
| 2 | 99e8227 | feat(quick-005): propagate batch name through backend pipeline |
| 3 | 40bd54f | feat(quick-005): display batch filename in frontend UI |
