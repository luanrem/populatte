---
phase: 21-domain-foundation
plan: 01
subsystem: database
tags: [drizzle, postgres, clean-architecture, mapping, soft-delete, jsonb, pgEnum]

# Dependency graph
requires:
  - phase: 20-field-inventory (v2.3)
    provides: projects schema and entity patterns used as reference
provides:
  - Mapping entity interface with SuccessTrigger enum and SuccessConfig
  - Abstract MappingRepository with CRUD + soft-delete signatures
  - Drizzle mappings schema with FK to projects, pgEnum, jsonb
  - MappingMapper for database row to domain entity conversion
  - DrizzleMappingRepository with soft-delete-aware queries
affects: [22-mapping-crud, 23-mapping-rules]

# Tech tracking
tech-stack:
  added: []
  patterns: [mapping-domain-layer, success-trigger-enum, jsonb-config-pattern]

key-files:
  created:
    - apps/api/src/core/entities/mapping.entity.ts
    - apps/api/src/core/repositories/mapping.repository.ts
    - apps/api/src/infrastructure/database/drizzle/schema/mappings.schema.ts
    - apps/api/src/infrastructure/database/drizzle/mappers/mapping.mapper.ts
    - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-mapping.repository.ts
  modified:
    - apps/api/src/core/entities/index.ts
    - apps/api/src/core/repositories/index.ts
    - apps/api/src/infrastructure/database/drizzle/schema/index.ts

key-decisions:
  - "No userId param in MappingRepository -- ownership validated at use-case layer via project lookup"
  - "SuccessConfig uses jsonb with optional selector field for flexible extension"

patterns-established:
  - "Mapping domain layer: entity, schema, repository interface, mapper, Drizzle repository"
  - "jsonb typed column pattern: .$type<T>() for compile-time safety on jsonb columns"

# Metrics
duration: 2min
completed: 2026-02-03
---

# Phase 21 Plan 01: Mapping Domain Layer Summary

**Mapping entity with SuccessTrigger pgEnum, jsonb SuccessConfig, Drizzle schema with FK to projects, and soft-delete-aware repository implementation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-03T03:26:01Z
- **Completed:** 2026-02-03T03:27:37Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Mapping entity interface with SuccessTrigger enum (url_change, element_appears) and SuccessConfig (jsonb with optional CSS selector)
- Drizzle mappings schema with FK to projects, pgEnum for success_trigger, jsonb for successConfig, composite index on (projectId, isActive)
- Abstract MappingRepository with findById, findByProjectId, create, update, softDelete signatures
- DrizzleMappingRepository with isNull(deletedAt) filtering on all 4 read/write queries
- MappingMapper converting database rows to domain entities with proper enum and jsonb casting

## Task Commits

Each task was committed atomically:

1. **Task 1: Mapping entity, schema, and repository interface** - `048ba75` (feat)
2. **Task 2: Mapping mapper and Drizzle repository implementation** - `ac441ea` (feat)

## Files Created/Modified
- `apps/api/src/core/entities/mapping.entity.ts` - Mapping, CreateMappingData, UpdateMappingData interfaces + SuccessTrigger enum + SuccessConfig interface
- `apps/api/src/core/repositories/mapping.repository.ts` - Abstract MappingRepository with 5 method signatures
- `apps/api/src/infrastructure/database/drizzle/schema/mappings.schema.ts` - mappings pgTable + successTriggerEnum + MappingRow/MappingInsert types
- `apps/api/src/infrastructure/database/drizzle/mappers/mapping.mapper.ts` - MappingMapper.toDomain static method
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-mapping.repository.ts` - DrizzleMappingRepository with soft-delete aware queries
- `apps/api/src/core/entities/index.ts` - Added mapping entity barrel export
- `apps/api/src/core/repositories/index.ts` - Added mapping repository barrel export
- `apps/api/src/infrastructure/database/drizzle/schema/index.ts` - Added mappings schema barrel export

## Decisions Made
- No userId parameter in MappingRepository methods -- ownership validation happens at the use-case layer (Phase 22) by looking up the project and checking project.userId. This keeps the repository focused on data access only.
- SuccessConfig uses jsonb with typed `$type<{ selector?: string }>()` for compile-time safety while allowing future extension of the config shape.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Mapping domain layer complete with entity, schema, repository interface, mapper, and Drizzle implementation
- Ready for Plan 21-02 (MappingRule domain layer) which will add foreign key reference to the mappings table
- Ready for Phase 22 (Mapping CRUD) which will build use cases and endpoints on top of this layer

---
*Phase: 21-domain-foundation*
*Completed: 2026-02-03*
