# Phase 11: Repository Layer - Research

**Researched:** 2026-01-30
**Domain:** Drizzle ORM pagination, TypeScript type design, Clean Architecture repository patterns
**Confidence:** HIGH

## Summary

Repository pagination with Drizzle ORM requires two separate queries executed in parallel: one for fetching paginated items with limit/offset, and one for counting total matching rows. The standard pattern uses `Promise.all()` to execute both queries concurrently. Soft-delete filtering is applied inline using `isNull(table.deletedAt)` within the `and()` condition builder. TypeScript generics enable type-safe pagination result shapes (`PaginatedResult<T>`). The codebase follows Clean Architecture with abstract repository interfaces in Core and Drizzle implementations in Infrastructure.

**Primary recommendation:** Add `findByBatchIdPaginated()` and `findByProjectIdPaginated()` methods to repository abstracts. Use two-query pattern with `Promise.all()` for count + data. Add `PaginatedResult<T>` type to Core entities. Apply soft-delete filtering inline with `and(conditions, isNull(deletedAt))` across all read methods. Use `desc()` for batch ordering and `asc()` for row ordering imported from `drizzle-orm`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | Current | Type-safe SQL query builder for PostgreSQL | Lightweight, excellent TypeScript support, already in project |
| TypeScript | 5.x | Static typing with generics | Enables `PaginatedResult<T>` pattern for type-safe pagination |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Promise.all | Built-in | Execute count + data queries in parallel | Always for pagination - prevents sequential query latency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two queries | COUNT(*) OVER() in single query | Single query is more complex, less portable, and Drizzle support requires extras field. Two queries with Promise.all is clearer and recommended by community |
| limit/offset | Cursor-based pagination | Cursor pagination is better for infinite scroll and large offsets, but limit/offset is simpler and sufficient for dashboard pagination use case |

**Installation:**
No new dependencies needed - all libraries already in project.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── core/
│   ├── entities/           # Add PaginatedResult<T> here
│   └── repositories/       # Add abstract paginated methods here
└── infrastructure/
    └── database/
        └── drizzle/
            └── repositories/  # Implement paginated methods here
```

### Pattern 1: Two-Query Pagination with Promise.all
**What:** Execute count query and data query in parallel, return combined result
**When to use:** Always for pagination - prevents sequential query latency
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/migrate/migrate-from-sequelize
import { count, eq, isNull, and } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { ingestionRows } from '../drizzle/schema';

public async findByBatchIdPaginated(
  batchId: string,
  limit: number,
  offset: number,
): Promise<PaginatedResult<Row>> {
  const conditions = and(
    eq(ingestionRows.batchId, batchId),
    isNull(ingestionRows.deletedAt)
  );

  const [data, countResult] = await Promise.all([
    this.drizzle
      .getClient()
      .select()
      .from(ingestionRows)
      .where(conditions)
      .orderBy(asc(ingestionRows.sourceRowIndex), asc(ingestionRows.id))
      .limit(limit)
      .offset(offset),
    this.drizzle
      .getClient()
      .select({ count: count() })
      .from(ingestionRows)
      .where(conditions),
  ]);

  const total = countResult[0]?.count ?? 0;
  return {
    items: data.map((row) => RowMapper.toDomain(row)),
    total,
  };
}
```

### Pattern 2: Generic Pagination Result Type
**What:** Type-safe wrapper for paginated responses
**When to use:** All paginated repository methods return this type
**Example:**
```typescript
// Source: Best practices from TypeScript pagination patterns
// Place in: apps/api/src/core/entities/common.types.ts or similar

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
```

### Pattern 3: Inline Soft-Delete Filtering
**What:** Apply `isNull(deletedAt)` inline in each query using `and()` condition builder
**When to use:** All read queries across batches, rows, and projects
**Example:**
```typescript
// Source: Existing codebase pattern from DrizzleBatchRepository
import { and, eq, isNull } from 'drizzle-orm';

// Existing pattern (findById)
public async findById(id: string): Promise<Batch | null> {
  const result = await this.drizzle
    .getClient()
    .select()
    .from(ingestionBatches)
    .where(
      and(eq(ingestionBatches.id, id), isNull(ingestionBatches.deletedAt)),
    )
    .limit(1);

  const row = result[0];
  return row ? BatchMapper.toDomain(row) : null;
}

// Apply same pattern to all existing read methods
```

### Pattern 4: Fixed Ordering
**What:** Use `asc()` and `desc()` from drizzle-orm with `.orderBy()` method
**When to use:** All list queries - rows ordered by sourceRowIndex ASC, batches by createdAt DESC
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/select
import { asc, desc } from 'drizzle-orm';

// Rows: sourceRowIndex ASC, tiebreaker id ASC
.orderBy(asc(ingestionRows.sourceRowIndex), asc(ingestionRows.id))

// Batches: createdAt DESC (newest first)
.orderBy(desc(ingestionBatches.createdAt))
```

### Anti-Patterns to Avoid
- **Single count query after data fetch:** Sequential queries add latency. Always use `Promise.all()`.
- **Omitting soft-delete filter in any read query:** Creates security/consistency issues. All reads must filter `deletedAt IS NULL`.
- **Using `count(*)` raw SQL template:** Drizzle provides `count()` helper that's type-safe and cleaner.
- **Not filtering rows by parent batch soft-delete status:** Rows don't have their own deletedAt, but context says trust caller to verify batch isn't deleted.
- **Ordering without tiebreaker:** Always add `id ASC` as secondary sort when primary sort column (like sourceRowIndex) is not unique.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting with filters | Custom raw SQL with `sql` template | Drizzle `count()` helper | Built-in helper handles casting to number, cleaner syntax, type-safe |
| Parallel query execution | Sequential await | `Promise.all([query1, query2])` | Eliminates sequential latency - essential for pagination performance |
| Ascending/descending order | String literals like `'ASC'` | `asc()` and `desc()` from drizzle-orm | Type-safe, prevents SQL injection, consistent with Drizzle patterns |
| Pagination type shape | Ad-hoc return objects | Generic `PaginatedResult<T>` interface | Reusable, type-safe, standard pattern across all paginated endpoints |

**Key insight:** Drizzle ORM provides complete pagination primitives (limit, offset, count, orderBy). Don't bypass them with raw SQL templates unless absolutely necessary.

## Common Pitfalls

### Pitfall 1: Inconsistent Ordering Without Tiebreaker
**What goes wrong:** Pagination returns duplicate or skipped rows when sorting by non-unique columns (e.g., `sourceRowIndex` alone)
**Why it happens:** Multiple rows with the same sourceRowIndex value can appear in different order across pages if database doesn't guarantee stable sort
**How to avoid:** Always append unique column (e.g., `id ASC`) as secondary sort
**Warning signs:** Integration tests show rows appearing twice across pages, or rows missing from paginated results

### Pitfall 2: Negative or Over-Max Limit/Offset Values
**What goes wrong:** Invalid pagination parameters cause database errors or unexpected behavior
**Why it happens:** Client sends negative offset, offset exceeding int max, limit > 100, or non-numeric values
**How to avoid:** Validate at controller/use-case layer before calling repository. Reject with 400 if `limit < 1`, `limit > 100`, `offset < 0`, or values are non-numeric
**Warning signs:** Database errors from negative offsets, memory issues from limit=999999, or type coercion bugs

### Pitfall 3: Forgetting Soft-Delete Filter in Existing Methods
**What goes wrong:** Soft-deleted records leak into API responses after updating some but not all read methods
**Why it happens:** Developer adds `isNull(deletedAt)` to new paginated methods but forgets to update existing `findById()`, `findByProjectId()`, etc.
**How to avoid:** Audit ALL existing read methods in batch/row/project repositories when implementing this phase. Use grep to find all `.select()` queries and verify each has soft-delete filter.
**Warning signs:** API returns deleted batches/projects, or soft-delete tests fail on existing endpoints

### Pitfall 4: Data Consistency During Pagination
**What goes wrong:** Rows appear twice or skip when data is inserted/deleted between page requests
**Why it happens:** Offset pagination is vulnerable to data shifts - if row 5 is inserted while user is on page 1, page 2 will show duplicate. If row 5 is deleted, page 2 skips row 6.
**How to avoid:** Document this limitation. For critical use cases requiring consistency, consider cursor-based pagination in future milestone. For dashboard MVP, accept this tradeoff.
**Warning signs:** User reports seeing duplicate rows or missing rows when paginating, especially during bulk operations

### Pitfall 5: Separate Queries Without Same WHERE Clause
**What goes wrong:** Count query returns different total than actual filtered data
**Why it happens:** Developer applies different filters to count query vs data query (e.g., forgets soft-delete filter in one)
**How to avoid:** Extract `conditions` variable used by both queries. Pattern: `const conditions = and(eq(...), isNull(...))`; then use same conditions in both `Promise.all()` queries.
**Warning signs:** Pagination metadata shows `total: 100` but only 95 items exist across all pages

## Code Examples

Verified patterns from official sources:

### Count with Drizzle Helper (Preferred)
```typescript
// Source: https://orm.drizzle.team/docs/guides/count-rows
import { count, gt } from 'drizzle-orm';

await db
  .select({ count: count() })
  .from(products)
  .where(gt(products.price, 100));

// Result: [{ count: 42 }]
// count() helper casts to number automatically
```

### Ordering with asc/desc
```typescript
// Source: https://orm.drizzle.team/docs/select
import { asc, desc } from 'drizzle-orm';

// Single field ascending
await db.select().from(users).orderBy(asc(users.name));

// Multiple fields with mixed order
await db.select().from(users).orderBy(asc(users.name), desc(users.createdAt));

// Relational query builder (no imports needed in callback)
await db.query.posts.findMany({
  orderBy: (posts, { asc }) => [asc(posts.id)],
});
```

### Limit and Offset Pagination
```typescript
// Source: https://orm.drizzle.team/docs/guides/limit-offset-pagination
import { asc } from 'drizzle-orm';
import { users } from './schema';

const db = drizzle(...);

await db
  .select()
  .from(users)
  .orderBy(asc(users.id)) // order by is mandatory for consistent pagination
  .limit(4)   // the number of rows to return
  .offset(4); // the number of rows to skip
```

### Two-Query Pagination with Filters
```typescript
// Source: https://orm.drizzle.team/docs/migrate/migrate-from-sequelize
import { ilike, sql } from 'drizzle-orm';
import { db } from '../drizzle/db';
import { products } from '../drizzle/schema';

const whereOptions = ilike(products.name, `%test%`);

const [response, countData] = await Promise.all([
  db
    .select({
      id: products.id,
      name: products.name,
      unitPrice: products.unitPrice,
      unitsInStock: products.unitsInStock,
    })
    .from(products)
    .where(whereOptions)
    .offset(0)
    .limit(10),
  db
    .select({ count: sql<number>`cast(count(${products.id}) as integer)` })
    .from(products)
    .where(whereOptions),
]);

// Note: This example uses sql template for count.
// Modern approach uses count() helper instead (see previous example)
```

### Soft-Delete Filtering Pattern (From Codebase)
```typescript
// Source: apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
import { and, eq, isNull } from 'drizzle-orm';

public async findById(id: string): Promise<Batch | null> {
  const result = await this.drizzle
    .getClient()
    .select()
    .from(ingestionBatches)
    .where(
      and(eq(ingestionBatches.id, id), isNull(ingestionBatches.deletedAt)),
    )
    .limit(1);

  const row = result[0];
  return row ? BatchMapper.toDomain(row) : null;
}

// Pattern: and(mainCondition, isNull(table.deletedAt))
// Apply to ALL read queries in this phase
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw SQL count queries | Drizzle `count()` helper | Drizzle v0.29.1 (2024) | Type-safe aggregation, automatic number casting |
| Sequential count then data | `Promise.all()` for parallel queries | Always recommended | ~50% latency reduction for pagination |
| COUNT(*) OVER() in single query | Two queries with Promise.all | Community consensus 2024-2026 | Simpler, more maintainable, better Drizzle support |
| Global query scopes for soft-delete | Inline `isNull(deletedAt)` per query | Drizzle doesn't support global scopes | Explicit filtering prevents surprises, better for Clean Architecture |

**Deprecated/outdated:**
- Using `sql` template for simple count: Modern Drizzle provides `count()` helper that's cleaner
- Cursor pagination for simple dashboard use cases: Offset pagination is sufficient and simpler for page-based UIs with moderate data sizes

## Open Questions

1. **Should rows inherit soft-delete filtering via JOIN with batches?**
   - What we know: Context says "rows trust caller to verify batch isn't deleted" - no JOIN needed
   - What's unclear: Is this a security risk if use case forgets to check?
   - Recommendation: Document in repository interface that caller MUST verify parent batch is not deleted before calling `findByBatchIdPaginated()`. Add comment in abstract class.

2. **Should pagination type include limit/offset in repository return?**
   - What we know: Context says "repository returns { items, total }, controller adds limit/offset"
   - What's unclear: Is there value in repositories returning a fuller pagination object?
   - Recommendation: Keep repositories minimal per context decision. Controllers/use cases compose the full response shape with limit/offset.

3. **Should we add indexes for pagination queries?**
   - What we know: Offset pagination degrades with high offsets; sourceRowIndex and createdAt are sort columns
   - What's unclear: Do we need composite indexes like `(batchId, deletedAt, sourceRowIndex)` or `(projectId, deletedAt, createdAt)`?
   - Recommendation: Monitor query performance in Phase 12 testing. Add indexes if EXPLAIN ANALYZE shows sequential scans. Likely needed for batches table: `(projectId, deletedAt, createdAt DESC)`.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM - Limit/Offset Pagination](https://orm.drizzle.team/docs/guides/limit-offset-pagination) - Official guide for pagination
- [Drizzle ORM - Select](https://orm.drizzle.team/docs/select) - Ordering, aggregations, limit/offset
- [Drizzle ORM - Migrate from Sequelize](https://orm.drizzle.team/docs/migrate/migrate-from-sequelize) - Two-query pagination pattern with Promise.all
- [Drizzle ORM - Count Rows Guide](https://orm.drizzle.team/docs/guides/count-rows) - count() helper usage
- [Drizzle ORM - Query Utils](https://orm.drizzle.team/docs/query-utils) - $count API (alternative approach)
- Existing codebase: `apps/api/src/infrastructure/database/drizzle/repositories/` - Soft-delete pattern, mapper usage, DrizzleService pattern

### Secondary (MEDIUM confidence)
- [API with NestJS #155. Pagination with Drizzle ORM](https://wanago.io/2024/07/01/api-nestjs-pagination-offset-keyset-drizzle/) - NestJS-specific pagination patterns
- [Repository Pattern in NestJS: Do It Right or Go Home](https://dev.to/adamthedeveloper/repository-pattern-in-nestjs-do-it-right-or-go-home-268f) - Clean Architecture repository best practices
- [Mastering the Repository Pattern in Clean Architecture](https://sazardev.github.io/goca/blog/articles/mastering-repository-pattern) - Pagination in repository layer
- [Mastering Pagination with fetchPaginatedData: A TypeScript Guide](https://medium.com/@ikris/mastering-pagination-with-fetchpaginateddata-a-typescript-guide-364630110f77) - Generic TypeScript pagination types

### Tertiary (LOW confidence)
- [Pagination Done Wrong: How We Lost Data and Confused Users](https://medium.com/@guvencanguven965/pagination-done-wrong-how-we-lost-data-and-confused-users-bb06ad865217) - Real-world pagination pitfalls (2026 article)
- [Understanding the limitations of offset pagination | Zendesk](https://developer.zendesk.com/documentation/api-basics/pagination/understanding-the-limitations-of-offset-pagination/) - Offset pagination edge cases
- [Cascade Delete - EF Core](https://learn.microsoft.com/en-us/ef/core/saving/cascade-delete) - Soft-delete cascade behavior considerations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Drizzle ORM patterns verified via Context7 official docs
- Architecture: HIGH - Two-query pattern is community consensus, existing codebase follows Clean Architecture
- Pitfalls: MEDIUM - Combination of official warnings (ordering consistency) and community experience (data shifts during pagination)

**Research date:** 2026-01-30
**Valid until:** 2026-03-30 (60 days - Drizzle ORM is stable, patterns unlikely to change)
