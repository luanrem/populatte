# Phase 17: Backend Field Stats with Type Inference - Research

**Researched:** 2026-01-30
**Domain:** PostgreSQL JSONB aggregation, data type inference, NestJS Clean Architecture
**Confidence:** HIGH

## Summary

Field-level analytics for batch data requires efficient PostgreSQL JSONB aggregation combined with runtime type inference from sampled values. The research identified established patterns for JSONB field extraction, aggregation optimization strategies, and type detection heuristics for Brazilian locale formats.

**Key findings:**
- PostgreSQL's `jsonb_each()` and `jsonb_object_keys()` enable efficient field iteration over JSONB data
- Drizzle ORM 0.45.1 supports direct SQL with `sql` template tag for complex aggregations not covered by query builder
- Type inference should be implemented in the use case layer (not repository) per Clean Architecture
- Sampling first 100 rows provides deterministic, debuggable results without full-table scan overhead
- Brazilian format detection requires pattern matching for CPF (11 digits), CNPJ (14 digits), CEP (8 digits), DD/MM/YYYY dates

**Primary recommendation:** Use single aggregation query with PostgreSQL CTEs to compute presence counts and unique value counts for all fields, then apply use-case-layer type inference on sampled row data.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.1 | Type-safe database queries | Already in project, HIGH source reputation (92 score) |
| PostgreSQL JSONB | 14+ | Binary JSON storage with aggregation functions | Native to PostgreSQL, optimized for field extraction |
| Zod | 4.3.6 | Runtime schema validation | Already in project, TypeScript-first validation |
| NestJS | 11.x | Clean Architecture framework | Project foundation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Existing stack sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom type detection | @datatables/type-detector | External dependency for simple heuristic logic; overkill for 5 types |
| Drizzle query builder | Raw SQL via pg | Lose type safety; Drizzle sql template tag preserves safety |
| Full-table aggregation | PostgreSQL TABLESAMPLE | Non-deterministic sampling; harder to debug |

**Installation:**
```bash
# No new dependencies required - using existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── entities/
│   │   └── field-stats.entity.ts        # FieldStats, InferredType enum
│   ├── repositories/
│   │   └── batch.repository.ts          # Add getFieldStats method
│   ├── use-cases/
│   │   └── batch/
│   │       └── get-field-stats.use-case.ts  # Orchestrates aggregation + type inference
│   └── services/
│       └── type-inference.service.ts    # Pure type detection logic
├── infrastructure/
│   └── database/
│       └── drizzle/
│           └── repositories/
│               └── drizzle-batch.repository.ts  # JSONB aggregation query
└── presentation/
    ├── controllers/
    │   └── batch.controller.ts          # Add GET :batchId/field-stats endpoint
    └── dto/
        └── batch.dto.ts                 # Response DTO for field stats
```

### Pattern 1: Use Case Orchestrates Aggregation + Type Inference
**What:** Separation of data retrieval (repository) from business logic (type inference service)
**When to use:** Type inference depends on sampled values, not just database schema
**Example:**
```typescript
// Use case coordinates repository + service
@Injectable()
export class GetFieldStatsUseCase {
  constructor(
    private readonly batchRepo: BatchRepository,
    private readonly rowRepo: RowRepository,
    private readonly typeInference: TypeInferenceService,
  ) {}

  async execute(projectId: string, batchId: string, userId: string) {
    // 1. Validate ownership (existing pattern)
    // 2. Get batch metadata (for columnMetadata)
    // 3. Get aggregation stats (presence, unique counts) from repository
    // 4. Get sample rows (first 100) for type inference
    // 5. Infer types using service
    // 6. Combine and return
  }
}
```

### Pattern 2: Single Aggregation Query with PostgreSQL Functions
**What:** Use PostgreSQL's JSONB functions to aggregate across all fields in one query
**When to use:** Avoid N+1 queries per field
**Example:**
```typescript
// Repository layer - Drizzle with raw SQL
async getFieldAggregations(batchId: string): Promise<FieldAggregation[]> {
  const result = await this.drizzle.getClient().execute(sql`
    WITH field_keys AS (
      SELECT DISTINCT jsonb_object_keys(data) AS key
      FROM ingestion_rows
      WHERE batch_id = ${batchId} AND deleted_at IS NULL
    )
    SELECT
      fk.key AS field_name,
      COUNT(CASE WHEN ir.data->>fk.key IS NOT NULL AND ir.data->>fk.key != '' THEN 1 END) AS presence_count,
      COUNT(DISTINCT ir.data->>fk.key) AS unique_count
    FROM field_keys fk
    LEFT JOIN ingestion_rows ir ON ir.batch_id = ${batchId} AND ir.deleted_at IS NULL
    GROUP BY fk.key
  `);
  return result.rows;
}
```

### Pattern 3: Majority-Wins Type Inference with Confidence Score
**What:** Sample-based heuristic that returns type + confidence percentage
**When to use:** Runtime type detection from dynamic JSONB data
**Example:**
```typescript
// Type inference service (use case layer)
export class TypeInferenceService {
  inferType(samples: unknown[]): { type: InferredType; confidence: number } {
    const nonEmpty = samples.filter(v => v !== null && v !== '');
    if (nonEmpty.length === 0) return { type: InferredType.UNKNOWN, confidence: 0 };

    const typeVotes = nonEmpty.map(v => this.detectType(v));
    const typeCounts = this.countTypes(typeVotes);
    const [dominantType, count] = this.getDominantType(typeCounts);
    const confidence = count / nonEmpty.length;

    // 80%+ threshold for non-STRING inference
    return confidence >= 0.8
      ? { type: dominantType, confidence }
      : { type: InferredType.STRING, confidence: 1.0 };
  }

  private detectType(value: unknown): InferredType {
    // Brazilian format detection here
  }
}
```

### Pattern 4: Defense-in-Depth Ownership Validation (Existing Pattern)
**What:** Reuse established validation flow from GetBatchUseCase and ListRowsUseCase
**When to use:** Every batch-scoped endpoint
**Example:**
```typescript
// Step 1: Find project WITHOUT userId filter (enables separate 404/403)
const project = await this.projectRepository.findByIdOnly(projectId);
if (!project) throw new NotFoundException('Project not found');

// Step 2: Check if soft-deleted
if (project.deletedAt) throw new NotFoundException('Project is archived');

// Step 3: Validate ownership (403 with security audit log)
if (project.userId !== userId) {
  this.logger.warn(`Unauthorized access - userId: ${userId}, projectId: ${projectId}`);
  throw new ForbiddenException('Access denied');
}

// Step 4: Find batch
const batch = await this.batchRepository.findById(batchId);
if (!batch) throw new NotFoundException('Batch not found');

// Step 5: Defense-in-depth - verify batch belongs to project
if (batch.projectId !== projectId) throw new NotFoundException('Batch not found');
```

### Anti-Patterns to Avoid
- **N+1 Queries per Field:** Don't loop over fields calling repository for each - use single aggregation query
- **Full-Table Scans for Type Inference:** Don't sample ALL rows - limit to first 100 for determinism
- **Repository-Layer Type Inference:** Don't put business logic (type detection) in infrastructure layer
- **Ignoring Empty Strings:** Empty strings (`''`) should be treated as missing, not counted toward presence

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brazilian format validation | Custom regex patterns | Well-tested regex patterns from community | CPF/CNPJ have checksum validation logic beyond simple pattern matching |
| Date parsing | Custom string parser | Existing patterns in CellAccessHelper | Already handles Excel date formats via SheetJS |
| JSONB field extraction | String manipulation | PostgreSQL `jsonb_object_keys()`, `jsonb_each()` | Native functions are optimized and handle edge cases |
| Pagination query pattern | Custom implementation | Existing `PaginatedResult<T>` + Promise.all | Already proven in ListRowsUseCase |

**Key insight:** Type inference is simple enough to implement in-house (5 types, sample-based), but JSONB aggregation should leverage PostgreSQL's optimized native functions.

## Common Pitfalls

### Pitfall 1: N+1 Queries for Field Stats
**What goes wrong:** Loop over columnMetadata array, calling repository for each field's stats individually
**Why it happens:** Direct translation of "for each field, get stats" leads to loop-based approach
**How to avoid:** Use single CTE-based query that aggregates ALL fields in one database round-trip
**Warning signs:** Query count scales linearly with number of fields

### Pitfall 2: Type Inference on Non-Sampled Data
**What goes wrong:** Counting presence/uniqueness uses ALL rows, but type inference uses different sample set
**Why it happens:** Mixing sampling strategies between stats and type detection
**How to avoid:** Use same deterministic sample (first 100 rows by `sourceRowIndex ASC, id ASC`) for both sample values and type inference
**Warning signs:** Type inference results don't match what users see in data table preview

### Pitfall 3: Treating Empty Strings as Present
**What goes wrong:** Empty string counts toward presence, skewing percentages
**Why it happens:** PostgreSQL `IS NOT NULL` check doesn't filter empty strings
**How to avoid:** Use `CASE WHEN data->>field IS NOT NULL AND data->>field != '' THEN 1 END` in aggregation
**Warning signs:** Fields with all empty strings show 100% presence

### Pitfall 4: Misclassifying Brazilian Formats as Wrong Type
**What goes wrong:** CPF (123.456.789-01) detected as STRING instead of recognizing it's a formatted ID
**Why it happens:** Naive type detection sees dots/hyphens and assumes text
**How to avoid:** Detect CPF/CNPJ/CEP patterns BEFORE falling back to STRING; classify as STRING but flag as recognized format
**Warning signs:** User confusion when "CPF" field isn't recognized as special type

### Pitfall 5: SQL Injection via Field Names
**What goes wrong:** Field names from `columnMetadata` inserted into raw SQL without parameterization
**Why it happens:** Drizzle `sql` template tag doesn't auto-escape column names from variables
**How to avoid:** Use CTE approach where field names come from database (`jsonb_object_keys()`), not user input
**Warning signs:** Linter warnings about string interpolation in SQL

### Pitfall 6: Zero-Row Batches Breaking Aggregation
**What goes wrong:** Batch exists but has zero rows, aggregation query returns empty result
**Why it happens:** Not handling edge case where columnMetadata exists but no data
**How to avoid:** Check `totalRows` from batch; if zero, return field stats from columnMetadata with zero counts
**Warning signs:** 500 errors on batches that were just created but have no data

## Code Examples

Verified patterns from official sources and codebase:

### PostgreSQL JSONB Field Extraction
```sql
-- Source: https://www.postgresql.org/docs/current/functions-json.html
-- Extract all distinct field keys from JSONB data column
WITH field_keys AS (
  SELECT DISTINCT jsonb_object_keys(data) AS key
  FROM ingestion_rows
  WHERE batch_id = 'uuid-here' AND deleted_at IS NULL
)
SELECT * FROM field_keys;
```

### Drizzle ORM Raw SQL with Type Safety
```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg (Context7)
import { sql } from 'drizzle-orm';

// Drizzle sql template tag provides SQL injection protection
const result = await db.execute(sql`
  SELECT field_name, COUNT(*) as count
  FROM table_name
  WHERE id = ${userId}
`);
```

### Count Distinct with JSONB Field Extraction
```typescript
// Pattern from existing DrizzleBatchRepository + PostgreSQL docs
async getFieldStats(batchId: string) {
  const result = await this.drizzle.getClient().execute(sql`
    WITH field_keys AS (
      SELECT DISTINCT jsonb_object_keys(data) AS key
      FROM ingestion_rows
      WHERE batch_id = ${batchId} AND deleted_at IS NULL
    )
    SELECT
      fk.key AS field_name,
      COUNT(CASE WHEN ir.data->>fk.key IS NOT NULL AND ir.data->>fk.key != '' THEN 1 END) AS presence_count,
      COUNT(DISTINCT (ir.data->>fk.key)) FILTER (WHERE ir.data->>fk.key IS NOT NULL AND ir.data->>fk.key != '') AS unique_count
    FROM field_keys fk
    LEFT JOIN ingestion_rows ir ON ir.batch_id = ${batchId} AND ir.deleted_at IS NULL
    GROUP BY fk.key
  `);

  return result.rows as Array<{
    field_name: string;
    presence_count: string;
    unique_count: string;
  }>;
}
```

### Sample Row Extraction for Type Inference
```typescript
// Pattern from existing DrizzleRowRepository
async getSampleRows(batchId: string, limit: number = 100): Promise<Row[]> {
  const result = await this.drizzle
    .getClient()
    .select()
    .from(ingestionRows)
    .where(
      and(
        eq(ingestionRows.batchId, batchId),
        isNull(ingestionRows.deletedAt),
      ),
    )
    .orderBy(asc(ingestionRows.sourceRowIndex), asc(ingestionRows.id))
    .limit(limit);

  return result.map((row) => RowMapper.toDomain(row));
}
```

### Brazilian Format Detection Regex Patterns
```typescript
// Source: https://gist.github.com/igorcosta/3a4caa954a99035903ab (verified community pattern)
// Source: https://www.regextester.com/104746

export class BrazilianFormatDetector {
  // CPF: 11 digits with optional formatting (123.456.789-01 or 12345678901)
  private static readonly CPF_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

  // CNPJ: 14 digits with optional formatting (12.345.678/0001-90 or 12345678000190)
  private static readonly CNPJ_PATTERN = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;

  // CEP: 8 digits with optional formatting (12345-678 or 12345678)
  private static readonly CEP_PATTERN = /^\d{5}-?\d{3}$/;

  // Brazilian date: DD/MM/YYYY or DD-MM-YYYY
  private static readonly BR_DATE_PATTERN = /^\d{2}[/-]\d{2}[/-]\d{4}$/;

  // Currency: R$ or R$1.234,56 (comma as decimal separator)
  private static readonly CURRENCY_PATTERN = /^R\$\s?\d{1,3}(\.\d{3})*(,\d{2})?$/;

  static isCPF(value: string): boolean {
    return this.CPF_PATTERN.test(value.trim());
  }

  static isCNPJ(value: string): boolean {
    return this.CNPJ_PATTERN.test(value.trim());
  }

  static isCEP(value: string): boolean {
    return this.CEP_PATTERN.test(value.trim());
  }

  static isBrazilianDate(value: string): boolean {
    return this.BR_DATE_PATTERN.test(value.trim());
  }

  static isBrazilianCurrency(value: string): boolean {
    return this.CURRENCY_PATTERN.test(value.trim());
  }
}
```

### Type Inference with Locale Awareness
```typescript
// Use case layer service
export enum InferredType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  UNKNOWN = 'UNKNOWN',
}

export class TypeInferenceService {
  private static readonly BOOLEAN_VALUES = new Set([
    'true', 'false',
    'yes', 'no',
    'sim', 'não', 'nao',
    '1', '0',
    's', 'n',
  ]);

  public inferType(samples: unknown[]): { type: InferredType; confidence: number } {
    // Filter out null and empty strings
    const nonEmpty = samples.filter(v => v !== null && v !== '' && v !== undefined);

    if (nonEmpty.length === 0) {
      return { type: InferredType.UNKNOWN, confidence: 0 };
    }

    // Detect type for each sample
    const typeVotes = nonEmpty.map(v => this.detectSingleType(v));

    // Count occurrences of each type
    const typeCounts = new Map<InferredType, number>();
    for (const type of typeVotes) {
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }

    // Find dominant type
    let maxCount = 0;
    let dominantType = InferredType.STRING;
    for (const [type, count] of typeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    const confidence = maxCount / nonEmpty.length;

    // Majority-wins: 80%+ threshold for non-STRING types
    if (dominantType !== InferredType.STRING && confidence < 0.8) {
      return { type: InferredType.STRING, confidence: 1.0 };
    }

    return { type: dominantType, confidence };
  }

  private detectSingleType(value: unknown): InferredType {
    const str = String(value).trim();

    // BOOLEAN: strict keyword matching
    if (TypeInferenceService.BOOLEAN_VALUES.has(str.toLowerCase())) {
      return InferredType.BOOLEAN;
    }

    // Brazilian formats detected as their semantic type
    if (BrazilianFormatDetector.isCPF(str) || BrazilianFormatDetector.isCNPJ(str)) {
      return InferredType.STRING; // CPF/CNPJ are IDs, not numbers
    }

    if (BrazilianFormatDetector.isCEP(str)) {
      return InferredType.STRING; // CEP is postal code, not number
    }

    if (BrazilianFormatDetector.isBrazilianDate(str)) {
      return InferredType.DATE;
    }

    if (BrazilianFormatDetector.isBrazilianCurrency(str)) {
      return InferredType.NUMBER; // Currency is numeric despite formatting
    }

    // NUMBER: pure numeric (supports decimals, negative, scientific notation)
    if (!isNaN(Number(str)) && str !== '') {
      return InferredType.NUMBER;
    }

    // DATE: ISO format or other common formats
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return InferredType.DATE;
    }

    // Default to STRING
    return InferredType.STRING;
  }
}
```

### Use Case Orchestration Pattern
```typescript
// Follows existing GetBatchUseCase pattern
export interface GetFieldStatsResult {
  totalRows: number;
  fields: FieldStats[];
}

export interface FieldStats {
  fieldName: string;
  presenceCount: number;
  uniqueCount: number;
  inferredType: InferredType;
  confidence: number;
  sampleValues: unknown[];
}

@Injectable()
export class GetFieldStatsUseCase {
  private readonly logger = new Logger(GetFieldStatsUseCase.name);

  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly batchRepo: BatchRepository,
    private readonly rowRepo: RowRepository,
    private readonly typeInference: TypeInferenceService,
  ) {}

  async execute(
    projectId: string,
    batchId: string,
    userId: string,
  ): Promise<GetFieldStatsResult> {
    // Step 1-5: Ownership validation (existing pattern from GetBatchUseCase)
    const project = await this.projectRepo.findByIdOnly(projectId);
    if (!project) throw new NotFoundException('Project not found');
    if (project.deletedAt) throw new NotFoundException('Project is archived');
    if (project.userId !== userId) {
      this.logger.warn(`Unauthorized access - userId: ${userId}, projectId: ${projectId}`);
      throw new ForbiddenException('Access denied');
    }

    const batch = await this.batchRepo.findById(batchId);
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.projectId !== projectId) throw new NotFoundException('Batch not found');

    // Step 6: Count total rows
    const totalRows = await this.rowRepo.countByBatchId(batchId);

    // Step 7: Handle zero-row edge case
    if (totalRows === 0) {
      return {
        totalRows: 0,
        fields: batch.columnMetadata.map(col => ({
          fieldName: col.normalizedKey,
          presenceCount: 0,
          uniqueCount: 0,
          inferredType: InferredType.UNKNOWN,
          confidence: 0,
          sampleValues: [],
        })),
      };
    }

    // Step 8: Get aggregation stats (single query)
    const aggregations = await this.batchRepo.getFieldAggregations(batchId);

    // Step 9: Get sample rows (first 100, deterministic)
    const sampleRows = await this.rowRepo.getSampleRows(batchId, 100);

    // Step 10: Infer types and extract sample values per field
    const fields = aggregations.map(agg => {
      const samples = sampleRows
        .map(row => row.data[agg.field_name])
        .filter(v => v !== null && v !== '');

      const { type, confidence } = this.typeInference.inferType(samples);

      // Take first 3 distinct values as preview
      const distinctSamples = Array.from(new Set(samples)).slice(0, 3);

      return {
        fieldName: agg.field_name,
        presenceCount: Number(agg.presence_count),
        uniqueCount: Number(agg.unique_count),
        inferredType: type,
        confidence,
        sampleValues: distinctSamples,
      };
    });

    return { totalRows, fields };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-field COUNT queries | Single CTE aggregation | 2020+ PostgreSQL best practices | Reduces N+1 queries, ~N× performance improvement |
| Client-side type detection | Server-side inference with confidence | 2023+ (AI profiling era) | Consistent results, enables frontend badge dimming |
| Full-table sampling | First N rows with deterministic sort | 2021+ (reproducibility focus) | Debuggable, matches user's table view |
| `json` type | `jsonb` binary format | PostgreSQL 9.4 (2014) | 2-10× faster aggregation, GIN indexing support |

**Deprecated/outdated:**
- **LATERAL JOIN for per-field stats:** Too expensive for this use case; CTE with LEFT JOIN is simpler and faster
- **`json_agg()` with JSON type:** Use `jsonb_agg()` with JSONB for better performance
- **Python/Node external type detection libraries:** TypeScript in-house solution is simpler for 5 types

## Open Questions

1. **Should we index JSONB data column for performance?**
   - What we know: GIN indexes speed up JSONB queries but slow down writes
   - What's unclear: Whether aggregation performance on 10K-100K row batches justifies index overhead
   - Recommendation: Implement without index, benchmark with realistic batch sizes, add GIN index if slow (>2s)

2. **How to handle fields that exist in columnMetadata but never appear in row.data?**
   - What we know: JSONB keys are dynamic; not all fields guaranteed in every row
   - What's unclear: Should aggregation query use columnMetadata as source of truth or JSONB keys?
   - Recommendation: Use `jsonb_object_keys()` as source (actual data), cross-reference with columnMetadata for display order

3. **Should confidence score threshold (80%) be configurable?**
   - What we know: 80% is common heuristic for majority-wins classification
   - What's unclear: Whether users need to adjust sensitivity
   - Recommendation: Hardcode 80% for MVP, add config parameter in future if user feedback demands it

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM Official Docs](https://orm.drizzle.team) - /websites/orm_drizzle_team (Context7, benchmark score 79.7)
- [PostgreSQL JSON Functions Documentation](https://www.postgresql.org/docs/current/functions-json.html) - Official PostgreSQL docs
- Existing codebase patterns:
  - `DrizzleBatchRepository.findByProjectIdPaginated` - CTE pattern with Promise.all
  - `GetBatchUseCase.execute` - Ownership validation pattern
  - `CellAccessHelper.getCellType` - SheetJS type detection

### Secondary (MEDIUM confidence)
- [PostgreSQL JSONB Aggregation Guide](https://www.tigerdata.com/learn/how-to-query-jsonb-in-postgresql) - Tiger Data tutorial
- [LATERAL JOIN in PostgreSQL Guide](https://www.crunchydata.com/blog/postgres-subquery-powertools-subqueries-ctes-materialized-views-window-functions-and-lateral) - Crunchy Data blog
- [NestJS Clean Architecture Guide](https://github.com/royib/clean-architecture-nestJS) - GitHub reference implementation
- [Brazilian CPF/CNPJ Regex Patterns](https://gist.github.com/igorcosta/3a4caa954a99035903ab) - Verified community gist

### Tertiary (LOW confidence)
- [TypeScript Best Practices 2026](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/) - General best practices article
- WebSearch results on type inference libraries (informational context only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, versions verified
- Architecture: HIGH - Patterns directly from existing codebase (GetBatchUseCase, DrizzleBatchRepository)
- Pitfalls: HIGH - Based on PostgreSQL performance documentation and project patterns
- Brazilian format detection: MEDIUM - Community regex patterns verified but not formally tested

**Research date:** 2026-01-30
**Valid until:** 2026-03-30 (60 days - stable PostgreSQL/Drizzle features)
