# Phase 12: Read Endpoints - Research

**Researched:** 2026-01-30
**Domain:** NestJS REST API read endpoints with pagination, nested resources, and ownership validation
**Confidence:** HIGH

## Summary

Phase 12 implements three HTTP GET endpoints for reading batch metadata and paginated row data: single batch detail, batch list for a project, and paginated rows for a batch. All endpoints enforce ownership validation through the existing project ownership check pattern established in Phase 10.

The codebase already has robust patterns for this phase: Zod validation pipes for query parameters, repository-level pagination returning `PaginatedResult<T>` (items + total only), and ownership validation using `findByIdOnly()` followed by userId comparison. The standard NestJS approach uses query parameters (`limit` and `offset`) validated with Zod schemas, and responses use flat pagination envelopes (`{ items, total, limit, offset }`).

**Primary recommendation:** Follow existing patterns from `ProjectController` and `CreateBatchUseCase`. Use Zod `z.coerce.number()` for query parameter validation, compute `totalRows` via repository count, and add limit/offset to response at use case layer (repository returns only items + total per Phase 11-01 decision).

## Standard Stack

The established libraries/tools for implementing read endpoints in this NestJS codebase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | Current | HTTP framework with decorators (`@Get`, `@Query`, `@Param`) | Official framework, already in use |
| Zod | Current | Runtime validation for query parameters | Project standard (replaces class-validator) |
| Drizzle ORM | Current | Database queries with type safety | Project ORM, used in all repositories |
| drizzle-orm/pg-core | Current | PostgreSQL-specific functions (`count()`, `and()`, `eq()`) | Required for Drizzle with PostgreSQL |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/common | Current | Exception classes (`NotFoundException`, `ForbiddenException`, `BadRequestException`) | All error scenarios |
| class-transformer | Current | Response DTO transformation (optional, may not be needed) | Only if hiding fields from entities |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod coercion | class-validator `@Transform` decorator | class-validator requires DTOs as classes; Zod is project standard |
| Flat pagination envelope | Nested (`{ data: items, meta: { total, limit, offset } }`) | Context decision specifies flat structure |
| Manual totalRows query | Drizzle `db.$count()` subquery in SELECT | Phase 11 already has parallel query pattern; subquery would change repository contract |

**Installation:**
No new packages required — all dependencies already in use.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── presentation/
│   ├── controllers/
│   │   └── batch.controller.ts        # Add GET endpoints here
│   ├── dto/
│   │   └── batch.dto.ts                # Add pagination query schemas + response types
│   └── pipes/
│       └── zod-validation.pipe.ts      # Already exists, reuse
├── core/
│   └── use-cases/
│       └── batch/
│           ├── get-batch.use-case.ts         # NEW: Single batch detail
│           ├── list-batches.use-case.ts      # NEW: Batch list with pagination
│           └── list-rows.use-case.ts         # NEW: Paginated rows
└── infrastructure/
    └── database/
        └── drizzle/
            └── repositories/
                ├── drizzle-batch.repository.ts   # Already has findByProjectIdPaginated
                └── drizzle-row.repository.ts     # Already has findByBatchIdPaginated
```

### Pattern 1: Ownership Validation for Nested Resources
**What:** Three-step validation pattern: (1) Find parent without userId filter, (2) Check existence/soft-delete, (3) Validate ownership and throw 403 if mismatch

**When to use:** All nested resource endpoints where user must own parent resource

**Example:**
```typescript
// Source: /Users/luanmartins/source/projects/populatte/apps/api/src/core/use-cases/batch/create-batch.use-case.ts (lines 39-57)
public async execute(input: CreateBatchInput): Promise<CreateBatchResult> {
  // Step 1: Find project WITHOUT userId filter (enables separate 404/403)
  const project = await this.projectRepository.findByIdOnly(input.projectId);

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  // Step 2: Check if soft-deleted (specific error message)
  if (project.deletedAt) {
    throw new NotFoundException('Project is archived');
  }

  // Step 3: Validate ownership (403 with security audit log)
  if (project.userId !== input.userId) {
    this.logger.warn(
      `Unauthorized batch creation attempt - userId: ${input.userId}, projectId: ${input.projectId}`,
    );
    throw new ForbiddenException('Access denied');
  }

  // Proceed with business logic...
}
```

### Pattern 2: Query Parameter Validation with Zod Coercion
**What:** Use `z.coerce.number()` to automatically convert string query parameters to numbers, with validation chained after coercion

**When to use:** All query parameters that should be numbers (limit, offset, page, etc.)

**Example:**
```typescript
// Source: Zod documentation + project pattern from batch.dto.ts
import { z } from 'zod';

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;

// In controller:
@Get()
public async list(
  @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto
) {
  // query.limit and query.offset are numbers
}
```

**Important:** Zod's `z.coerce.number()` calls `Number(input)` internally, so empty strings become `0` and invalid strings produce "Expected number, received nan" errors. This is acceptable for query parameters with `.min()` validation.

### Pattern 3: Pagination Envelope at Use Case Layer
**What:** Repository returns `PaginatedResult<T>` (items + total only), use case adds limit/offset to response

**When to use:** All paginated endpoints (established in Phase 11-01)

**Example:**
```typescript
// Repository contract (already exists):
// /Users/luanmartins/source/projects/populatte/apps/api/src/core/entities/pagination.types.ts
export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

// Use case pattern:
export class ListBatchesUseCase {
  public async execute(projectId: string, userId: string, limit: number, offset: number) {
    // Step 1-3: Ownership validation (see Pattern 1)

    // Step 4: Get paginated data from repository
    const result = await this.batchRepository.findByProjectIdPaginated(
      projectId,
      limit,
      offset,
    );

    // Step 5: Add limit/offset to response (use case responsibility)
    return {
      items: result.items,
      total: result.total,
      limit,
      offset,
    };
  }
}
```

### Pattern 4: Computing totalRows for Batch Detail
**What:** Use separate count query in use case to add computed `totalRows` field to batch response

**When to use:** Single batch detail endpoint (GET /batches/:id) per context requirement

**Example:**
```typescript
// Use case pattern for single batch with totalRows:
export class GetBatchUseCase {
  public async execute(projectId: string, batchId: string, userId: string) {
    // Ownership validation...

    // Find batch
    const batch = await this.batchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    // Verify batch belongs to project (defense in depth)
    if (batch.projectId !== projectId) {
      throw new NotFoundException('Batch not found');
    }

    // Compute totalRows via repository count
    const rowCount = await this.rowRepository.findByBatchIdPaginated(batchId, 1, 0);

    return {
      ...batch,
      totalRows: rowCount.total,
    };
  }
}
```

**Alternative (more efficient):** Add dedicated `countByBatchId(batchId: string): Promise<number>` method to RowRepository to avoid fetching one row. This is cleaner than using pagination just for count.

### Pattern 5: Parallel Queries for Count + Data
**What:** Use `Promise.all()` to execute data query and count query in parallel (reduces latency)

**When to use:** Repository-level pagination (already implemented in Phase 11)

**Example:**
```typescript
// Source: /Users/luanmartins/source/projects/populatte/apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts (lines 69-100)
public async findByProjectIdPaginated(
  projectId: string,
  limit: number,
  offset: number,
): Promise<PaginatedResult<Batch>> {
  const conditions = and(
    eq(ingestionBatches.projectId, projectId),
    isNull(ingestionBatches.deletedAt),
  );

  const [data, countResult] = await Promise.all([
    this.drizzle
      .getClient()
      .select()
      .from(ingestionBatches)
      .where(conditions)
      .orderBy(desc(ingestionBatches.createdAt))
      .limit(limit)
      .offset(offset),
    this.drizzle
      .getClient()
      .select({ count: count() })
      .from(ingestionBatches)
      .where(conditions),
  ]);

  const total = countResult[0]?.count ?? 0;
  return {
    items: data.map((row) => BatchMapper.toDomain(row)),
    total,
  };
}
```

**Critical detail:** Share the `conditions` variable between data and count queries to prevent inconsistency (Phase 11-01 decision).

### Anti-Patterns to Avoid
- **Don't use different WHERE clauses for data vs count queries** — leads to pagination metadata mismatch (violates Phase 11-01 decision)
- **Don't fall back silently to defaults for invalid pagination params** — throw `BadRequestException` per context decision
- **Don't hide 403 Forbidden as 404 Not Found** — explicit ownership errors required per context decision
- **Don't add userId filter to parent lookup** — use `findByIdOnly()` to distinguish 404 vs 403 (established pattern)
- **Don't compute totalRows in database as denormalized field** — compute on demand to avoid stale data
- **Don't use nestjs-paginate library** — project uses custom pattern with Zod validation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query parameter coercion | Manual `parseInt(req.query.limit)` with try/catch | Zod `z.coerce.number()` | Handles NaN, provides type safety, integrates with ZodValidationPipe |
| Pagination validation | Custom validator for limit/offset ranges | Zod schema with `.min()`, `.max()`, `.default()` | Declarative, reusable, automatic error messages |
| Counting rows | Manual `SELECT COUNT(*) WHERE ...` | Drizzle `count()` function | Handles type casting (bigint → number), consistent with project patterns |
| Ownership validation | Different pattern per endpoint | Reuse `findByIdOnly()` + userId check pattern | Already established in CreateBatchUseCase, prevents pattern drift |
| Error response format | Custom error objects | NestJS built-in exceptions (`NotFoundException`, `ForbiddenException`, `BadRequestException`) | Auto-formatted as `{ statusCode, message, error }` per context decision |
| Pagination metadata | Custom response wrapper interceptor | Add limit/offset in use case (flat structure) | Per Phase 11-01 and context decisions, simpler than interceptors |

**Key insight:** The codebase has already solved all major challenges for this phase in Phases 10-11. This phase is primarily about creating new use cases following existing patterns, not inventing new approaches.

## Common Pitfalls

### Pitfall 1: Coercion Edge Cases with Empty Strings
**What goes wrong:** Zod's `z.coerce.number()` converts empty string `""` to `0`, which passes `.min(0)` validation but may not be intended

**Why it happens:** `Number("")` returns `0` in JavaScript, and Zod uses `Number()` internally for coercion

**How to avoid:** Use `.min(1)` for `limit` (prevents 0 and negative), `.min(0)` for `offset` is acceptable (0 is valid starting offset)

**Warning signs:** Tests with `?limit=` (empty value) pass validation but return 0 rows

**Source:** [Zod Coerce: 5+ Edge Cases with Examples](https://tecktol.com/zod-coerce/), [Parsing a numeric string - Zod Discussion #330](https://github.com/colinhacks/zod/discussions/330)

### Pitfall 2: Forgetting Defense-in-Depth Validation
**What goes wrong:** After validating project ownership, forgetting to check that batch/row actually belongs to that project (URL parameter tampering)

**Why it happens:** Ownership check only validates project access, not resource hierarchy (user owns project A, requests batch from project B via `/projects/A/batches/B-batch-id`)

**How to avoid:** After retrieving batch/row, verify `batch.projectId === projectId` or `row.batchId === batchId` before returning

**Warning signs:** User can access other users' batches by guessing IDs if they know a valid projectId they own

**Example:**
```typescript
// BAD: No hierarchy check
const batch = await this.batchRepository.findById(batchId);
if (!batch) throw new NotFoundException('Batch not found');
return batch; // Could belong to different project!

// GOOD: Verify hierarchy
const batch = await this.batchRepository.findById(batchId);
if (!batch || batch.projectId !== projectId) {
  throw new NotFoundException('Batch not found');
}
```

### Pitfall 3: Inefficient totalRows Computation
**What goes wrong:** Using `findByBatchIdPaginated(batchId, 1, 0)` just to get the count fetches unnecessary row data

**Why it happens:** No dedicated count method exists, so developers reuse pagination

**How to avoid:** Add `countByBatchId(batchId: string): Promise<number>` to RowRepository for cleaner API

**Warning signs:** `LIMIT 1 OFFSET 0` in query logs when only count is needed

**Repository addition:**
```typescript
// In RowRepository abstract class:
public abstract countByBatchId(batchId: string): Promise<number>;

// In DrizzleRowRepository:
public async countByBatchId(batchId: string): Promise<number> {
  const result = await this.drizzle
    .getClient()
    .select({ count: count() })
    .from(ingestionRows)
    .where(
      and(
        eq(ingestionRows.batchId, batchId),
        isNull(ingestionRows.deletedAt),
      ),
    );

  return result[0]?.count ?? 0;
}
```

### Pitfall 4: Timestamp Serialization Inconsistency
**What goes wrong:** NestJS auto-serializes Date objects to ISO 8601 strings, but explicit date formatting may differ

**Why it happens:** Developers manually format dates instead of relying on NestJS serialization

**How to avoid:** Return Date objects from use cases; NestJS automatically serializes to ISO 8601 strings (e.g., `"2026-01-30T14:30:00.000Z"`)

**Warning signs:** Inconsistent date formats across endpoints (some ISO, some custom format)

### Pitfall 5: Not Excluding Soft-Deleted Records
**What goes wrong:** Forgetting `isNull(deletedAt)` filter in queries returns soft-deleted batches/rows

**Why it happens:** Copy-paste from queries without soft-delete awareness

**How to avoid:** All batch/row queries MUST include `.where(and(..., isNull(table.deletedAt)))` — verify in code review

**Warning signs:** Deleted batches appear in list responses

**Source:** Existing repository pattern in drizzle-batch.repository.ts lines 45, 62, 76, 112

## Code Examples

Verified patterns from official sources and existing codebase:

### Controller Endpoint with Query Parameter Validation
```typescript
// Pattern: GET endpoint with pagination query parameters
// Location: apps/api/src/presentation/controllers/batch.controller.ts
@Controller('projects/:projectId/batches')
@UseGuards(ClerkAuthGuard)
export class BatchController {
  public constructor(
    private readonly listBatches: ListBatchesUseCase,
    private readonly getBatch: GetBatchUseCase,
    private readonly listRows: ListRowsUseCase,
  ) {}

  @Get()
  public async list(
    @Param('projectId') projectId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.listBatches.execute(projectId, user.id, query.limit, query.offset);
  }

  @Get(':batchId')
  public async getById(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @CurrentUser() user: User,
  ) {
    return this.getBatch.execute(projectId, batchId, user.id);
  }

  @Get(':batchId/rows')
  public async listRows(
    @Param('projectId') projectId: string,
    @Param('batchId') batchId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.listRows.execute(projectId, batchId, user.id, query.limit, query.offset);
  }
}
```

### Zod Schema for Pagination Query Parameters
```typescript
// Pattern: Query parameter validation with coercion and defaults
// Location: apps/api/src/presentation/dto/batch.dto.ts
import { z } from 'zod';

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
```

### Use Case: List Batches with Pagination
```typescript
// Pattern: Use case with ownership validation + pagination
// Location: apps/api/src/core/use-cases/batch/list-batches.use-case.ts
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';

export interface ListBatchesResult {
  items: Batch[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ListBatchesUseCase {
  private readonly logger = new Logger(ListBatchesUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(
    projectId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ListBatchesResult> {
    // Step 1: Find project WITHOUT userId filter
    const project = await this.projectRepository.findByIdOnly(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 2: Check soft-delete
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 3: Validate ownership
    if (project.userId !== userId) {
      this.logger.warn(
        `Unauthorized batch list attempt - userId: ${userId}, projectId: ${projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Get paginated batches
    const result = await this.batchRepository.findByProjectIdPaginated(
      projectId,
      limit,
      offset,
    );

    // Step 5: Add pagination metadata (use case responsibility)
    return {
      items: result.items,
      total: result.total,
      limit,
      offset,
    };
  }
}
```

### Use Case: Get Single Batch with totalRows
```typescript
// Pattern: Single resource with computed field
// Location: apps/api/src/core/use-cases/batch/get-batch.use-case.ts
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Batch } from '../../entities/batch.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';
import { RowRepository } from '../../repositories/row.repository';

export interface GetBatchResult extends Batch {
  totalRows: number;
}

@Injectable()
export class GetBatchUseCase {
  private readonly logger = new Logger(GetBatchUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
  ): Promise<GetBatchResult> {
    // Step 1-3: Ownership validation (same pattern)
    const project = await this.projectRepository.findByIdOnly(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    if (project.userId !== userId) {
      this.logger.warn(
        `Unauthorized batch access - userId: ${userId}, batchId: ${batchId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find batch
    const batch = await this.batchRepository.findById(batchId);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    // Step 5: Defense-in-depth - verify batch belongs to project
    if (batch.projectId !== projectId) {
      throw new NotFoundException('Batch not found');
    }

    // Step 6: Compute totalRows (use dedicated count method if added)
    const totalRows = await this.rowRepository.countByBatchId(batchId);

    // Step 7: Return batch with computed field
    return {
      ...batch,
      totalRows,
    };
  }
}
```

### Use Case: List Rows with Pagination
```typescript
// Pattern: Nested resource pagination (batch → rows)
// Location: apps/api/src/core/use-cases/batch/list-rows.use-case.ts
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Row } from '../../entities/row.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';
import { RowRepository } from '../../repositories/row.repository';

export interface ListRowsResult {
  items: Row[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ListRowsUseCase {
  private readonly logger = new Logger(ListRowsUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ListRowsResult> {
    // Step 1-3: Project ownership validation
    const project = await this.projectRepository.findByIdOnly(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    if (project.userId !== userId) {
      this.logger.warn(
        `Unauthorized row access - userId: ${userId}, projectId: ${projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find batch
    const batch = await this.batchRepository.findById(batchId);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    // Step 5: Defense-in-depth - verify batch belongs to project
    if (batch.projectId !== projectId) {
      throw new NotFoundException('Batch not found');
    }

    // Step 6: Get paginated rows (already sorted by sourceRowIndex per Phase 11)
    const result = await this.rowRepository.findByBatchIdPaginated(
      batchId,
      limit,
      offset,
    );

    // Step 7: Add pagination metadata
    return {
      items: result.items,
      total: result.total,
      limit,
      offset,
    };
  }
}
```

### Drizzle Count Query Pattern
```typescript
// Pattern: Dedicated count method for efficiency
// Location: apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts
import { count } from 'drizzle-orm';

public async countByBatchId(batchId: string): Promise<number> {
  const result = await this.drizzle
    .getClient()
    .select({ count: count() })
    .from(ingestionRows)
    .where(
      and(
        eq(ingestionRows.batchId, batchId),
        isNull(ingestionRows.deletedAt),
      ),
    );

  // Drizzle's count() auto-casts bigint to number
  return result[0]?.count ?? 0;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| class-validator DTOs with @Transform decorators | Zod schemas with z.coerce.number() | 2024-2025 | Simpler syntax, runtime type safety, eliminates class-based DTOs |
| Nested pagination metadata (`{ data, meta }`) | Flat pagination envelope (`{ items, total, limit, offset }`) | Project decision (Phase 11-01) | Simpler client parsing, consistent across all endpoints |
| Single query for count and data | Parallel queries with Promise.all() | Drizzle best practice (2024+) | Reduces latency by ~50% for paginated requests |
| Manual `SELECT COUNT(*)` with type casting | Drizzle `count()` function | Drizzle v0.28.0 (2024) | Auto-handles bigint → number casting, prevents runtime errors |
| nestjs-paginate library | Custom pagination with Zod | Project decision | More control, avoids library lock-in, integrates with Zod validation |

**Deprecated/outdated:**
- **class-validator `@IsInt()` + `@Transform()`**: Zod `z.coerce.number().int()` is project standard
- **Interceptor-based pagination wrappers**: Use case layer adds pagination metadata per Phase 11-01 decision
- **`db.$count()` as subquery in SELECT**: Use separate count query in parallel (existing pattern in Phase 11)

## Open Questions

Things that couldn't be fully resolved:

1. **Should batch list endpoint include totalRows for each batch?**
   - What we know: Context decision says "each batch in the list includes totalRows count"
   - What's unclear: Performance impact of N+1 queries (one count per batch in list)
   - Recommendation: Implement as specified in context; if slow, optimize with single query using subquery or window function

2. **Should we add class-transformer for response DTOs?**
   - What we know: Entities include `deletedAt` and `deletedBy` fields that should not be exposed per context
   - What's unclear: Whether to use class-transformer `@Exclude()` or manually construct response objects
   - Recommendation: Start with manual response objects (`{ ...batch, totalRows }`); entities already exclude soft-delete fields in responses since they're filtered out in queries

3. **Should query parameter validation errors use custom format?**
   - What we know: Context says NestJS default format (`{ statusCode, message, error }`); existing ZodValidationPipe uses `{ message, errors: [{ field, message }] }`
   - What's unclear: Whether to change ZodValidationPipe format to match NestJS default
   - Recommendation: Keep existing ZodValidationPipe format (already in use for body validation); both formats have `message` field, acceptable variation

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns:
  - `/Users/luanmartins/source/projects/populatte/apps/api/src/core/use-cases/batch/create-batch.use-case.ts` - Ownership validation pattern
  - `/Users/luanmartins/source/projects/populatte/apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts` - Pagination pattern
  - `/Users/luanmartins/source/projects/populatte/apps/api/src/presentation/pipes/zod-validation.pipe.ts` - Zod validation
  - Phase 11-01 decisions: `PaginatedResult<T>` contract, shared conditions variable, sort orders
- [Drizzle ORM - Count rows](https://orm.drizzle.team/docs/guides/count-rows) - Official count() documentation
- [Zod API Documentation](https://zod.dev/api) - z.coerce.number() official docs

### Secondary (MEDIUM confidence)
- [API Pagination in NestJS: A Comprehensive Guide](https://medium.com/@solomoncodes/api-pagination-in-nestjs-a-comprehensive-guide-25a212f45f08) - Pagination best practices
- [nestjs-zod GitHub](https://github.com/BenLorantfy/nestjs-zod) - Zod + NestJS integration patterns
- [REST API Design Best Practices for Sub and Nested Resources](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Best-Practices-for-Sub-and-Nested-Resources/) - Nested resource patterns
- [Validating numeric query parameters in NestJS](https://dev.to/avantar/validating-numeric-query-parameters-in-nestjs-gk9) - Query param validation
- [Optimizing Drizzle ORM for performance](https://medium.com/drizzle-stories/optimizing-drizzle-orm-for-performance-and-more-importantly-row-reads-again-8a2255a85f56) - Performance best practices

### Tertiary (LOW confidence)
- [Zod Coerce: 5+ Edge Cases with Examples](https://tecktol.com/zod-coerce/) - Coercion edge cases (blog post, not official docs)
- [Parsing a numeric string - Zod Discussion #330](https://github.com/colinhacks/zod/discussions/330) - Community discussion on coercion

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in codebase
- Architecture: HIGH - Patterns extracted from existing Phases 10-11 code
- Pitfalls: MEDIUM - Based on common NestJS/Drizzle issues + codebase patterns

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (30 days - stable domain, framework patterns don't change rapidly)
