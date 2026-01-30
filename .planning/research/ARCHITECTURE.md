# Architecture Patterns: Field Inventory Integration

**Domain:** NestJS Clean Architecture integration for Field Inventory features
**Researched:** 2026-01-30
**Confidence:** HIGH

## Recommended Architecture

Field Inventory extends the existing batch detail system with field-level analytics. This is a **subsequent milestone** that integrates with established patterns: Clean Architecture (Core/Infrastructure/Presentation), Drizzle ORM with PostgreSQL JSONB, and the existing batch/row domain model.

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Batch Detail Page (apps/web)                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [View Toggle: Table ⟷ Field Inventory]                        ││
│  │                                                                  ││
│  │  Table View (existing)          Field Inventory (NEW)           ││
│  │  ┌────────────────────┐         ┌─────────────────────────┐    ││
│  │  │ Row-based table    │         │ Field cards grid        │    ││
│  │  │ Dynamic columns    │         │ - Field name            │    ││
│  │  │ Server pagination  │         │ - Type badge            │    ││
│  │  └────────────────────┘         │ - Presence stats        │    ││
│  │                                 │ - Unique count          │    ││
│  │                                 │ [Click → View Values]   │    ││
│  │                                 └─────────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────────┘│
│           │                                   │                      │
│           │                                   │                      │
│  ┌────────▼───────────────────────────────────▼───────────────────┐ │
│  │             React Query Hooks (NEW)                            │ │
│  │  - useFieldStats(projectId, batchId)                           │ │
│  │  - useFieldValues(projectId, batchId, fieldKey)                │ │
│  └────────┬───────────────────────────────────────────────────────┘ │
│           │                                                          │
└───────────┼──────────────────────────────────────────────────────────┘
            │
            │ HTTP (fetch with token)
            │
┌───────────▼──────────────────────────────────────────────────────────┐
│                    NestJS API (Core → Infrastructure → Presentation) │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Presentation Layer (NEW Endpoints)                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ BatchController                                              │   │
│  │  GET /projects/:projectId/batches/:batchId/field-stats      │   │
│  │  GET /projects/:projectId/batches/:batchId/fields/:fieldKey │   │
│  │       /values                                                │   │
│  └────────┬─────────────────────────────────────────────────────┘   │
│           │                                                          │
│  Core Layer (NEW Use Cases)                                          │
│  ┌────────▼─────────────────────────────────────────────────────┐   │
│  │ GetFieldStatsUseCase                                         │   │
│  │  - Ownership validation (project → batch chain)             │   │
│  │  - Delegates to RowRepository.getFieldStats()               │   │
│  │  - Optional: type inference from sample values              │   │
│  │                                                              │   │
│  │ GetFieldValuesUseCase                                        │   │
│  │  - Ownership validation (project → batch chain)             │   │
│  │  - Delegates to RowRepository.getFieldValues()              │   │
│  │  - Returns distinct values sorted                           │   │
│  └────────┬─────────────────────────────────────────────────────┘   │
│           │                                                          │
│  Core Layer (MODIFIED Repository Interface)                          │
│  ┌────────▼─────────────────────────────────────────────────────┐   │
│  │ RowRepository (abstract class)                               │   │
│  │  createMany()                   ← existing                   │   │
│  │  findByBatchId()                ← existing                   │   │
│  │  findByBatchIdPaginated()       ← existing                   │   │
│  │  countByBatchId()               ← existing                   │   │
│  │  getFieldStats(batchId)         ← NEW                        │   │
│  │  getFieldValues(batchId, key)   ← NEW                        │   │
│  └────────┬─────────────────────────────────────────────────────┘   │
│           │                                                          │
│  Infrastructure Layer (MODIFIED Drizzle Implementation)              │
│  ┌────────▼─────────────────────────────────────────────────────┐   │
│  │ DrizzleRowRepository                                         │   │
│  │  getFieldStats():                                            │   │
│  │    - Raw SQL via sql`` template tag                          │   │
│  │    - jsonb_object_keys() to list all keys                    │   │
│  │    - COUNT(CASE WHEN data ? key) for presence                │   │
│  │    - COUNT(DISTINCT data->>key) for unique values            │   │
│  │    - Single query with LATERAL join                          │   │
│  │                                                              │   │
│  │  getFieldValues():                                           │   │
│  │    - Raw SQL via sql`` template tag                          │   │
│  │    - data->>key extraction with WHERE data ? key             │   │
│  │    - DISTINCT + ORDER BY for sorted unique values            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Critical Integration Points

**1. JSONB Querying Strategy**

PostgreSQL JSONB operators used via Drizzle `sql` template tag:
- `jsonb_object_keys(data)` → extract all keys across rows
- `data ? 'key'` → presence check (key exists in JSONB object)
- `data ->> 'key'` → extract value as text
- `COUNT(CASE WHEN ...)` → conditional counting
- `COUNT(DISTINCT ...)` → unique value counting

**2. Existing Ownership Validation Pattern**

Follow the established 5-step pattern from existing use cases:
```
Step 1: findByIdOnly(projectId) WITHOUT userId filter
Step 2: Check project.deletedAt → 404 if archived
Step 3: Validate project.userId === userId → 403 if unauthorized (with security log)
Step 4: findById(batchId) → 404 if not found
Step 5: Defense-in-depth → verify batch.projectId === projectId
```

New use cases (GetFieldStatsUseCase, GetFieldValuesUseCase) implement this pattern identically to ListRowsUseCase.

**3. Repository Layer Responsibility**

Following Clean Architecture principles, raw SQL aggregations belong in Infrastructure, not Core:
- **Core (RowRepository interface):** Declares `getFieldStats()` and `getFieldValues()` as abstract methods returning domain types
- **Infrastructure (DrizzleRowRepository):** Implements methods with PostgreSQL-specific JSONB queries via `sql` template tag
- **Use Case:** Delegates to repository, handles ownership validation, returns results

**4. Type Inference Placement**

**Decision:** Type inference lives in **Use Case layer** as application-specific business logic.

**Rationale:**
- Type inference requires domain knowledge (e.g., "123.456.789-00" → CPF, "01/01/2024" → date)
- Repository focuses on data access (what values exist), not interpretation (what values mean)
- Use Case orchestrates: fetch sample values → apply heuristics → enrich field stats

**Implementation:**
```typescript
// Core layer: Use Case
export class GetFieldStatsUseCase {
  constructor(
    private rowRepository: RowRepository,
    private typeInferenceService: TypeInferenceService // NEW utility service
  ) {}

  async execute(projectId, batchId, userId): Promise<FieldStats[]> {
    // Ownership validation (steps 1-5)...

    // Get field stats from repository (counts only)
    const stats = await this.rowRepository.getFieldStats(batchId);

    // Enrich with type inference (application logic)
    return Promise.all(
      stats.map(async (stat) => ({
        ...stat,
        inferredType: await this.typeInferenceService.infer(
          batchId,
          stat.fieldKey,
          stat.sampleValues // Repository includes sample values for inference
        ),
      }))
    );
  }
}
```

## Component Structure

### New Components (Backend)

| Component | Location | Responsibility |
|-----------|----------|---------------|
| **GetFieldStatsUseCase** | `src/core/use-cases/batch/get-field-stats.use-case.ts` | Ownership validation, orchestrate stats + type inference |
| **GetFieldValuesUseCase** | `src/core/use-cases/batch/get-field-values.use-case.ts` | Ownership validation, delegate to repository |
| **TypeInferenceService** | `src/core/services/type-inference.service.ts` | Heuristic-based type detection from sample values |
| **RowRepository.getFieldStats()** | `src/core/repositories/row.repository.ts` | Abstract method declaration (interface) |
| **RowRepository.getFieldValues()** | `src/core/repositories/row.repository.ts` | Abstract method declaration (interface) |
| **DrizzleRowRepository.getFieldStats()** | `src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` | Raw SQL implementation (JSONB aggregation) |
| **DrizzleRowRepository.getFieldValues()** | `src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` | Raw SQL implementation (JSONB extraction) |
| **BatchController endpoints** | `src/presentation/controllers/batch.controller.ts` | HTTP handlers (add 2 new endpoints) |
| **DTO schemas** | `src/presentation/dto/batch.dto.ts` | Response type definitions with Zod |

### Modified Components

| Component | Modification Type | Changes |
|-----------|------------------|---------|
| **RowRepository** | Interface extension | Add 2 abstract methods |
| **DrizzleRowRepository** | Implementation | Add 2 concrete methods with raw SQL |
| **BatchController** | New routes | Add 2 GET endpoints |
| **batch.dto.ts** | Schema additions | Add FieldStats and FieldValues response schemas |
| **batch/index.ts** | Export additions | Export new use cases |

### New Components (Frontend)

| Component | Location | Responsibility |
|-----------|----------|---------------|
| **useFieldStats hook** | `apps/web/lib/query/hooks/use-batches.ts` | React Query hook for field stats |
| **useFieldValues hook** | `apps/web/lib/query/hooks/use-batches.ts` | React Query hook for field values |
| **field-inventory-grid.tsx** | `apps/web/components/batches/` | Grid layout for field cards |
| **field-card.tsx** | `apps/web/components/batches/` | Individual field card with stats |
| **view-values-sheet.tsx** | `apps/web/components/batches/` | Side sheet with all values for one field |
| **view-toggle.tsx** | `apps/web/components/batches/` | Table ⟷ Field Inventory toggle |
| **fieldStatsSchema** | `apps/web/lib/api/schemas/batch.schema.ts` | Zod schema for field stats response |
| **fieldValuesSchema** | `apps/web/lib/api/schemas/batch.schema.ts` | Zod schema for field values response |

## Data Flow Patterns

### Pattern 1: Field Stats Query (Single Aggregation)

**Flow:**
```
1. Client: useFieldStats(projectId, batchId)
2. API Client: GET /projects/:projectId/batches/:batchId/field-stats
3. Controller: Extract params, delegate to GetFieldStatsUseCase
4. Use Case: Ownership validation (5 steps)
5. Use Case: await rowRepository.getFieldStats(batchId)
6. Repository: Execute raw SQL with JSONB aggregation
7. Repository: Return FieldStats[]
8. Use Case: For each field, call typeInferenceService.infer()
9. Use Case: Return enriched FieldStats[]
10. Controller: Return JSON response
11. React Query: Cache with key ['projects', projectId, 'batches', batchId, 'field-stats']
12. Component: Render field cards
```

**SQL Pattern (Repository Layer):**
```sql
-- Single query using LATERAL join for per-field stats
SELECT
  key AS field_key,
  COUNT(*) FILTER (WHERE r.data ? key) AS presence_count,
  COUNT(DISTINCT r.data->>key) FILTER (WHERE r.data ? key) AS unique_count,
  -- Sample 5 values for type inference
  ARRAY_AGG(DISTINCT r.data->>key ORDER BY r.data->>key LIMIT 5) AS sample_values
FROM ingestion_rows r
CROSS JOIN LATERAL jsonb_object_keys(r.data) AS key
WHERE r.batch_id = $1 AND r.deleted_at IS NULL
GROUP BY key
ORDER BY key;
```

**Performance:** Single query, scales linearly with row count × field count. For 10K rows × 20 fields = ~1-2 seconds.

### Pattern 2: Field Values Query (Distinct Extraction)

**Flow:**
```
1. User clicks field card
2. Client: useFieldValues(projectId, batchId, fieldKey)
3. API Client: GET /projects/:projectId/batches/:batchId/fields/:fieldKey/values
4. Controller: Extract params, delegate to GetFieldValuesUseCase
5. Use Case: Ownership validation (5 steps)
6. Use Case: await rowRepository.getFieldValues(batchId, fieldKey)
7. Repository: Execute raw SQL with JSONB extraction
8. Repository: Return string[]
9. Use Case: Return values
10. Controller: Return JSON response
11. React Query: Cache with key ['projects', projectId, 'batches', batchId, 'fields', fieldKey, 'values']
12. Component: Render side sheet with value list
```

**SQL Pattern (Repository Layer):**
```sql
SELECT DISTINCT r.data->>$2 AS value
FROM ingestion_rows r
WHERE r.batch_id = $1
  AND r.deleted_at IS NULL
  AND r.data ? $2  -- Only rows where key exists
  AND r.data->>$2 IS NOT NULL  -- Exclude null values
ORDER BY value;
```

**Performance:** Single query, DISTINCT scales with unique values (typically < 1000). Sub-second for most fields.

### Pattern 3: Type Inference (Application Logic)

**Heuristic-based inference:**
```typescript
// src/core/services/type-inference.service.ts
@Injectable()
export class TypeInferenceService {
  infer(batchId: string, fieldKey: string, sampleValues: string[]): string {
    // Sample first 5 values from repository
    const samples = sampleValues.filter(v => v !== null && v !== '');

    if (samples.length === 0) return 'empty';

    // Apply heuristics in priority order
    if (this.isEmail(samples)) return 'email';
    if (this.isPhone(samples)) return 'phone';
    if (this.isCPF(samples)) return 'cpf';
    if (this.isCNPJ(samples)) return 'cnpj';
    if (this.isDate(samples)) return 'date';
    if (this.isBoolean(samples)) return 'boolean';
    if (this.isNumber(samples)) return 'number';

    return 'text'; // Default fallback
  }

  private isEmail(samples: string[]): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return samples.every(s => emailRegex.test(s));
  }

  // ... other heuristics
}
```

**Rationale:**
- Domain-specific patterns (CPF, CNPJ) recognized
- Sampling prevents full table scan (5 values sufficient)
- Use Case orchestrates: stats query includes sample_values, service infers type

## Integration with Existing Components

### 1. BatchController Route Ordering

**CRITICAL:** Add new routes in correct order to prevent NestJS path conflicts.

**Current routes (from batch.controller.ts):**
```typescript
@Post()                    // POST /projects/:projectId/batches
@Get()                     // GET  /projects/:projectId/batches
@Get(':batchId')           // GET  /projects/:projectId/batches/:batchId
@Get(':batchId/rows')      // GET  /projects/:projectId/batches/:batchId/rows
```

**New routes (add AFTER existing):**
```typescript
@Get(':batchId/field-stats')              // NEW
@Get(':batchId/fields/:fieldKey/values')  // NEW
```

**Why this order:** More specific routes BEFORE less specific. NestJS matches top-to-bottom, so `/field-stats` must come before `/:batchId` to avoid `:batchId` matching "field-stats".

**Corrected final order:**
```typescript
@Post()                                   // POST /projects/:projectId/batches
@Get()                                    // GET  /projects/:projectId/batches
@Get(':batchId/field-stats')              // NEW (specific route first)
@Get(':batchId/fields/:fieldKey/values')  // NEW (specific route first)
@Get(':batchId/rows')                     // Existing (specific route)
@Get(':batchId')                          // Existing (catch-all last)
```

### 2. Repository Extension Pattern

**Follow existing pattern:** Add new methods to abstract class, implement in Drizzle repository.

**Core layer (row.repository.ts):**
```typescript
export abstract class RowRepository {
  public abstract createMany(data: CreateRowData[]): Promise<void>;
  public abstract findByBatchId(batchId: string): Promise<Row[]>;
  public abstract findByBatchIdPaginated(
    batchId: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<Row>>;
  public abstract countByBatchId(batchId: string): Promise<number>;

  // NEW: Field-level queries
  public abstract getFieldStats(batchId: string): Promise<FieldStats[]>;
  public abstract getFieldValues(
    batchId: string,
    fieldKey: string,
  ): Promise<string[]>;
}
```

**Infrastructure layer (drizzle-row.repository.ts):**
```typescript
export class DrizzleRowRepository extends RowRepository {
  // Existing methods...

  public async getFieldStats(batchId: string): Promise<FieldStats[]> {
    const result = await this.drizzle.getClient().execute<FieldStatsRaw>(sql`
      SELECT
        key AS field_key,
        COUNT(*) FILTER (WHERE r.data ? key) AS presence_count,
        COUNT(DISTINCT r.data->>key) FILTER (WHERE r.data ? key) AS unique_count,
        ARRAY_AGG(DISTINCT r.data->>key ORDER BY r.data->>key LIMIT 5) AS sample_values
      FROM ${ingestionRows} r
      CROSS JOIN LATERAL jsonb_object_keys(r.data) AS key
      WHERE r.batch_id = ${batchId} AND r.deleted_at IS NULL
      GROUP BY key
      ORDER BY key
    `);

    return result.rows.map(row => ({
      fieldKey: row.field_key,
      presenceCount: Number(row.presence_count),
      uniqueCount: Number(row.unique_count),
      sampleValues: row.sample_values || [],
    }));
  }

  public async getFieldValues(
    batchId: string,
    fieldKey: string,
  ): Promise<string[]> {
    const result = await this.drizzle.getClient().execute<{ value: string }>(sql`
      SELECT DISTINCT r.data->>${fieldKey} AS value
      FROM ${ingestionRows} r
      WHERE r.batch_id = ${batchId}
        AND r.deleted_at IS NULL
        AND r.data ? ${fieldKey}
        AND r.data->>${fieldKey} IS NOT NULL
      ORDER BY value
    `);

    return result.rows.map(row => row.value);
  }
}
```

**Key points:**
- Use `sql` template tag from `drizzle-orm`
- Reference schema with `${ingestionRows}` for table identifier
- Use `${}` for parameterized values (prevents SQL injection)
- Return domain types (FieldStats[], string[]), not raw DB rows

### 3. Use Case Ownership Validation Pattern

**Follow existing pattern from ListRowsUseCase:**

```typescript
// src/core/use-cases/batch/get-field-stats.use-case.ts
@Injectable()
export class GetFieldStatsUseCase {
  private readonly logger = new Logger(GetFieldStatsUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
    private readonly typeInferenceService: TypeInferenceService,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
  ): Promise<FieldStatsResult[]> {
    // Step 1: Find project WITHOUT userId filter (enables separate 404/403)
    const project = await this.projectRepository.findByIdOnly(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 2: Check if soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 3: Validate ownership (403 with security audit log)
    if (project.userId !== userId) {
      this.logger.warn(
        `Unauthorized field stats access attempt - userId: ${userId}, projectId: ${projectId}`,
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

    // Step 6: Get field stats from repository
    const stats = await this.rowRepository.getFieldStats(batchId);

    // Step 7: Enrich with type inference
    const enriched = await Promise.all(
      stats.map(async (stat) => ({
        fieldKey: stat.fieldKey,
        presenceCount: stat.presenceCount,
        uniqueCount: stat.uniqueCount,
        inferredType: this.typeInferenceService.infer(
          batchId,
          stat.fieldKey,
          stat.sampleValues,
        ),
      })),
    );

    // Step 8: Return enriched results
    return enriched;
  }
}
```

**GetFieldValuesUseCase follows same pattern, omitting type inference (steps 1-6, then return).**

### 4. Frontend View Toggle Integration

**Batch Detail Page State Management:**

```typescript
// apps/web/app/(platform)/projects/[id]/batches/[batchId]/page.tsx
'use client';

import { useState } from 'react';
import { ViewToggle } from '@/components/batches/view-toggle';
import { BatchDataTable } from '@/components/batches/batch-data-table';
import { FieldInventoryGrid } from '@/components/batches/field-inventory-grid';

export default function BatchDetailPage() {
  const params = useParams<{ id: string; batchId: string }>();
  const projectId = params.id;
  const batchId = params.batchId;

  const { data: batch } = useBatch(projectId, batchId);

  // Default view based on mode
  const defaultView = batch?.mode === 'PROFILE_MODE' ? 'fields' : 'table';
  const [view, setView] = useState<'table' | 'fields'>(defaultView);

  // Pagination for table view
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

  return (
    <main className="w-full">
      <AppHeader title="Batch Detail">
        <ViewToggle view={view} onViewChange={setView} />
      </AppHeader>

      {view === 'table' ? (
        <BatchDataTable
          batch={batch}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      ) : (
        <FieldInventoryGrid projectId={projectId} batchId={batchId} />
      )}
    </main>
  );
}
```

**React Query Hooks:**

```typescript
// apps/web/lib/query/hooks/use-batches.ts

export function useFieldStats(projectId: string, batchId: string) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<FieldStatsResponse>({
    queryKey: ['projects', projectId, 'batches', batchId, 'field-stats'],
    queryFn: () => endpoints.getFieldStats(projectId, batchId),
    enabled: !!projectId && !!batchId,
  });
}

export function useFieldValues(
  projectId: string,
  batchId: string,
  fieldKey: string | null, // null when sheet closed
) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<FieldValuesResponse>({
    queryKey: ['projects', projectId, 'batches', batchId, 'fields', fieldKey, 'values'],
    queryFn: () => endpoints.getFieldValues(projectId, batchId, fieldKey!),
    enabled: !!projectId && !!batchId && !!fieldKey,
  });
}
```

## Patterns to Follow

### Pattern 1: Single Aggregation Query

**Use LATERAL join for per-field stats in one query:**

```sql
-- ONE query replaces N+1 field queries
SELECT
  key AS field_key,
  COUNT(*) FILTER (WHERE r.data ? key) AS presence_count,
  COUNT(DISTINCT r.data->>key) FILTER (WHERE r.data ? key) AS unique_count
FROM ingestion_rows r
CROSS JOIN LATERAL jsonb_object_keys(r.data) AS key
WHERE r.batch_id = $1 AND r.deleted_at IS NULL
GROUP BY key;
```

**Why:** Prevents N+1 problem. Single query returns all fields with stats.

**Performance:** 10K rows × 20 fields = ~1-2 seconds (acceptable for analytics query).

### Pattern 2: Type Inference from Samples

**Use ARRAY_AGG LIMIT in SQL, not full-table scan:**

```sql
SELECT
  key AS field_key,
  -- Sample 5 values for type inference
  ARRAY_AGG(DISTINCT r.data->>key ORDER BY r.data->>key LIMIT 5) AS sample_values
FROM ingestion_rows r
CROSS JOIN LATERAL jsonb_object_keys(r.data) AS key
WHERE r.batch_id = $1 AND r.deleted_at IS NULL
GROUP BY key;
```

**Why:** 5 values sufficient for heuristic inference (CPF pattern, email format, etc.). Avoids memory overhead of returning all values.

### Pattern 3: Presence Filtering

**Use PostgreSQL `?` operator for key existence:**

```sql
WHERE r.data ? $2  -- Only rows where key exists
```

**Why:** JSONB keys may exist in some rows but not others (LIST_MODE with inconsistent columns). Prevents counting null as presence.

### Pattern 4: Drizzle `sql` Template Tag

**Use template tag for raw SQL, embed schema references:**

```typescript
import { sql } from 'drizzle-orm';
import { ingestionRows } from '../schema';

await this.drizzle.getClient().execute(sql`
  SELECT key
  FROM ${ingestionRows} r  -- Table identifier from schema
  WHERE r.batch_id = ${batchId}  -- Parameterized value
`);
```

**Why:** Prevents SQL injection via parameterization, maintains Drizzle type system.

## Anti-Patterns to Avoid

### Anti-Pattern 1: N+1 Field Queries

**What goes wrong:** Loop through fields, query stats for each individually.

```typescript
// ❌ WRONG
const fields = await getFieldKeys(batchId); // Query 1
const stats = [];
for (const field of fields) {
  const count = await countFieldPresence(batchId, field); // Query 2, 3, 4...
  stats.push({ field, count });
}
```

**Why bad:** 20 fields = 21 queries. Slow, high database load.

**Instead:** Use LATERAL join to get all field stats in ONE query.

### Anti-Pattern 2: Full-Table Type Inference

**What goes wrong:** Fetch all values to infer type.

```typescript
// ❌ WRONG
const allValues = await getFieldValues(batchId, fieldKey); // 10K values
const type = inferType(allValues); // Analyze 10K values
```

**Why bad:** 10K values × 20 fields = 200K values in memory. Slow, wasteful.

**Instead:** Sample 5 values in SQL with `LIMIT 5`, infer from samples.

### Anti-Pattern 3: Type Inference in Repository

**What goes wrong:** Repository method infers types, not just fetches data.

```typescript
// ❌ WRONG (Repository doing application logic)
export class DrizzleRowRepository {
  async getFieldStats(batchId: string): Promise<FieldStats[]> {
    const rawStats = await this.query(...);

    // Type inference in repository layer violates Clean Architecture
    return rawStats.map(stat => ({
      ...stat,
      inferredType: this.detectType(stat.sampleValues), // Application logic in Infrastructure!
    }));
  }
}
```

**Why bad:** Repository contains application logic (type detection heuristics). Violates separation of concerns.

**Instead:** Repository returns raw stats with samples. Use Case orchestrates type inference via dedicated service.

### Anti-Pattern 4: Client-Side Field Stats Computation

**What goes wrong:** Fetch all rows to client, compute stats in JavaScript.

```typescript
// ❌ WRONG
const allRows = await useBatchRows(projectId, batchId, 999999, 0); // Fetch all
const stats = computeStatsClientSide(allRows); // JS aggregation
```

**Why bad:** 10K rows downloaded to browser, slow initial load, memory issues.

**Instead:** Server-side SQL aggregation with dedicated endpoint.

## Scalability Considerations

| Concern | At 100 rows | At 10K rows | At 1M rows |
|---------|-------------|-------------|------------|
| **Field stats query** | Sub-second | 1-2 seconds | 10-30 seconds (consider GIN index on `data` column) |
| **Field values query** | Sub-second | Sub-second (if DISTINCT < 1000) | 1-5 seconds (consider index on specific keys) |
| **Type inference** | Instant (sample-based) | Instant (sample-based) | Instant (sample-based) |
| **Field count** | All fields loaded | All fields loaded | Paginate field list if > 100 fields |
| **Memory** | Negligible | < 10MB per query | Consider streaming response |

**Current implementation targets:** 10K rows per batch, 20-50 fields. No optimization needed yet.

**Future optimizations:**
- Add GIN index on `data` column: `CREATE INDEX idx_rows_data_gin ON ingestion_rows USING GIN (data);`
- Add expression index for frequently queried keys: `CREATE INDEX idx_rows_cpf ON ingestion_rows ((data->>'cpf'));`
- Paginate field list if batches consistently have > 100 fields
- Cache field stats with TTL (stats rarely change after batch completion)

## Build Order (Recommended Implementation Sequence)

### Phase 1: Backend Foundation

**Goal:** Field stats endpoint functional, testable via HTTP client.

1. **Add FieldStats types to Core:**
   - `src/core/entities/field-stats.types.ts` (FieldStats interface)
   - Export in `src/core/entities/index.ts`

2. **Create TypeInferenceService:**
   - `src/core/services/type-inference.service.ts` (heuristic-based inference)
   - Add to CoreModule providers

3. **Extend RowRepository interface:**
   - Add `getFieldStats(batchId)` abstract method to `src/core/repositories/row.repository.ts`

4. **Implement in DrizzleRowRepository:**
   - Add `getFieldStats()` method with raw SQL (LATERAL join pattern)
   - Test SQL directly in Drizzle Studio or psql

5. **Create GetFieldStatsUseCase:**
   - `src/core/use-cases/batch/get-field-stats.use-case.ts`
   - Implement 5-step ownership validation (copy from ListRowsUseCase)
   - Delegate to repository, enrich with type inference
   - Export in `src/core/use-cases/batch/index.ts`

6. **Add BatchController endpoint:**
   - Add `@Get(':batchId/field-stats')` handler
   - Inject GetFieldStatsUseCase
   - Add route BEFORE `@Get(':batchId')` to prevent conflicts

7. **Add DTO schema:**
   - `src/presentation/dto/batch.dto.ts`: fieldStatsResponseSchema with Zod

**Test:** `GET /projects/{id}/batches/{batchId}/field-stats` returns stats array.

### Phase 2: Field Values Endpoint

**Goal:** Field values endpoint functional.

8. **Extend RowRepository interface:**
   - Add `getFieldValues(batchId, fieldKey)` abstract method

9. **Implement in DrizzleRowRepository:**
   - Add `getFieldValues()` method with raw SQL (DISTINCT + ORDER BY pattern)

10. **Create GetFieldValuesUseCase:**
    - `src/core/use-cases/batch/get-field-values.use-case.ts`
    - Same ownership validation pattern
    - Delegate to repository (no type inference needed)

11. **Add BatchController endpoint:**
    - Add `@Get(':batchId/fields/:fieldKey/values')` handler
    - Inject GetFieldValuesUseCase

12. **Add DTO schema:**
    - `src/presentation/dto/batch.dto.ts`: fieldValuesResponseSchema with Zod

**Test:** `GET /projects/{id}/batches/{batchId}/fields/cpf/values` returns distinct values.

### Phase 3: Frontend Integration

**Goal:** Field Inventory view visible, data fetching works.

13. **Add Zod schemas (frontend):**
    - `apps/web/lib/api/schemas/batch.schema.ts`: fieldStatsSchema, fieldValuesSchema

14. **Extend batch endpoints factory:**
    - `apps/web/lib/api/endpoints/batches.ts`: add `getFieldStats()`, `getFieldValues()` methods

15. **Create React Query hooks:**
    - `apps/web/lib/query/hooks/use-batches.ts`: add `useFieldStats()`, `useFieldValues()`

16. **Create FieldCard component:**
    - `apps/web/components/batches/field-card.tsx`
    - Display: field name, type badge, presence stats, unique count
    - Click handler to open side sheet

17. **Create FieldInventoryGrid component:**
    - `apps/web/components/batches/field-inventory-grid.tsx`
    - Fetch stats with `useFieldStats()`
    - Render grid of FieldCard components

18. **Add ViewToggle component:**
    - `apps/web/components/batches/view-toggle.tsx`
    - Segmented control: Table | Field Inventory

19. **Integrate into Batch Detail Page:**
    - Modify `apps/web/app/(platform)/projects/[id]/batches/[batchId]/page.tsx`
    - Add view state with default based on batch mode
    - Conditional render: table vs field inventory

**Test:** Navigate to batch detail, toggle to Field Inventory view, see field cards.

### Phase 4: View Values Side Sheet

**Goal:** Click field card → side sheet opens with all values.

20. **Create ViewValuesSheet component:**
    - `apps/web/components/batches/view-values-sheet.tsx`
    - Sheet with field name header, searchable value list
    - Fetch values with `useFieldValues(projectId, batchId, fieldKey)`
    - Enable query only when fieldKey is non-null (sheet open)

21. **Wire up FieldCard click handler:**
    - FieldCard onClick sets selectedField state
    - ViewValuesSheet controlled by selectedField !== null

**Test:** Click field card, side sheet opens, shows all values for that field.

### Phase 5: Polish

**Goal:** UX edge cases handled.

22. **Add loading states:**
    - Skeleton loaders for field cards while fetching stats
    - Loading indicator in side sheet while fetching values

23. **Add empty states:**
    - "No fields found" for batches with 0 rows
    - "No values" for fields with all nulls

24. **Add search in side sheet:**
    - Client-side filtering of values array with input debouncing

25. **Add copy button:**
    - Copy all values to clipboard (newline-separated)

26. **Add error handling:**
    - Toast on query error
    - Retry button for failed queries

**Test:** Manual QA for loading, empty, error states.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **JSONB Querying** | HIGH | PostgreSQL JSONB operators documented, Drizzle `sql` pattern verified |
| **Repository Extension** | HIGH | Existing pattern established (RowRepository abstract class → Drizzle implementation) |
| **Ownership Validation** | HIGH | Exact pattern copy from ListRowsUseCase (5-step validation) |
| **Type Inference Placement** | MEDIUM | Use Case layer is correct per Clean Architecture, but heuristic quality needs validation |
| **SQL Performance** | MEDIUM | LATERAL join scales linearly, but GIN index may be needed at 100K+ rows |
| **Route Ordering** | HIGH | NestJS route specificity rules verified, order critical for correct matching |
| **Frontend Integration** | HIGH | Existing patterns (React Query hooks, endpoint factory) well-established |

## Gaps to Address

1. **Type Inference Heuristics:** Sample-based inference may misclassify edge cases (e.g., numeric strings like ZIP codes classified as numbers). Needs testing with real data.

2. **GIN Index Performance:** No benchmark for JSONB aggregation on large batches. May need index tuning if field stats query exceeds 5 seconds at scale.

3. **Field Cardinality Handling:** Endpoint assumes reasonable field count (< 100 fields per batch). Profile mode with sparse keys could generate 1000+ fields. May need pagination.

4. **Value Cardinality Handling:** Field values endpoint assumes reasonable unique count (< 10K distinct values). High-cardinality fields (e.g., free-text comments) could return 100K+ values. May need pagination or limit.

## Sources

**PostgreSQL JSONB Documentation:**
- [How to Query a JSON Column in PostgreSQL - PopSQL](https://popsql.com/learn-sql/postgresql/how-to-query-a-json-column-in-postgresql)
- [PostgreSQL JSON Extract Operators - Neon](https://neon.com/postgresql/postgresql-json-functions/postgresql-json-extract)
- [PostgreSQL jsonb_object_keys() Function - Neon](https://neon.com/postgresql/postgresql-json-functions/postgresql-jsonb_object_keys)

**PostgreSQL JSONB Performance:**
- [PostgreSQL JSONB - Powerful Storage for Semi-Structured Data](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage)
- [Postgres JSONB Usage and Performance Analysis - Medium](https://medium.com/geekculture/postgres-jsonb-usage-and-performance-analysis-cdbd1242a018)

**Drizzle ORM Raw SQL:**
- [Drizzle ORM - Query Documentation](https://orm.drizzle.team/docs/rqb-v2)
- [Best way to query jsonb field - Drizzle Team](https://www.answeroverflow.com/m/1188144616541802506)
- [Custom SQL function (json_agg & json_build_object) - Drizzle Team](https://www.answeroverflow.com/m/1091675515565387867)

**Clean Architecture Use Cases:**
- [Clean Architecture: Use Cases - Nanosoft](https://nanosoft.co.za/blog/post/clean-architecture-use-cases)
- [Building Your First Use Case With Clean Architecture - Milan Jovanovic](https://www.milanjovanovic.tech/blog/building-your-first-use-case-with-clean-architecture)
- [Domain Layer - Android Developers](https://developer.android.com/topic/architecture/domain-layer)

**Existing Codebase:**
- `apps/api/src/core/entities/batch.entity.ts` (domain model reference)
- `apps/api/src/core/entities/row.entity.ts` (JSONB data structure)
- `apps/api/src/core/repositories/row.repository.ts` (repository interface pattern)
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-row.repository.ts` (Drizzle implementation)
- `apps/api/src/core/use-cases/batch/list-rows.use-case.ts` (ownership validation pattern)
- `apps/api/src/presentation/controllers/batch.controller.ts` (route ordering reference)
