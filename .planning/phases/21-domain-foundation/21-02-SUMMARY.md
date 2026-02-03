---
phase: 21-domain-foundation
plan: 02
subsystem: database
tags: [drizzle, postgres, clean-architecture, step, hard-delete, jsonb, pgEnum, migration]

# Dependency graph
requires:
  - phase: 21-domain-foundation plan 01
    provides: mappings schema and entity patterns, FK target for steps table
provides:
  - Step entity interface with StepAction/SelectorType enums and SelectorEntry
  - Abstract StepRepository with CRUD + hard-delete + reorder signatures
  - Drizzle steps schema with FK to mappings, pgEnum for step_action, jsonb selectors
  - StepMapper for database row to domain entity conversion
  - DrizzleStepRepository with hard-delete (no soft-delete filtering)
  - DrizzleModule DI registration for MappingRepository and StepRepository
  - Migration 0005_add-mappings-and-steps.sql creating both tables
affects: [22-mapping-crud, 23-mapping-rules]

# Tech tracking
tech-stack:
  added: []
  patterns: [step-domain-layer, hard-delete-pattern, jsonb-selector-pattern, reorder-by-position]

key-files:
  created:
    - apps/api/src/core/entities/step.entity.ts
    - apps/api/src/core/repositories/step.repository.ts
    - apps/api/src/infrastructure/database/drizzle/schema/steps.schema.ts
    - apps/api/src/infrastructure/database/drizzle/mappers/step.mapper.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-step.repository.ts
    - apps/api/drizzle/0005_add-mappings-and-steps.sql
  modified:
    - apps/api/src/core/entities/index.ts
    - apps/api/src/core/repositories/index.ts
    - apps/api/src/infrastructure/database/drizzle/schema/index.ts
    - apps/api/src/infrastructure/database/drizzle/drizzle.module.ts

key-decisions:
  - "Steps use hard-delete (no deletedAt column) -- steps are cheap to recreate and soft-delete adds unnecessary complexity"
  - "Selector stored as jsonb with SelectorEntry type (type + value) for both primary and fallbacks"
  - "selectorFallbacks default to empty array via SQL default('[]') to avoid null handling"
  - "Step repository has reorder method that reassigns stepOrder by array position"

patterns-established:
  - "Hard-delete entity pattern: no deletedAt column, repository uses delete() not softDelete()"
  - "Jsonb typed array pattern: default('[]') with $type<Array<T>>() for typed array defaults"

# Metrics
duration: 2m 53s
completed: 2026-02-03
---

# Phase 21 Plan 02: Step Domain Layer Summary

**Step entity with StepAction pgEnum, jsonb selectors with SelectorEntry typing, hard-delete repository, DrizzleModule DI wiring for both Mapping and Step, and migration 0005 creating both tables**

## Performance

- **Duration:** 2m 53s
- **Started:** 2026-02-03T03:30:47Z
- **Completed:** 2026-02-03T03:33:40Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Step entity with StepAction enum (fill, click, wait), SelectorType enum (css, xpath), SelectorEntry interface, and Create/UpdateStepData interfaces
- Drizzle steps schema with FK to mappings, step_action pgEnum, jsonb for selector and selectorFallbacks, two indexes (mapping_id, mapping_order)
- Abstract StepRepository with findById, findByMappingId, create, update, delete (hard), reorder
- DrizzleStepRepository with no soft-delete filtering (hard-delete only), reorder via positional update loop
- StepMapper converting database rows to domain entities with jsonb casting for SelectorEntry types
- DrizzleModule now registers 6 repository providers: User, Project, Batch, Row, Mapping, Step
- Migration 0005_add-mappings-and-steps.sql creates both mappings and steps tables with all constraints and indexes

## Task Commits

Each task was committed atomically:

1. **Task 1: Step entity, schema, repository interface, mapper, and implementation** - `e32b5a8` (feat)
2. **Task 2: DrizzleModule registration and database migration** - `79bfc1e` (feat)

## Files Created/Modified
- `apps/api/src/core/entities/step.entity.ts` - Step, CreateStepData, UpdateStepData interfaces + StepAction, SelectorType enums + SelectorEntry interface
- `apps/api/src/core/repositories/step.repository.ts` - Abstract StepRepository with 6 method signatures
- `apps/api/src/infrastructure/database/drizzle/schema/steps.schema.ts` - steps pgTable + stepActionEnum + StepRow/StepInsert types
- `apps/api/src/infrastructure/database/drizzle/mappers/step.mapper.ts` - StepMapper.toDomain static method
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-step.repository.ts` - DrizzleStepRepository with hard-delete queries
- `apps/api/drizzle/0005_add-mappings-and-steps.sql` - Migration creating mappings and steps tables
- `apps/api/src/core/entities/index.ts` - Added step entity barrel export
- `apps/api/src/core/repositories/index.ts` - Added step repository barrel export
- `apps/api/src/infrastructure/database/drizzle/schema/index.ts` - Added steps schema barrel export
- `apps/api/src/infrastructure/database/drizzle/drizzle.module.ts` - Added Mapping and Step repository DI bindings

## Decisions Made
- Steps use hard-delete (permanent removal via `DELETE FROM`) with no `deletedAt` column, unlike mappings which use soft-delete. Steps are inexpensive to recreate and don't need audit trails.
- Selector type (css/xpath) lives inside jsonb typed with `$type<>()` rather than as a separate pgEnum. This avoids unnecessary DB-level enum for a value that only exists within jsonb context.
- The `reorder` method loops through the array and updates each step individually. For typical step counts (<20 per mapping), this is simpler and sufficient vs. a CTE-based batch update.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Migration apply (`drizzle-kit migrate`) failed due to pre-existing database state conflict (type "project_status" already exists from a prior partially-applied migration). This is a known database state issue unrelated to our changes. The migration SQL file was generated correctly and can be applied after resolving the prior migration state.

## User Setup Required

- Run `npx drizzle-kit migrate` from `apps/api/` after resolving prior migration state if tables need to be created in the local database.

## Next Phase Readiness
- Both domain models (Mapping + Step) have complete Clean Architecture layers
- DrizzleModule exports both repositories for dependency injection
- Phase 22 (Mapping CRUD) can immediately build use cases importing MappingRepository and StepRepository
- Phase 23 (Mapping Rules) can build on the Step entity for rule-based automation

---
*Phase: 21-domain-foundation*
*Completed: 2026-02-03*
