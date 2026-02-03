# Phase 21: Domain Foundation - Research

**Researched:** 2026-02-03
**Domain:** Drizzle ORM schemas, Clean Architecture entities/repositories/mappers for Mapping and Step domain models
**Confidence:** HIGH

## Summary

This phase introduces two new domain models -- Mapping and Step -- following the exact patterns already established in the codebase. The existing codebase provides four complete reference implementations (User, Project, Batch, Row) that follow a consistent Clean Architecture pattern: entity interface in `core/entities/`, abstract repository class in `core/repositories/`, Drizzle schema in `infrastructure/database/drizzle/schema/`, mapper class in `infrastructure/database/drizzle/mappers/`, and Drizzle repository implementation in `infrastructure/database/drizzle/repositories/`. The DrizzleModule registers all repository bindings and the schema index re-exports all schemas.

The key technical challenges specific to this phase are: (1) modeling the selector as a typed `{ type, value }` JSON object stored in `jsonb` with `.$type<>()` for compile-time safety, (2) modeling `selectorFallbacks` as an ordered array also in `jsonb`, (3) implementing the `successTrigger` as a nullable `pgEnum`, (4) enforcing the mutually exclusive `sourceFieldKey` XOR `fixedValue` constraint at the entity level (not database level), and (5) ensuring soft-delete filtering is baked into all Mapping repository queries by default.

The project uses `drizzle-orm@^0.45.1` with `drizzle-kit@^0.31.8`, PostgreSQL via `pg@^8.17.1`, and NestJS for dependency injection. All existing patterns are well-established and should be followed exactly.

**Primary recommendation:** Follow the existing 5-file pattern (entity, schema, repository interface, mapper, repository implementation) exactly as implemented for Project/Batch, using `jsonb().$type<T>()` for structured JSON columns and `pgEnum` for the two new enums.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | ORM for schema definition and queries | Already in use, typed query builder |
| drizzle-kit | ^0.31.8 | Migration generation and management | Already in use, `db:generate` / `db:migrate` scripts |
| pg | ^8.17.1 | PostgreSQL driver (node-postgres) | Already in use via DrizzleService |
| @nestjs/common | (existing) | NestJS decorators for DI (@Injectable) | Already in use for all repositories |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm/pg-core | (bundled) | PostgreSQL column types, pgEnum, pgTable | Schema definition |
| drizzle-orm (operators) | (bundled) | `eq`, `and`, `isNull`, `asc`, `desc`, `sql` | Query building in repositories |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| N/A | N/A | All stack choices are locked by existing codebase |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure

New files follow the established directory layout:

```
apps/api/src/
├── core/
│   ├── entities/
│   │   ├── mapping.entity.ts         # Mapping + CreateMappingData + UpdateMappingData interfaces
│   │   ├── step.entity.ts            # Step + CreateStepData + UpdateStepData + enums + types
│   │   └── index.ts                  # Add exports for mapping + step
│   └── repositories/
│       ├── mapping.repository.ts     # Abstract MappingRepository class
│       ├── step.repository.ts        # Abstract StepRepository class
│       └── index.ts                  # Add exports for mapping + step
├── infrastructure/database/drizzle/
│   ├── schema/
│   │   ├── mappings.schema.ts        # pgTable + pgEnum definitions
│   │   ├── steps.schema.ts           # pgTable definition
│   │   └── index.ts                  # Add exports for mappings + steps
│   ├── mappers/
│   │   ├── mapping.mapper.ts         # MappingMapper.toDomain()
│   │   └── step.mapper.ts            # StepMapper.toDomain()
│   └── repositories/
│       ├── drizzle-mapping.repository.ts  # DrizzleMappingRepository
│       └── drizzle-step.repository.ts     # DrizzleStepRepository
```

### Pattern 1: Entity as Plain Interface (Not Class)

**What:** All domain entities are plain TypeScript interfaces, not classes. Enums are standalone TS enums. Create/Update data types are separate interfaces.
**When to use:** Always -- this is the established codebase convention.
**Example:**
```typescript
// Source: apps/api/src/core/entities/project.entity.ts (existing pattern)
export enum ProjectStatus {
  Active = 'active',
  Archived = 'archived',
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  // ...
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateProjectData {
  userId: string;
  name: string;
  // only the fields needed for creation
}

export interface UpdateProjectData {
  name?: string;
  // all fields optional
}
```

### Pattern 2: Abstract Repository Class (Not Interface)

**What:** Repository contracts are `abstract class` with `public abstract` methods, not interfaces. This allows NestJS DI to use the class as the injection token directly.
**When to use:** Always -- this is the established codebase convention. The abstract class IS the DI token.
**Example:**
```typescript
// Source: apps/api/src/core/repositories/project.repository.ts (existing pattern)
import { CreateProjectData, Project, UpdateProjectData } from '../entities/project.entity';

export abstract class ProjectRepository {
  public abstract findById(id: string, userId: string): Promise<Project | null>;
  public abstract create(data: CreateProjectData): Promise<Project>;
  public abstract update(id: string, userId: string, data: UpdateProjectData): Promise<Project | null>;
  public abstract softDelete(id: string, userId: string): Promise<void>;
}
```

### Pattern 3: Drizzle Schema with Inferred Types

**What:** Each schema file exports the `pgTable` definition plus `$inferSelect` and `$inferInsert` type aliases. Enums are defined with `pgEnum` in the same file as their first usage.
**When to use:** Always -- for type-safe queries and mapper inputs.
**Example:**
```typescript
// Source: apps/api/src/infrastructure/database/drizzle/schema/projects.schema.ts (existing pattern)
export const projectStatusEnum = pgEnum('project_status', ['active', 'archived']);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  // columns...
}, (table) => [
  index('idx_projects_user_id').on(table.userId),
]);

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
```

### Pattern 4: Static Mapper Class

**What:** Mapper is a class with static `toDomain()` method converting database row type to domain entity. Handles null coalescing for timestamps and type casting for enums/jsonb.
**When to use:** Always -- bridge between Drizzle inferred types and domain entities.
**Example:**
```typescript
// Source: apps/api/src/infrastructure/database/drizzle/mappers/batch.mapper.ts (existing pattern)
export class BatchMapper {
  public static toDomain(row: IngestionBatchRow): Batch {
    return {
      id: row.id,
      // ...
      columnMetadata: (row.columnMetadata ?? []) as ColumnMetadata[],  // jsonb cast
      status: row.status as BatchStatus,  // enum cast
      createdAt: row.createdAt ?? new Date(),  // null coalesce
    };
  }
}
```

### Pattern 5: DrizzleModule Provider Registration

**What:** Each repository pair (abstract + implementation) must be registered in `DrizzleModule`'s providers and exports arrays.
**When to use:** Every new repository pair.
**Example:**
```typescript
// Source: apps/api/src/infrastructure/database/drizzle/drizzle.module.ts (existing pattern)
{
  provide: ProjectRepository,
  useClass: DrizzleProjectRepository,
},
```

### Pattern 6: Soft-Delete Filtering in All Queries

**What:** Every read query on a soft-deletable entity includes `isNull(table.deletedAt)` in the WHERE clause. This is not automatic -- it must be explicitly added to every query.
**When to use:** Every query on mappings table (which has soft-delete).
**Example:**
```typescript
// Source: drizzle-project.repository.ts (existing pattern)
.where(and(eq(projects.id, id), isNull(projects.deletedAt)))
```

### Anti-Patterns to Avoid
- **Importing infrastructure from core:** Entity files must never import from Drizzle schemas or mappers. The dependency arrow flows core <- infrastructure, never the reverse.
- **Using Drizzle `$inferSelect` as the domain type:** Always use the domain entity interface. The mapper handles the conversion.
- **Forgetting `isNull(deletedAt)` on soft-deletable queries:** Every single query on mappings must include this filter. Steps don't need it (hard-delete only).
- **Auto-generating IDs in code:** The database generates UUIDs via `defaultRandom()`. Never generate UUIDs client-side.
- **Using `.$defaultFn()` for updatedAt:** The codebase manually sets `updatedAt: new Date()` in update operations, not via Drizzle column defaults.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom UUID function | `uuid('id').primaryKey().defaultRandom()` | Database-level UUID4 via `gen_random_uuid()` |
| Enum types in Postgres | String columns with CHECK constraints | `pgEnum()` + enum column | Drizzle manages CREATE TYPE, type-safe queries |
| JSON column typing | Untyped `jsonb()` with manual casts everywhere | `jsonb().$type<SelectorEntry>()` | Compile-time type safety on defaults, inserts, selects |
| Soft-delete timestamps | Custom middleware or hooks | Manual `isNull(deletedAt)` in each query | Matches existing codebase pattern, explicit is better |
| Migration files | Handwritten SQL | `npm run db:generate` (drizzle-kit generate) | Drizzle-kit reads schema changes and auto-generates migrations |
| DI token for repository | String tokens or Symbol tokens | Abstract class as token | NestJS pattern: `provide: MappingRepository, useClass: DrizzleMappingRepository` |

**Key insight:** This phase has zero novel technical problems. Every pattern is already solved in the existing codebase. The risk is deviating from established patterns, not missing a pattern.

## Common Pitfalls

### Pitfall 1: Schema Not Re-exported from index.ts
**What goes wrong:** New schema tables are defined but not exported from `schema/index.ts`. The `DrizzleClient` type (which uses `typeof schema`) won't include the new tables, causing type errors in queries.
**Why it happens:** Easy to forget the index file when focused on the new schema file.
**How to avoid:** After creating `mappings.schema.ts` and `steps.schema.ts`, immediately add `export * from './mappings.schema'` and `export * from './steps.schema'` to `schema/index.ts`.
**Warning signs:** TypeScript errors about missing properties when accessing `this.drizzle.getClient()` in repository queries.

### Pitfall 2: pgEnum Name Collision
**What goes wrong:** Two `pgEnum` definitions with the same SQL name cause migration errors.
**Why it happens:** The SQL enum name (first argument to `pgEnum`) is global to the database schema. If you name it `'status'` it would collide with existing `'batch_status'` or `'row_status'` enums (those use prefixed names).
**How to avoid:** Use prefixed names: `success_trigger` for the success trigger enum, `step_action` for the step action enum, `selector_type` for the selector type enum. Check existing enums: `project_status`, `batch_status`, `batch_mode`, `row_status`.
**Warning signs:** Migration generation fails or produces ALTER TYPE statements.

### Pitfall 3: jsonb Default Value Must Match TypeScript Type
**What goes wrong:** Setting `.default('[]')` on a `jsonb().$type<SelectorEntry[]>()` column causes a type mismatch. The default must be `[]` (the actual JS array), not the string `'[]'`.
**Why it happens:** Drizzle's `jsonb()` without `.$type()` accepts string defaults (as in existing `ingestion-batches.schema.ts`), but `.$type<T>()` narrows the type.
**How to avoid:** Use `.default([])` (JS array) not `.default('[]')` (string) when `.$type<T[]>()` is used. For objects, use `.default({})` not `.default('{}')`.
**Warning signs:** TypeScript type error on the `.default()` call.

### Pitfall 4: Forgetting to Register in DrizzleModule
**What goes wrong:** Repository is created but NestJS throws "No provider for MappingRepository" at runtime.
**Why it happens:** The abstract class + implementation pair must be registered in both `providers` and `exports` arrays of `DrizzleModule`.
**How to avoid:** Add both `{ provide: MappingRepository, useClass: DrizzleMappingRepository }` to providers AND `MappingRepository` to exports. Same for StepRepository.
**Warning signs:** NestJS dependency injection error at startup.

### Pitfall 5: Mutually Exclusive Fields Not Enforced at DB Level
**What goes wrong:** Both `sourceFieldKey` and `fixedValue` are set on the same step row.
**Why it happens:** PostgreSQL doesn't natively enforce XOR constraints without CHECK constraints, and the existing codebase doesn't use CHECK constraints.
**How to avoid:** Both columns are nullable in the schema. Enforce the XOR constraint at the entity/use-case level (Phase 22+), not at the database level. Document in the entity that they are mutually exclusive. The repository does not validate this -- it's a domain rule.
**Warning signs:** N/A for this phase (enforcement comes in use-case layer in Phase 22).

### Pitfall 6: Step Entity Enum Mismatch with pgEnum Values
**What goes wrong:** The TypeScript `StepAction` enum uses PascalCase values (`Fill`, `Click`, `Wait`) but the `pgEnum` uses lowercase (`'fill'`, `'click'`, `'wait'`). The mapper must handle the conversion.
**Why it happens:** The existing codebase has two conventions: Project uses lowercase (`'active'`, `'archived'`), Batch uses UPPER_CASE (`'PROCESSING'`, `'COMPLETED'`). The mapper casts `row.status as ProjectStatus` or `row.status as BatchStatus` respectively.
**How to avoid:** Pick one convention and be consistent. Recommendation: use lowercase for pgEnum values (matching Project pattern) since it's the PostgreSQL convention. The TypeScript enum values should match the pgEnum values exactly (e.g., `Fill = 'fill'`).
**Warning signs:** Enum cast in mapper produces unexpected values.

### Pitfall 7: Foreign Key ON DELETE Behavior
**What goes wrong:** Deleting a mapping (soft-delete) should NOT cascade-delete steps (per CONTEXT decisions). But if someone later does a hard-delete of a mapping, the FK constraint behavior matters.
**Why it happens:** Drizzle defaults to `ON DELETE no action` (as seen in existing schemas), which prevents deleting a mapping row if steps still reference it.
**How to avoid:** Keep the default `ON DELETE no action` on the steps.mappingId foreign key. This is correct: soft-deleted mappings are never hard-deleted (audit only), and steps reference the mapping ID regardless. If a hard-delete were ever needed, steps would need to be deleted first.
**Warning signs:** Foreign key violation errors on delete operations.

## Code Examples

Verified patterns from the existing codebase and Drizzle documentation:

### Mapping Schema Definition
```typescript
// Based on: projects.schema.ts pattern + Drizzle docs for pgEnum and jsonb.$type
import { pgTable, pgEnum, uuid, text, boolean, timestamp, index, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects.schema';

export const successTriggerEnum = pgEnum('success_trigger', [
  'url_change',
  'element_appears',
]);

export const mappings = pgTable(
  'mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    name: text('name').notNull(),
    targetUrl: text('target_url').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    successTrigger: successTriggerEnum('success_trigger'),  // nullable by default
    successConfig: jsonb('success_config').$type<{ selector?: string }>(),  // nullable, for element_appears
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_mappings_project_id').on(table.projectId),
    index('idx_mappings_project_active')
      .on(table.projectId, table.isActive)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type MappingRow = typeof mappings.$inferSelect;
export type MappingInsert = typeof mappings.$inferInsert;
```

### Step Schema Definition
```typescript
// Based on: ingestion-rows.schema.ts pattern + Drizzle docs for jsonb.$type
import { pgTable, pgEnum, uuid, text, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { mappings } from './mappings.schema';

export const stepActionEnum = pgEnum('step_action', ['fill', 'click', 'wait']);
export const selectorTypeEnum = pgEnum('selector_type', ['css', 'xpath']);

// Type for selector entries stored in jsonb
// Shared between primary selector and fallbacks
interface SelectorEntry {
  type: 'css' | 'xpath';
  value: string;
}

export const steps = pgTable(
  'steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mappingId: uuid('mapping_id')
      .notNull()
      .references(() => mappings.id),
    action: stepActionEnum('action').notNull(),
    selector: jsonb('selector').notNull().$type<SelectorEntry>(),
    selectorFallbacks: jsonb('selector_fallbacks').notNull().default([]).$type<SelectorEntry[]>(),
    sourceFieldKey: text('source_field_key'),      // nullable, XOR with fixedValue
    fixedValue: text('fixed_value'),               // nullable, XOR with sourceFieldKey
    stepOrder: integer('step_order').notNull(),
    optional: boolean('optional').notNull().default(false),
    clearBefore: boolean('clear_before').notNull().default(false),
    pressEnter: boolean('press_enter').notNull().default(false),
    waitMs: integer('wait_ms'),                    // nullable, required for 'wait' action only
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_steps_mapping_id').on(table.mappingId),
    index('idx_steps_mapping_order').on(table.mappingId, table.stepOrder),
  ],
);

export type StepRow = typeof steps.$inferSelect;
export type StepInsert = typeof steps.$inferInsert;
```

### Mapping Entity Interface
```typescript
// Based on: project.entity.ts pattern
export enum SuccessTrigger {
  UrlChange = 'url_change',
  ElementAppears = 'element_appears',
}

export interface SuccessConfig {
  selector?: string;  // CSS selector for element_appears trigger
}

export interface Mapping {
  id: string;
  projectId: string;
  name: string;
  targetUrl: string;
  isActive: boolean;
  successTrigger: SuccessTrigger | null;
  successConfig: SuccessConfig | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateMappingData {
  projectId: string;
  name: string;
  targetUrl: string;
  successTrigger?: SuccessTrigger | null;
  successConfig?: SuccessConfig | null;
}

export interface UpdateMappingData {
  name?: string;
  targetUrl?: string;
  isActive?: boolean;
  successTrigger?: SuccessTrigger | null;
  successConfig?: SuccessConfig | null;
}
```

### Step Entity Interface
```typescript
// Based on: row.entity.ts pattern
export enum StepAction {
  Fill = 'fill',
  Click = 'click',
  Wait = 'wait',
}

export enum SelectorType {
  Css = 'css',
  Xpath = 'xpath',
}

export interface SelectorEntry {
  type: SelectorType;
  value: string;
}

export interface Step {
  id: string;
  mappingId: string;
  action: StepAction;
  selector: SelectorEntry;
  selectorFallbacks: SelectorEntry[];
  sourceFieldKey: string | null;
  fixedValue: string | null;
  stepOrder: number;
  optional: boolean;
  clearBefore: boolean;
  pressEnter: boolean;
  waitMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStepData {
  mappingId: string;
  action: StepAction;
  selector: SelectorEntry;
  selectorFallbacks?: SelectorEntry[];
  sourceFieldKey?: string | null;
  fixedValue?: string | null;
  stepOrder: number;
  optional?: boolean;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number | null;
}

export interface UpdateStepData {
  action?: StepAction;
  selector?: SelectorEntry;
  selectorFallbacks?: SelectorEntry[];
  sourceFieldKey?: string | null;
  fixedValue?: string | null;
  stepOrder?: number;
  optional?: boolean;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number | null;
}
```

### Mapping Repository Interface
```typescript
// Based on: project.repository.ts pattern
export abstract class MappingRepository {
  public abstract findById(id: string): Promise<Mapping | null>;
  public abstract findByProjectId(projectId: string): Promise<Mapping[]>;
  public abstract create(data: CreateMappingData): Promise<Mapping>;
  public abstract update(id: string, data: UpdateMappingData): Promise<Mapping | null>;
  public abstract softDelete(id: string): Promise<void>;
}
```

### Step Repository Interface
```typescript
// Based on: row.repository.ts pattern
export abstract class StepRepository {
  public abstract findById(id: string): Promise<Step | null>;
  public abstract findByMappingId(mappingId: string): Promise<Step[]>;
  public abstract create(data: CreateStepData): Promise<Step>;
  public abstract update(id: string, data: UpdateStepData): Promise<Step | null>;
  public abstract delete(id: string): Promise<void>;  // hard delete
  public abstract reorder(mappingId: string, orderedStepIds: string[]): Promise<void>;
}
```

### Soft-Delete Query Pattern (Mapping)
```typescript
// Based on: drizzle-project.repository.ts pattern
public async findById(id: string): Promise<Mapping | null> {
  const result = await this.drizzle
    .getClient()
    .select()
    .from(mappings)
    .where(and(eq(mappings.id, id), isNull(mappings.deletedAt)))
    .limit(1);

  const row = result[0];
  return row ? MappingMapper.toDomain(row) : null;
}
```

### Hard-Delete Pattern (Step)
```typescript
// Based on: drizzle-user.repository.ts delete pattern
public async delete(id: string): Promise<void> {
  await this.drizzle
    .getClient()
    .delete(steps)
    .where(eq(steps.id, id));
}
```

### Reorder Steps Pattern
```typescript
// Bulk update using transaction-like sequential updates
public async reorder(mappingId: string, orderedStepIds: string[]): Promise<void> {
  const client = this.drizzle.getClient();
  for (let i = 0; i < orderedStepIds.length; i++) {
    const stepId = orderedStepIds[i];
    if (stepId) {
      await client
        .update(steps)
        .set({ stepOrder: i + 1, updatedAt: new Date() })
        .where(and(eq(steps.id, stepId), eq(steps.mappingId, mappingId)));
    }
  }
}
```

### DrizzleModule Registration
```typescript
// Add to drizzle.module.ts providers array
{
  provide: MappingRepository,
  useClass: DrizzleMappingRepository,
},
{
  provide: StepRepository,
  useClass: DrizzleStepRepository,
},
// Add to exports array
MappingRepository,
StepRepository,
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serial()` for auto-increment IDs | `uuid('id').primaryKey().defaultRandom()` | Already established | This project uses UUID everywhere |
| Untyped `jsonb()` | `jsonb().$type<T>()` | drizzle-orm 0.23+ | Compile-time type safety on JSON columns |
| String-based DI tokens | Abstract class as DI token | NestJS convention | Simpler injection, no @Inject('token') needed |

**Deprecated/outdated:**
- The `successCriteria` field mentioned in DOM-01 requirements lists `text_appears` and `element_disappears` as trigger types, but the CONTEXT.md locked decisions override this to only `url_change` and `element_appears`. Follow CONTEXT.md decisions.
- The DOM-02 requirement mentions a `verify` action type, but CONTEXT.md drops it (not needed for v3.0). Only `fill`, `click`, `wait` actions.

## Open Questions

Things that couldn't be fully resolved:

1. **successConfig structure for element_appears**
   - What we know: `element_appears` requires a CSS selector to check for visibility. The CONTEXT says "selector only, no text matching."
   - What's unclear: Should this CSS selector be stored directly on the mapping (e.g., `successSelector` text column) or in a JSON config object (`successConfig: { selector: string }`)?
   - Recommendation: Use a `successConfig` jsonb column with `$type<SuccessConfig>()` for extensibility. If `successTrigger` is `url_change`, `successConfig` can be null. If `element_appears`, it contains `{ selector: string }`. This avoids adding more nullable columns later if trigger types expand.

2. **selectorType pgEnum vs. inline in jsonb**
   - What we know: Selectors are `{ type: 'css' | 'xpath', value: '...' }` stored in jsonb. The `type` field is a string within JSON.
   - What's unclear: Whether to also create a `selectorTypeEnum` pgEnum. Since the selector is inside jsonb, a pgEnum doesn't apply to the JSON content -- it would only be useful as a standalone enum for documentation.
   - Recommendation: Do NOT create a `selectorTypeEnum` pgEnum. The selector type lives inside jsonb and is typed by the `SelectorEntry` TypeScript interface with `.$type<>()`. A pgEnum would be unused by any actual column.

3. **Step deletedAt column omission**
   - What we know: Steps use hard-delete per CONTEXT decisions. No `deletedAt` column.
   - What's unclear: Whether `updatedAt` is needed on steps (existing rows/batches have it).
   - Recommendation: Include `createdAt` and `updatedAt` on steps for consistency with all other tables. Omit `deletedAt` since steps are hard-deleted.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** -- All 4 entity/schema/repository/mapper implementations read directly:
  - `apps/api/src/core/entities/project.entity.ts`
  - `apps/api/src/infrastructure/database/drizzle/schema/projects.schema.ts`
  - `apps/api/src/core/repositories/project.repository.ts`
  - `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts`
  - `apps/api/src/infrastructure/database/drizzle/mappers/project.mapper.ts`
  - (and equivalent files for User, Batch, Row)
- **Drizzle ORM official docs** -- https://orm.drizzle.team/docs/column-types/pg -- Verified `jsonb().$type<T>()`, `pgEnum()`, `boolean()`, `integer()` APIs
- **drizzle.config.ts** -- Confirmed schema path, migration output dir, dialect
- **package.json** -- Confirmed versions: `drizzle-orm@^0.45.1`, `drizzle-kit@^0.31.8`, `pg@^8.17.1`

### Secondary (MEDIUM confidence)
- **Drizzle ORM PostgreSQL Best Practices Guide (2025)** -- https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717 -- Confirmed `.$type()` patterns, timestamp conventions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already in use, versions confirmed from package.json
- Architecture: HIGH -- All patterns directly observed from 4 existing implementations in the codebase
- Pitfalls: HIGH -- Derived from actual codebase patterns and Drizzle documentation, not speculation

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (stable domain, no fast-moving dependencies)
