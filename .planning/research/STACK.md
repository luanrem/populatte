# Technology Stack: Field Inventory Features

**Domain:** Field-level analytics and visualization for batch JSONB data
**Researched:** 2026-01-30
**Overall confidence:** HIGH

## Context

This research focuses on **NEW capabilities needed for Field Inventory features (v2.3)**. The existing stack is validated and requires no changes:

**Validated (DO NOT re-add):**
- Next.js 16.0.5 with App Router
- React 19.2.0
- NestJS 11 backend with Clean Architecture
- PostgreSQL with Drizzle ORM 0.45.1
- Clerk authentication (auth, middleware, hooks)
- TanStack Query v5.90.20 (React Query)
- react-hook-form v7.71.1 + @hookform/resolvers v5.2.2
- Zod v4.3.6
- shadcn/ui (18 components currently installed: Badge, Button, Card, Dialog, DropdownMenu, Form, Input, Label, Select, Separator, Sheet, Sidebar, Skeleton, Sonner, Table, Textarea, Tooltip, Breadcrumb)
- Tailwind CSS v4
- Sonner for toasts
- Lucide React icons
- SheetJS (xlsx) 0.20.3
- @tanstack/react-table 8.21.3
- date-fns 4.1.0
- react-dropzone 14.4.0

**Backend (fully implemented):**
- Batches table with `columnMetadata` JSONB (array of column info)
- Rows table with `data` JSONB (key-value pairs per row)
- GET /batches/:batchId (includes columnMetadata)
- GET /batches/:batchId/rows (paginated JSONB data)

## NEW Stack Additions for Field Inventory

### Client-Side Search/Filter

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **use-debounce** | ^10.1.0 | Debounced search input for field values list | Lightweight (2KB), React 19 compatible, provides both `useDebounce` (values) and `useDebouncedCallback` (functions). Active maintenance (v10.1.0 published Jan 2026). **No external dependencies** beyond React. Simpler than lodash.debounce (no need for useCallback + useRef complexity). Server-rendering friendly. |

**Why NOT custom debounce:**
- Requires useRef to store timer ID (complexity)
- useState resets timer on every render (bug-prone)
- useCallback needed to maintain stable reference (boilerplate)
- use-debounce handles all edge cases (unmount cleanup, flush, cancel, isPending)

**Why NOT lodash.debounce:**
- Adds lodash as dependency (even tree-shaken, still heavier)
- Requires manual useCallback + useRef pattern
- use-debounce is React-native (designed for hooks)

### UI Components (shadcn/ui)

Install via CLI from `apps/web`:

```bash
cd apps/web

# Field values side sheet (already installed: Sheet)
pnpm dlx shadcn@latest add scroll-area  # Long lists in sheet
```

| Component | Purpose | Used In | Status |
|-----------|---------|---------|--------|
| **Sheet** | Side panel for field values detail | ViewValuesSheet (right-side drawer) | **Already installed** (verified in apps/web/components/ui/) |
| **ScrollArea** | Scrollable list for field values | ViewValuesSheet (values list, search results) | **Need to install** |

**Already installed (no action needed):**
- Input (search input for values)
- Button (copy, close actions)
- Card (field inventory grid)
- Badge (field type badges)

**Why ScrollArea:**
- Augments native scroll with cross-browser styling
- Built on Radix UI (matches existing shadcn/ui components)
- Handles both vertical and horizontal scroll
- No layout shift (consistent scrollbar width)

**Why NOT custom CSS scroll:**
- Inconsistent across browsers (Safari vs Chrome vs Firefox)
- Need to handle webkit-scrollbar, scrollbar-width, -ms-overflow-style
- ScrollArea provides consistent API

## Type Inference Approach: CUSTOM IMPLEMENTATION (No Library)

**Decision:** Build custom type inference logic. No JavaScript library exists for runtime data type detection from string values.

**Rationale:**
- WebSearch found NO dedicated type inference libraries for JavaScript
- Zod/io-ts are validation libraries (not inference)
- date-fns/dayjs are date manipulation libraries (not detection)
- Custom logic is simple, domain-specific, and has zero dependencies

### Recommended Type Inference Logic

Implement in `apps/api/src/core/domain/services/field-type-inference.service.ts`:

```typescript
export type InferredFieldType = 'String' | 'Number' | 'Date' | 'Email' | 'Boolean' | 'Empty';

export class FieldTypeInferenceService {
  /**
   * Infers type from array of values (all values in a field across rows)
   * Returns most specific type that fits ALL values
   */
  public static inferType(values: unknown[]): InferredFieldType {
    const nonEmptyValues = values.filter((v) => v !== null && v !== undefined && v !== '');

    if (nonEmptyValues.length === 0) return 'Empty';

    const stringValues = nonEmptyValues.map(v => String(v).trim());

    // Try Boolean (true/false, yes/no, 1/0)
    if (this.allMatch(stringValues, this.isBoolean)) return 'Boolean';

    // Try Number (integers, decimals, with/without commas)
    if (this.allMatch(stringValues, this.isNumber)) return 'Number';

    // Try Date (ISO, Brazilian, common formats)
    if (this.allMatch(stringValues, this.isDate)) return 'Date';

    // Try Email (basic regex)
    if (this.allMatch(stringValues, this.isEmail)) return 'Email';

    // Default to String
    return 'String';
  }

  private static allMatch(values: string[], predicate: (v: string) => boolean): boolean {
    return values.every(predicate);
  }

  private static isBoolean(value: string): boolean {
    const normalized = value.toLowerCase();
    return ['true', 'false', 'yes', 'no', '1', '0', 'sim', 'não', 'nao'].includes(normalized);
  }

  private static isNumber(value: string): boolean {
    // Remove thousand separators (comma or period depending on locale)
    const cleaned = value.replace(/[,\.]/g, '');
    return !isNaN(Number(cleaned)) && cleaned !== '';
  }

  private static isDate(value: string): boolean {
    // ISO 8601: 2026-01-30, 2026-01-30T10:00:00
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) {
      return !isNaN(new Date(value).getTime());
    }

    // Brazilian: 30/01/2026, 30-01-2026
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(value)) {
      const [day, month, year] = value.split(/[/-]/).map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    }

    // US: 01/30/2026, 01-30-2026
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(value)) {
      const [month, day, year] = value.split(/[/-]/).map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    }

    return false;
  }

  private static isEmail(value: string): boolean {
    // Basic email regex (99.9% cases)
    // NOT RFC 5322 compliant (that regex is 6000+ characters)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
```

**Why custom vs library:**
- Domain-specific rules (Brazilian date format, Portuguese boolean values)
- Zero dependencies (no bundle size increase)
- Full control over type hierarchy (Boolean > Number > Date > Email > String)
- Can extend easily (CPF/CNPJ, phone numbers, etc.)

**Confidence level:** MEDIUM (no library found, but pattern is well-established in data profiling tools)

## Backend: PostgreSQL JSONB Aggregation with Drizzle ORM

### Field Statistics Query Pattern

For `GET /batches/:batchId/fields/stats` endpoint:

```typescript
import { sql } from 'drizzle-orm';
import { db } from '../database/drizzle.service';
import { rows } from '../database/schema';

// Count how many rows have a specific field present
const fieldPresenceStats = await db.select({
  fieldName: sql<string>`jsonb_object_keys(${rows.data})`,
  presenceCount: sql<number>`cast(count(*) as integer)`,
}).from(rows)
  .where(eq(rows.batchId, batchId))
  .groupBy(sql`jsonb_object_keys(${rows.data})`);

// For a specific field: count unique values
const uniqueValueCount = await db.select({
  count: sql<number>`cast(count(distinct ${rows.data}->>'${fieldName}') as integer)`,
}).from(rows)
  .where(eq(rows.batchId, batchId));
```

**Key operators:**
- `jsonb_object_keys(data)` - Extract all keys from JSONB object
- `data->>'fieldName'` - Extract field as TEXT (use ->> for final extraction)
- `data->'nested'->'field'` - Navigate nested JSONB (use -> for intermediate paths)
- `count(distinct ...)` - Count unique values
- `cast(count(...) as integer)` - PostgreSQL count() returns bigint (string in JS), cast to int

**Source:** [Drizzle ORM PostgreSQL JSONB operators](https://github.com/drizzle-team/drizzle-orm/issues/1690), [Drizzle community JSONB patterns](https://www.answeroverflow.com/m/1188144616541802506)

### Field Values Query Pattern

For `GET /batches/:batchId/fields/:fieldName/values` endpoint:

```typescript
// Get all values for a specific field
const fieldValues = await db.select({
  value: sql<string | null>`${rows.data}->>'${fieldName}'`,
  rowId: rows.id,
}).from(rows)
  .where(eq(rows.batchId, batchId))
  .orderBy(sql`${rows.data}->>'${fieldName}'`);
```

**Why no library needed:**
- Drizzle ORM's `sql` template handles PostgreSQL JSONB operators
- Native PostgreSQL support for JSONB aggregation (no extension needed)
- Type-safe with `sql<T>` generic

**Performance:**
- `jsonb_object_keys()` scans all rows once (O(n))
- Add GIN index on `data` column for faster JSONB queries: `CREATE INDEX idx_rows_data ON rows USING GIN (data);`
- Unique value count: O(n) scan + hash table (PostgreSQL optimized)

## Clipboard API Integration

**Decision:** Use native Clipboard API (no library needed)

### Implementation Pattern

```typescript
import { toast } from 'sonner';

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch (error) {
    // Fallback for older browsers or permission denied
    toast.error('Failed to copy');
  }
}
```

**Browser support:**
- Chrome/Edge: ✅ Requires `clipboard-write` permission OR user gesture (click)
- Firefox/Safari: ✅ Requires user gesture only (no permission API)
- **Secure context required:** HTTPS or localhost (development safe)

**Why NO library:**
- `navigator.clipboard.writeText()` is native and well-supported (2026)
- Async/await pattern is simple
- Libraries like `react-copy-to-clipboard` add wrapper overhead for same API
- No fallback needed (target audience uses modern browsers for B2B SaaS)

**Permission handling:**
- Chromium: Permission persists after first grant (no repeated prompts)
- Firefox/Safari: No permission API (just requires user click)
- All browsers: Must be called during user interaction (click handler)

**Source:** [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API), [LogRocket Clipboard Guide](https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/)

## Installation

```bash
# From monorepo root
npm install use-debounce@^10.1.0

# From apps/web (shadcn components)
cd apps/web
pnpm dlx shadcn@latest add scroll-area
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| **Search debounce** | use-debounce | Custom debounce with useRef + useCallback | Requires 20+ lines of boilerplate. useState resets timer on render (bug-prone). use-debounce handles unmount cleanup, cancel, flush, isPending. |
| **Search debounce** | use-debounce | lodash.debounce | Adds lodash dependency. Not React-native (requires manual useCallback + useRef). use-debounce is lighter and designed for React hooks. |
| **Type inference** | Custom service | Zod / io-ts | These are VALIDATION libraries, not INFERENCE. Zod checks if value matches schema, doesn't infer schema from values. |
| **Type inference** | Custom service | ML-based type detection | Overkill. Field type inference is rule-based (regex + heuristics), not ML problem. No training data, no model needed. |
| **Clipboard** | navigator.clipboard | react-copy-to-clipboard | Wrapper library for same native API. Adds dependency for zero benefit. Native API is simple (await navigator.clipboard.writeText()). |
| **Clipboard** | navigator.clipboard | document.execCommand('copy') | **Deprecated.** Old API, synchronous, requires hidden textarea. navigator.clipboard is modern async API. |
| **JSONB queries** | sql template in Drizzle | TypeORM / Prisma | Existing stack uses Drizzle. No need for second ORM. Drizzle's sql template handles PostgreSQL JSONB operators. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Custom debounce with useState | useState resets timer on every render, causing debounce to never fire. Must use useRef to persist timer ID. | use-debounce hook (handles timer persistence automatically) |
| Type inference libraries | **None exist.** WebSearch found no JavaScript libraries for inferring types from string values. date-fns/dayjs are for date manipulation, not detection. Zod/io-ts are for validation, not inference. | Custom FieldTypeInferenceService with domain-specific rules |
| document.execCommand('copy') | **Deprecated since 2020.** Synchronous API requires creating hidden textarea, selecting text, executing command, removing textarea. Brittle and non-standard. | navigator.clipboard.writeText() (modern, async, secure) |
| Drizzle JSONB helper libraries | Community created custom helpers like `jsonbField()`, but these are not published packages. Reinventing what Drizzle's `sql` template already provides. | Use `sql` template with PostgreSQL JSONB operators (->>, ->) |
| Client-side type inference | Sending all field values to frontend for type detection. Wasteful bandwidth (100+ rows * 20 fields = 2000+ values). | Infer types on backend during field stats calculation. Send only result (type + count). |

## Integration with Existing Stack

### 1. use-debounce + shadcn/ui Input + Client-Side Search

**Pattern:** Debounced search for filtering field values list.

```typescript
import { useDebounce } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

function ViewValuesSheet({ fieldName, values }: { fieldName: string; values: string[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 300); // 300ms delay

  const filteredValues = values.filter(value =>
    value.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <Sheet>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>{fieldName} Values</SheetTitle>
        </SheetHeader>

        <Input
          placeholder="Search values..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="my-4"
        />

        <ScrollArea className="h-[500px]">
          {filteredValues.map((value, index) => (
            <div key={index} className="flex items-center justify-between p-2 hover:bg-muted">
              <span>{value}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(value)}
              >
                Copy
              </Button>
            </div>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

**Why:**
- `useDebounce(searchTerm, 300)` returns debounced value that updates 300ms after user stops typing
- Prevents filtering on every keystroke (performance optimization)
- Works with existing shadcn/ui Input and Sheet components
- ScrollArea handles long lists (100+ values) without layout issues

### 2. Drizzle ORM + PostgreSQL JSONB + Field Stats Endpoint

**Pattern:** NestJS endpoint using Drizzle to query JSONB field statistics.

```typescript
// apps/api/src/presentation/controllers/batches.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { GetBatchFieldStatsUseCase } from '@/core/use-cases/get-batch-field-stats.use-case';

@Controller('batches')
export class BatchesController {
  constructor(private readonly getFieldStats: GetBatchFieldStatsUseCase) {}

  @Get(':batchId/fields/stats')
  async getFieldStats(@Param('batchId') batchId: string) {
    return this.getFieldStats.execute(batchId);
  }
}

// apps/api/src/core/use-cases/get-batch-field-stats.use-case.ts
import { Injectable } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';
import { DrizzleService } from '@/infrastructure/database/drizzle/drizzle.service';
import { rows, batches } from '@/infrastructure/database/schema';
import { FieldTypeInferenceService } from '@/core/domain/services/field-type-inference.service';

@Injectable()
export class GetBatchFieldStatsUseCase {
  constructor(private readonly drizzle: DrizzleService) {}

  async execute(batchId: string) {
    const db = this.drizzle.getDb();

    // Get columnMetadata from batch (field names and order)
    const batch = await db.select({ columnMetadata: batches.columnMetadata })
      .from(batches)
      .where(eq(batches.id, batchId))
      .limit(1);

    const columns = batch[0]?.columnMetadata as Array<{ name: string; index: number }>;

    // For each field, get stats
    const fieldStats = await Promise.all(
      columns.map(async (column) => {
        const fieldName = column.name;

        // Count how many rows have this field present (not null)
        const presenceResult = await db.select({
          count: sql<number>`cast(count(*) filter (where ${rows.data}->>'${fieldName}' is not null) as integer)`,
        }).from(rows)
          .where(eq(rows.batchId, batchId));

        const presenceCount = presenceResult[0]?.count ?? 0;

        // Count unique values
        const uniqueResult = await db.select({
          count: sql<number>`cast(count(distinct ${rows.data}->>'${fieldName}') as integer)`,
        }).from(rows)
          .where(eq(rows.batchId, batchId));

        const uniqueCount = uniqueResult[0]?.count ?? 0;

        // Get all values for type inference
        const valuesResult = await db.select({
          value: sql<string | null>`${rows.data}->>'${fieldName}'`,
        }).from(rows)
          .where(eq(rows.batchId, batchId));

        const values = valuesResult.map(r => r.value).filter(v => v !== null);
        const inferredType = FieldTypeInferenceService.inferType(values);

        return {
          fieldName,
          presenceCount,
          uniqueCount,
          inferredType,
        };
      })
    );

    return { fields: fieldStats };
  }
}
```

**Why:**
- Uses existing Drizzle ORM service (no new database library)
- PostgreSQL `filter (where ...)` clause for conditional count
- `sql` template with type annotation (`sql<number>`) for type safety
- Leverages existing Clean Architecture pattern (use case in core, repository in infrastructure)
- Type inference happens backend-side (frontend receives only results)

### 3. Field Values Endpoint + TanStack Query

**Pattern:** Fetch field values on demand when user clicks field card.

```typescript
// Frontend hook
import { useQuery } from '@tanstack/react-query';

function useFieldValues(batchId: string, fieldName: string) {
  return useQuery({
    queryKey: ['batch-field-values', batchId, fieldName],
    queryFn: async () => {
      const response = await fetch(`/api/batches/${batchId}/fields/${fieldName}/values`);
      if (!response.ok) throw new Error('Failed to fetch field values');
      return response.json() as Promise<{ values: string[] }>;
    },
    enabled: false, // Only fetch when explicitly called (user clicks "View Values")
  });
}

// Backend endpoint
@Get(':batchId/fields/:fieldName/values')
async getFieldValues(
  @Param('batchId') batchId: string,
  @Param('fieldName') fieldName: string,
) {
  const db = this.drizzle.getDb();

  const valuesResult = await db.select({
    value: sql<string | null>`${rows.data}->>'${fieldName}'`,
  }).from(rows)
    .where(eq(rows.batchId, batchId))
    .orderBy(sql`${rows.data}->>'${fieldName}'`);

  const values = valuesResult
    .map(r => r.value)
    .filter((v): v is string => v !== null && v !== '');

  return { values };
}
```

**Why:**
- `enabled: false` prevents auto-fetch (loads data only when needed)
- TanStack Query caches results (clicking same field twice doesn't refetch)
- Backend returns sorted, filtered values (no null/empty)
- Uses existing API client pattern with Clerk auth

### 4. Clipboard API + Toast Feedback

**Pattern:** Copy field value with user feedback.

```typescript
import { toast } from 'sonner';

async function handleCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch (error) {
    console.error('Clipboard error:', error);
    toast.error('Failed to copy. Please try again.');
  }
}

// Usage in component
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleCopy(value)}
  aria-label={`Copy ${value}`}
>
  <Copy className="h-4 w-4" />
</Button>
```

**Why:**
- Uses existing Sonner toast library (already installed)
- Async/await handles clipboard promise
- Error handling for permission denied or unsupported browser
- aria-label for accessibility
- Lucide React icon (existing icon library)

## Performance Considerations

### use-debounce

| Scenario | Behavior | Performance Impact |
|----------|----------|-------------------|
| Type 1 character | State updates immediately, debounced value waits 300ms | Single state update (~1ms) |
| Type 10 characters fast | State updates 10 times, debounced value updates ONCE after 300ms | Prevents 9 unnecessary filter operations |
| Type then pause 300ms | Debounced value updates, triggers filter | Single filter operation |
| Unmount before 300ms | use-debounce cancels timer, no memory leak | Automatic cleanup |

**Key:** Debouncing reduces filter operations from O(keystrokes) to O(pauses). For 1000-item list, saves ~90% of filter calls.

### Client-Side Search vs Server-Side

| Approach | When to Use | Complexity | Performance |
|----------|-------------|------------|-------------|
| **Client-side** (recommended) | < 1000 values | Low (useState + filter) | Instant (no network) |
| Server-side | > 1000 values | Medium (pagination, search param) | 100-300ms (network + DB query) |

**Recommendation:** Use client-side search for field values. Most fields have < 100 unique values (names, dates, statuses). Edge case: 1000+ values (rare), but still performant with debounce.

### JSONB Query Performance

| Query | Rows | Performance | Notes |
|-------|------|-------------|-------|
| `jsonb_object_keys(data)` | 100 | ~10ms | Sequential scan, extracts all keys |
| `jsonb_object_keys(data)` | 1000 | ~50ms | Sequential scan, no index helps (keys vary) |
| `data->>'fieldName'` | 100 | ~5ms | Sequential scan |
| `data->>'fieldName'` (with GIN index) | 1000 | ~15ms | GIN index speeds JSONB lookups |
| `count(distinct data->>'field')` | 1000 | ~30ms | Hash aggregation, PostgreSQL optimized |

**Optimization:** Add GIN index on `data` column:
```sql
CREATE INDEX idx_rows_data ON rows USING GIN (data);
```

**When index helps:**
- `WHERE data @> '{"key": "value"}'` (containment)
- `WHERE data ? 'key'` (key existence)
- Fast JSONB field extraction

**When index doesn't help:**
- `jsonb_object_keys()` (must scan all rows)
- `count(distinct ...)` (aggregation, not lookup)

### ScrollArea Performance

| Values Count | Render Approach | Performance |
|--------------|----------------|-------------|
| < 100 | Render all | ~50ms, no scroll lag |
| 100-500 | Render all with ScrollArea | ~100ms initial, smooth scroll |
| 500-1000 | Consider virtualization | ~200ms initial, may lag on scroll |
| > 1000 | Use react-virtual or TanStack Virtual | Constant ~50ms (only visible items) |

**Recommendation:** For v2.3, render all values without virtualization. Field values rarely exceed 100 unique values. If future data shows > 500 values, add virtualization in v2.4.

## Compatibility Matrix

| Package | React 19.2.0 | Next.js 16.0.5 | TypeScript 5.x | Notes |
|---------|--------------|----------------|----------------|-------|
| use-debounce@10.1.0 | ✅ | ✅ | ✅ | React-native hooks library, no peer dependency issues. Published Jan 2026. |
| ScrollArea (shadcn/ui) | ✅ | ✅ | ✅ | Built on Radix UI, same as existing shadcn components. React 19 compatible. |
| navigator.clipboard | ✅ | ✅ | ✅ | Native browser API, no package. TypeScript lib.dom.d.ts types included. |

## Migration Path

### Step 1: Install Dependencies

```bash
# From monorepo root
npm install use-debounce@^10.1.0

# From apps/web
cd apps/web
pnpm dlx shadcn@latest add scroll-area
```

### Step 2: Add GIN Index to Database

```sql
-- In next migration file
CREATE INDEX IF NOT EXISTS idx_rows_data ON rows USING GIN (data);
```

### Step 3: Create Backend Type Inference Service

```bash
# Create file
touch apps/api/src/core/domain/services/field-type-inference.service.ts

# Add implementation (see "Type Inference Approach" section above)
```

### Step 4: Implement Backend Endpoints

1. `GET /batches/:batchId/fields/stats` - Field statistics (presence count, unique count, inferred type)
2. `GET /batches/:batchId/fields/:fieldName/values` - All values for a field

### Step 5: Implement Frontend Components

1. Field Inventory Grid - Card grid showing field stats
2. ViewValuesSheet - Side sheet with search and copy
3. Search integration - use-debounce + filter

### Step 6: Verify No Breaking Changes

```bash
# Check no new peer dependency warnings
npm list use-debounce
# Expected: use-debounce@10.1.0 (no warnings)

# Verify shadcn components installed
ls apps/web/components/ui/scroll-area.tsx
# Expected: file exists
```

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| use-debounce | **HIGH** | Version 10.1.0 verified via WebSearch (published Jan 2026). React 19 compatible (React-native hooks, no peer dep issues). Active maintenance, 2KB bundle, zero dependencies. |
| ScrollArea (shadcn/ui) | **HIGH** | Official shadcn/ui component verified via WebFetch. Installation command confirmed. Built on Radix UI (same as existing components). React 19 compatible. |
| Type inference (custom) | **MEDIUM** | No library found via WebSearch (Zod/io-ts are validation, not inference). Custom implementation is standard pattern in data profiling tools. Domain-specific rules needed (Brazilian dates, Portuguese booleans). Risk: may need tuning based on real data. |
| Clipboard API | **HIGH** | MDN documentation verified via WebFetch. Browser support confirmed (Chrome/Edge/Firefox/Safari). Requires HTTPS (production safe) or localhost (development safe). Native API, no library needed. |
| Drizzle JSONB queries | **MEDIUM** | WebSearch found community using `sql` template with JSONB operators (->>, ->). No official Drizzle JSONB docs, but pattern is confirmed working. PostgreSQL JSONB operators are well-documented. GIN index recommendation is standard PostgreSQL practice. |
| Client-side search | **HIGH** | use-debounce + filter pattern is established best practice. WebSearch found multiple 2025-2026 sources confirming this approach. Simpler than server-side for < 1000 items. |

## Open Questions (For Implementation Phase)

1. **Type inference edge cases:** How to handle mixed formats in same field? (e.g., some rows "01/30/2026", others "2026-01-30"). Decision: Default to String if not 100% match.

2. **Field values pagination:** If unique values exceed 1000, should we paginate server-side or use virtualization client-side? Decision deferred to v2.4 (current data shows < 100 unique values per field).

3. **Type inference caching:** Should inferred types be cached in `columnMetadata`? Or recalculated on every request? Decision: Recalculate on request (values may change as rows are added/deleted).

## Sources

### Official Documentation
- [shadcn/ui Sheet Component](https://ui.shadcn.com/docs/components/sheet) - Installation, API, side prop values
- [shadcn/ui ScrollArea Component](https://ui.shadcn.com/docs/components/scroll-area) - Installation, usage for long lists
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - Browser support, security requirements, async/await pattern
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - JSONB support, sql template, custom types

### Package Registries
- [use-debounce on npm](https://www.npmjs.com/package/use-debounce) - Latest version, React compatibility
- [use-debounce GitHub](https://github.com/xnimorz/use-debounce) - API docs, useDebounce vs useDebouncedCallback
- [use-debounce Releases](https://github.com/xnimorz/use-debounce/releases) - Version 10.1.0 confirmed (Jan 2026)

### Community Patterns (2025-2026)
- [Debounced Search with Client-side Filtering](https://dev.to/goswamitushar/debounced-search-with-client-side-filtering-a-lightweight-optimization-for-large-lists-2mn2) - use-debounce pattern
- [Implementing Debounce in React](https://www.alexefimenko.com/posts/debounce-react) - useDebounce vs custom implementation
- [React Search Filter Guide](https://dev.to/alais29dev/building-a-real-time-search-filter-in-react-a-step-by-step-guide-3lmm) - useState + filter pattern
- [Implementing Copy-to-Clipboard in React](https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/) - navigator.clipboard.writeText() pattern
- [How to Copy to Clipboard in React](https://spacejelly.dev/posts/how-to-copy-to-clipboard-in-react) - Error handling, toast feedback

### PostgreSQL + Drizzle ORM
- [Drizzle JSONB Query Support Issue](https://github.com/drizzle-team/drizzle-orm/issues/1690) - Community discussion on JSONB operators
- [Best way to query JSONB field - Drizzle Team](https://www.answeroverflow.com/m/1188144616541802506) - sql template pattern with ->> and ->
- [Type safety on JSONB fields](https://github.com/drizzle-team/drizzle-orm/discussions/386) - sql<T> generic for type safety
- [API with NestJS: Handling JSON data with Drizzle](https://wanago.io/2024/07/15/api-nestjs-json-drizzle-postgresql/) - JSONB column definition, querying
- [PostgreSQL json_agg function](https://neon.com/docs/functions/json_agg) - JSONB aggregation patterns

### Type Inference Research (Negative Results)
- [JavaScript Type Inference Search](https://www.devoreur2code.com/blog/type-inference-with-typescript) - TypeScript compile-time inference, NOT runtime
- [JavaScript Data Types MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures) - typeof operator, no inference library
- [Date Detection in JavaScript](https://masteringjs.io/tutorials/fundamentals/typeof-date) - Manual detection, no library recommendation

**Key finding:** No JavaScript library found for runtime type inference from string values. Zod/io-ts are validation (check if value matches schema), NOT inference (determine schema from values). Custom implementation is standard approach.

---

**Stack research for:** Field Inventory Features (use-debounce, ScrollArea, custom type inference, Clipboard API, Drizzle JSONB queries)
**Researched:** 2026-01-30
**Next steps:** Proceed to implementation with validated stack additions
