---
phase: 04-ingestion-module
plan: 01
subsystem: infrastructure/excel
tags: [nestjs, dependency-injection, module-wiring, ingestion]
requires: [03-01]
provides: [ingestion-module-registered, ingestion-service-injectable]
affects: [05-create-batch-use-case]
tech-stack:
  added: []
  patterns: [nestjs-module-pattern]
key-files:
  created:
    - apps/api/src/infrastructure/excel/ingestion.module.ts
  modified:
    - apps/api/src/app.module.ts
key-decisions:
  - decision: "IngestionModule imports ExcelModule to access strategy tokens"
    rationale: "IngestionService needs LIST_MODE_STRATEGY and PROFILE_MODE_STRATEGY DI tokens"
    outcome: "Clean dependency graph: IngestionModule → ExcelModule"
  - decision: "BatchRepository and RowRepository not in IngestionModule imports"
    rationale: "DrizzleModule is @Global() and already provides these repositories globally"
    outcome: "Simplified module imports, no redundant declarations"
duration: 54s
completed: 2026-01-29
---

# Phase 04 Plan 01: IngestionModule Registration Summary

**One-liner:** NestJS module wiring connecting ExcelModule strategies with IngestionService, registered in AppModule for use case layer DI.

## Performance

**Duration:** 54 seconds
**Start:** 2026-01-29T18:31:22Z
**End:** 2026-01-29T18:32:16Z
**Tasks:** 1/1
**Files changed:** 2

## Accomplishments

✅ Created `IngestionModule` with proper NestJS module structure
✅ Wired ExcelModule import to provide strategy tokens (LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY)
✅ Registered IngestionService as provider and export for use case injection
✅ Integrated IngestionModule into AppModule imports (positioned after TransactionModule, before AuthModule)
✅ TypeScript compilation verified with zero errors

## Task Commits

| Task | Name                                          | Commit  | Files                                                            |
| ---- | --------------------------------------------- | ------- | ---------------------------------------------------------------- |
| 1    | Create IngestionModule and register in AppModule | d027362 | ingestion.module.ts (created), app.module.ts (modified) |

## Files Created

### `apps/api/src/infrastructure/excel/ingestion.module.ts`
**Purpose:** NestJS module bridging Excel parsing strategies with ingestion orchestration service

**Key elements:**
- Imports ExcelModule to access LIST_MODE_STRATEGY and PROFILE_MODE_STRATEGY tokens
- Provides IngestionService
- Exports IngestionService for use case layer injection
- JSDoc explains module purpose, imports, provides, exports, and notes about global DrizzleModule

**Pattern followed:** Same structure as ExcelModule (sibling in same directory)

## Files Modified

### `apps/api/src/app.module.ts`
**Changes:**
- Added import statement: `import { IngestionModule } from './infrastructure/excel/ingestion.module'`
- Added `IngestionModule` to imports array (positioned after TransactionModule, before AuthModule)
- Maintains logical grouping of infrastructure modules (Drizzle → Transaction → Ingestion → Auth)

## Decisions Made

### 1. IngestionModule imports ExcelModule
**Context:** IngestionService needs access to LIST_MODE_STRATEGY and PROFILE_MODE_STRATEGY DI tokens

**Decision:** Add ExcelModule to IngestionModule imports array

**Rationale:** ExcelModule exports these strategy tokens. By importing ExcelModule, IngestionModule makes them available to IngestionService constructor injection.

**Outcome:** Clean dependency graph: IngestionModule → ExcelModule. Phase 5 CreateBatchUseCase will import IngestionModule and get full ingestion capabilities.

### 2. No explicit repository imports in IngestionModule
**Context:** IngestionService needs BatchRepository and RowRepository

**Decision:** Do NOT add DrizzleModule to IngestionModule imports

**Rationale:** DrizzleModule is decorated with `@Global()`, meaning it provides its exports (including abstract repositories) to ALL modules automatically. Explicitly importing DrizzleModule would be redundant and violate DRY.

**Outcome:** Simplified IngestionModule imports. Only ExcelModule needed. Repositories available via global scope.

### 3. Module positioning in AppModule
**Context:** Where to insert IngestionModule in AppModule imports array

**Decision:** After TransactionModule, before AuthModule

**Rationale:**
- Logical grouping: Infrastructure modules together (DrizzleModule → TransactionModule → IngestionModule)
- IngestionModule depends on TransactionModule (future @Transactional decorator at use case layer)
- AuthModule is feature-level, not infrastructure

**Outcome:** Readable imports array with clear infrastructure vs. feature separation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compilation passed on first attempt. Module wiring successful.

## Next Phase Readiness

**Phase 5: CreateBatchUseCase** is ready to begin.

**What's available:**
- IngestionService injectable via DI
- IngestionModule provides full Excel parsing + persistence stack
- Abstract repositories (BatchRepository, RowRepository) available from global DrizzleModule
- TransactionModule available for @Transactional decorator

**What Phase 5 will do:**
- Create CreateBatchUseCase in `apps/api/src/core/use-cases/batch/`
- Inject IngestionService via constructor
- Add @Transactional decorator for atomic batch creation
- Implement use case: validate input → call IngestionService.ingest() → return result
- Register use case in BatchModule (to be created)
- Add BatchController and DTO for HTTP layer

**No blockers.**
