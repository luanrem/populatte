# Domain Pitfalls: Field Inventory & Analytics

**Domain:** Adding field-level analytics and inventory UIs to existing JSONB batch data system
**Researched:** 2026-01-30
**Project Context:** v2.3 milestone - adding Field Inventory visualization to existing batch detail system (subsequent feature addition)

---

## Critical Pitfalls

These mistakes cause rewrites, major performance issues, or data integrity problems.

### Pitfall 1: JSONB Aggregation Without Indexes Causes Table Scans

**What goes wrong:** Aggregating field statistics across all rows in a batch (distinct values, null counts, type inference) triggers full table scans. With 65K rows, queries timeout or take 10+ seconds.

**Why it happens:** JSONB columns don't have statistics in PostgreSQL. Queries like `SELECT DISTINCT jsonb_extract_path(data, 'fieldName') FROM ingestion_rows WHERE batch_id = ?` scan every row because PostgreSQL can't optimize JSONB key access without indexes.

**Consequences:**
- Field stats endpoint times out on batches with >5K rows
- Database CPU spikes to 100% during field inventory queries
- Memory exhaustion when aggregating across 65K rows (PostgreSQL parameter limit)
- N+1 query pattern if fetching stats per field instead of all fields at once

**Prevention:**
```sql
-- ❌ WRONG: No indexes - full table scan for every field
CREATE TABLE ingestion_rows (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES ingestion_batches(id),
  data JSONB NOT NULL,
  -- Missing GIN index on JSONB column
);

SELECT DISTINCT jsonb_object_keys(data) FROM ingestion_rows WHERE batch_id = ?;
-- Scans all 65K rows

-- ✅ CORRECT: GIN index on JSONB data column
CREATE TABLE ingestion_rows (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES ingestion_batches(id),
  data JSONB NOT NULL
);

CREATE INDEX idx_ingestion_rows_data_gin ON ingestion_rows USING GIN (data jsonb_path_ops);
CREATE INDEX idx_ingestion_rows_batch_data ON ingestion_rows (batch_id) INCLUDE (data);

-- Query optimization: Use batch_id index + JSONB operators
SELECT DISTINCT jsonb_object_keys(data)
FROM ingestion_rows
WHERE batch_id = ?;
-- Uses idx_ingestion_rows_batch_data for fast filtering
```

```typescript
// ❌ WRONG: Fetch stats per field (N+1 pattern)
async getFieldStats(batchId: string, fieldName: string) {
  // Called 20 times for 20 fields = 20 queries
  const result = await db
    .select({
      distinctCount: sql`COUNT(DISTINCT data->${fieldName})`
    })
    .from(ingestionRows)
    .where(eq(ingestionRows.batchId, batchId));

  return result[0];
}

// ✅ CORRECT: Aggregate all fields in one query
async getAllFieldStats(batchId: string) {
  // Single query aggregates all field statistics
  const result = await db.execute(sql`
    WITH field_keys AS (
      SELECT DISTINCT jsonb_object_keys(data) as key
      FROM ingestion_rows
      WHERE batch_id = ${batchId}
    ),
    field_stats AS (
      SELECT
        f.key,
        COUNT(*) as total_rows,
        COUNT(data->f.key) as non_null_count,
        COUNT(DISTINCT data->f.key) as distinct_count,
        COUNT(*) - COUNT(data->f.key) as null_count
      FROM ingestion_rows r
      CROSS JOIN field_keys f
      WHERE r.batch_id = ${batchId}
      GROUP BY f.key
    )
    SELECT * FROM field_stats;
  `);

  return result.rows;
}
```

**Detection:**
- Field stats endpoint takes >2 seconds on batches with 10K+ rows
- PostgreSQL logs show "Seq Scan on ingestion_rows" instead of "Index Scan"
- Database CPU spikes when opening field inventory view

**Which phase:** Phase 1 (Backend Field Stats) - add GIN index in migration before implementing stats endpoint.

**Sources:**
- [PostgreSQL JSONB and Statistics](https://blog.anayrat.info/en/2017/11/26/postgresql-jsonb-and-statistics/)
- [How to avoid performance bottlenecks when using JSONB in PostgreSQL](https://www.metisdata.io/blog/how-to-avoid-performance-bottlenecks-when-using-jsonb-in-postgresql)
- [Postgres large JSON value query performance](https://www.evanjones.ca/postgres-large-json-performance.html)
- [PostgreSQL Indexing Strategies for JSONB Columns](https://www.rickychilcott.com/2025/09/22/postgresql-indexing-strategies-for-jsonb-columns/)

---

### Pitfall 2: Type Inference on Mixed-Type Fields Causes Runtime Errors

**What goes wrong:** A JSONB field contains mixed types across rows (e.g., row 1 has `"123"` as string, row 2 has `123` as number). Frontend assumes all values are strings, crashes when rendering number, or vice versa.

**Why it happens:** Excel parsing can produce inconsistent types (empty cells become `null`, numbers become strings if formatted as text). PostgreSQL JSONB stores primitives without type enforcement per key.

**Consequences:**
- Type inference endpoint returns "string" but 10% of values are actually numbers
- Card grid crashes when rendering: `Cannot read property 'toString' of null`
- Copy-to-clipboard fails: `navigator.clipboard.writeText(value)` throws when value is number
- Search filter breaks when comparing string to number

**Prevention:**
```typescript
// ❌ WRONG: Assume all values have same type
interface FieldStats {
  fieldName: string;
  inferredType: 'string' | 'number' | 'boolean'; // Single type
  distinctValues: string[]; // Wrong: values might be numbers
}

function renderValue(value: string) {
  return value.toUpperCase(); // Crashes if value is number
}

// ✅ CORRECT: Handle mixed types explicitly
interface FieldStats {
  fieldName: string;
  inferredType: 'string' | 'number' | 'boolean' | 'mixed' | 'null';
  typeDistribution: {
    string: number;
    number: number;
    boolean: number;
    null: number;
  };
  distinctValues: Array<string | number | boolean | null>;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(empty)';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

// Backend type inference with distribution
async getFieldTypeDistribution(batchId: string, fieldName: string) {
  const result = await db.execute(sql`
    SELECT
      jsonb_typeof(data->${fieldName}) as json_type,
      COUNT(*) as count
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
      AND data ? ${fieldName}
    GROUP BY jsonb_typeof(data->${fieldName})
  `);

  // Returns: [{ json_type: 'string', count: 900 }, { json_type: 'number', count: 100 }]
  return result.rows;
}
```

**Detection:**
- Field inventory shows type "string" but values render as numbers
- Copy-to-clipboard throws `writeText requires string` error
- Search filter returns inconsistent results (string comparison on numeric values)

**Which phase:** Phase 1 (Backend Field Stats) - implement type distribution analysis, not single inferred type.

**Sources:**
- [PostgreSQL JSON Functions and Operators](https://www.postgresql.org/docs/current/functions-json.html)
- [PostgreSQL: NULL values in JSONB](https://mbork.pl/2020-02-15_PostgreSQL_and_null_values_in_jsonb)

---

### Pitfall 3: Large Value Lists Overwhelm Memory and Rendering

**What goes wrong:** A field has 10,000+ distinct values (e.g., transaction IDs, timestamps). Loading all values into side sheet crashes browser tab or freezes UI for 30+ seconds.

**Why it happens:** Backend returns all distinct values without pagination. Frontend loads entire array into memory, tries to render 10K DOM nodes, and browser grinds to a halt.

**Consequences:**
- Browser tab crashes with "Aw, Snap! Out of memory" on fields with >20K distinct values
- Side sheet takes 15+ seconds to open, freezes UI
- Search input lags (filtering 10K items on every keystroke)
- Memory leak if user opens/closes multiple high-cardinality fields

**Prevention:**
```typescript
// ❌ WRONG: Fetch all distinct values without limit
async getFieldValues(batchId: string, fieldName: string) {
  const result = await db.execute(sql`
    SELECT DISTINCT data->${fieldName} as value
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
      AND data ? ${fieldName}
    ORDER BY value
  `);

  return result.rows; // Could be 65K rows!
}

// Frontend: Render all 10K values at once
function ValueList({ values }: { values: string[] }) {
  return (
    <ul>
      {values.map(v => <li key={v}>{v}</li>)} {/* 10K DOM nodes */}
    </ul>
  );
}

// ✅ CORRECT: Paginate backend, virtualize frontend
async getFieldValues(
  batchId: string,
  fieldName: string,
  limit = 100,
  offset = 0,
  search?: string
) {
  const searchCondition = search
    ? sql`AND (data->${fieldName})::text ILIKE ${`%${search}%`}`
    : sql``;

  const result = await db.execute(sql`
    SELECT DISTINCT data->${fieldName} as value
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
      AND data ? ${fieldName}
      ${searchCondition}
    ORDER BY value
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT COUNT(DISTINCT data->${fieldName}) as total
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
      AND data ? ${fieldName}
      ${searchCondition}
  `);

  return {
    values: result.rows,
    total: countResult.rows[0].total,
    hasMore: offset + limit < countResult.rows[0].total
  };
}

// Frontend: Virtualize with react-window or limit display
import { FixedSizeList } from 'react-window';

function ValueList({ values }: { values: string[] }) {
  // Only render visible items in viewport
  return (
    <FixedSizeList
      height={400}
      itemCount={values.length}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{values[index]}</div>
      )}
    </FixedSizeList>
  );
}
```

**Detection:**
- Browser DevTools Memory profiler shows >500MB heap when side sheet opens
- UI freezes for 10+ seconds when clicking field with high distinct count
- Network tab shows 5+ MB JSON payload for value list

**Which phase:** Phase 1 (Backend Field Values) - implement pagination BEFORE testing with large batches.

**Project-specific note:** With 65K row limit, a field could theoretically have 65K distinct values. Must paginate.

**Sources:**
- [React Virtualized: Improving Performance for Large Lists](https://medium.com/@ignatovich.dm/virtualization-in-react-improving-performance-for-large-lists-3df0800022ef)
- [How to Optimize React Dashboard Rendering Performance with Virtualization](https://www.zigpoll.com/content/how-can-i-optimize-the-rendering-performance-of-large-datasets-in-a-react-dashboard-using-virtualization-techniques)
- [Efficient rendering of large lists with react-select](https://fasterthanlight.me/blog/post/react-select)

---

### Pitfall 4: View Toggle State Management Causes Data Refetch

**What goes wrong:** Switching between table view and inventory view refetches batch data from server instead of using existing React Query cache, causing flickering and wasted requests.

**Why it happens:** View state (`table` vs `inventory`) stored in component state or URL, but not properly synced with React Query cache. Each view uses different query keys or doesn't share data.

**Consequences:**
- Switching views shows loading spinner (bad UX)
- Double the API calls (fetch once for table, again for inventory)
- Stale data issues if batch updated while in other view
- View transition feels slow despite data already loaded

**Prevention:**
```typescript
// ❌ WRONG: Different query keys per view (duplicates cache)
function BatchTableView({ batchId }: Props) {
  const { data } = useQuery({
    queryKey: ['batch', batchId, 'table'], // Separate cache entry
    queryFn: () => fetchBatchRows(batchId)
  });
}

function BatchInventoryView({ batchId }: Props) {
  const { data } = useQuery({
    queryKey: ['batch', batchId, 'inventory'], // Different cache entry
    queryFn: () => fetchBatchRows(batchId) // Duplicate request!
  });
}

// ❌ WRONG: Toggle state causes cache invalidation
function BatchDetail({ batchId }: Props) {
  const [view, setView] = useState<'table' | 'inventory'>('table');

  useEffect(() => {
    // Invalidates cache on every toggle!
    queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
  }, [view]);
}

// ✅ CORRECT: Shared query key, view state in URL
function BatchDetail({ batchId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view') ?? 'table';

  // Single query key - shared cache between views
  const { data: rows } = useQuery({
    queryKey: ['batches', batchId, 'rows'],
    queryFn: () => fetchBatchRows(batchId)
  });

  const { data: stats } = useQuery({
    queryKey: ['batches', batchId, 'stats'],
    queryFn: () => fetchFieldStats(batchId),
    enabled: view === 'inventory' // Only fetch stats when needed
  });

  function toggleView(newView: 'table' | 'inventory') {
    const params = new URLSearchParams(searchParams);
    params.set('view', newView);
    router.push(`?${params.toString()}`);
    // No invalidation needed - cache persists
  }

  return (
    <>
      <ViewToggle value={view} onChange={toggleView} />
      {view === 'table' ? (
        <DataTable data={rows} />
      ) : (
        <FieldInventory rows={rows} stats={stats} />
      )}
    </>
  );
}
```

**Detection:**
- Network tab shows duplicate requests when toggling views
- UI shows loading spinner during view transition despite data already loaded
- React Query Devtools shows multiple cache entries for same batch

**Which phase:** Phase 2 (Frontend View Toggle) - design shared cache strategy before implementing views.

**Sources:**
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025)
- [Top State Management Pitfalls in Modern UI](https://logicloom.in/state-management-gone-wrong-avoiding-common-pitfalls-in-modern-ui-development/)

---

### Pitfall 5: Side Sheet Blocks Interaction with Main Content

**What goes wrong:** Opening side sheet to view field values sets `modal: true` on Dialog/Sheet component, trapping focus and preventing interaction with main batch table. Users can't compare field values with table data.

**Why it happens:** Misusing shadcn Sheet component in modal mode when non-modal side panel is needed. Default Sheet behavior is modal (blocks background).

**Consequences:**
- Users can't scroll batch table while side sheet open
- Can't click field cards in background to open different field
- Poor UX for data exploration (forced to close/reopen repeatedly)
- Accessibility issue: focus trap prevents keyboard navigation

**Prevention:**
```typescript
// ❌ WRONG: Modal Sheet blocks interaction
import { Sheet, SheetContent } from '@/components/ui/sheet';

function FieldInventory() {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  return (
    <>
      <FieldCards onFieldClick={setSelectedField} />
      <Sheet open={!!selectedField} onOpenChange={() => setSelectedField(null)}>
        <SheetContent>
          {/* Modal overlay blocks clicking other field cards */}
          <FieldValueList field={selectedField} />
        </SheetContent>
      </Sheet>
    </>
  );
}

// ✅ CORRECT: Non-modal side panel allows interaction
import { Sheet, SheetContent } from '@/components/ui/sheet';

function FieldInventory() {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  return (
    <>
      <FieldCards onFieldClick={setSelectedField} />
      <Sheet
        open={!!selectedField}
        onOpenChange={() => setSelectedField(null)}
        modal={false} // ← Allows interaction with background
      >
        <SheetContent
          side="right"
          className="pointer-events-auto" // Sheet is interactive
          onInteractOutside={(e) => {
            // Don't close when clicking field cards
            e.preventDefault();
          }}
        >
          <FieldValueList field={selectedField} />
        </SheetContent>
      </Sheet>
      {/* No overlay, background remains interactive */}
    </>
  );
}
```

**Detection:**
- Side sheet overlay dims and blocks interaction with field cards
- Clicking field card in background doesn't change selected field
- Focus trapped in side sheet, can't tab to main content

**Which phase:** Phase 2 (Frontend Side Sheet) - configure non-modal mode during Sheet implementation.

**Project-specific note:** shadcn Sheet supports `modal={false}` prop. Use it for exploratory data UIs.

**Sources:**
- [Modal vs Drawer: When to use the right component](https://medium.com/@ninad.kotasthane/modal-vs-drawer-when-to-use-the-right-component-af0a76b952da)
- [Modal and Non-Modal components in UI design](https://medium.com/design-bootcamp/ux-blueprint-09-modal-and-non-modal-components-in-ui-design-why-they-matter-75e6ffb62946)
- [Exploring Drawer and Sheet Components in shadcn UI](https://medium.com/@enayetflweb/exploring-drawer-and-sheet-components-in-shadcn-ui-cf2332e91c40)

---

### Pitfall 6: Copy-to-Clipboard Fails Without User Interaction

**What goes wrong:** Copy button in side sheet works in development (localhost) but fails in production with "NotAllowedError: Write permission denied" due to browser security policies.

**Why it happens:** Clipboard API requires HTTPS and recent user interaction (transient activation). Copying values after async operation (fetch field values) loses user activation context.

**Consequences:**
- Copy button silently fails in production
- No error shown to user (clipboard API throws in background)
- Feature appears broken on mobile browsers (stricter clipboard policies)
- Fallback to `document.execCommand` needed but not implemented

**Prevention:**
```typescript
// ❌ WRONG: Async copy loses user activation
async function copyFieldValue(value: string) {
  // Simulate async operation (e.g., formatting value)
  await new Promise(resolve => setTimeout(resolve, 100));

  // User activation expired - clipboard write fails
  await navigator.clipboard.writeText(value); // Throws NotAllowedError
}

// ✅ CORRECT: Synchronous copy with fallback
function copyToClipboard(text: string): boolean {
  try {
    // Modern Clipboard API (requires HTTPS + user activation)
    if (navigator.clipboard && window.isSecureContext) {
      // Must be synchronous to preserve user activation
      navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers or non-HTTPS
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    return success;
  } catch (error) {
    console.error('Copy failed:', error);
    return false;
  }
}

// Usage in component
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const success = copyToClipboard(String(value)); // Convert to string first

    if (success) {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy');
    }
  }

  return (
    <Button onClick={handleCopy}>
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}
```

**Detection:**
- Copy button works on localhost but fails on production HTTPS
- Browser console shows "NotAllowedError" when clicking copy
- Mobile Safari copy fails silently

**Which phase:** Phase 2 (Frontend Side Sheet) - implement fallback pattern in CopyButton component.

**Sources:**
- [Clipboard API - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [Unblocking clipboard access](https://web.dev/articles/async-clipboard)
- [JavaScript Clipboard API with fallback](https://www.sitelint.com/blog/javascript-clipboard-api-with-fallback)

---

### Pitfall 7: Special Characters in Field Names Break JSONB Queries

**What goes wrong:** Excel columns with special characters (spaces, dots, brackets) become JSONB keys. Queries using `data->'Column Name'` fail with syntax errors or return null unexpectedly.

**Why it happens:** JSONB operators use PostgreSQL syntax where special characters need escaping. Field names like "A1", "Column.Name", or "Price ($)" break `->>` operator queries.

**Consequences:**
- Field stats query returns empty for fields with spaces in name
- Frontend receives `null` stats for fields that exist in data
- SQL injection risk if field names used in raw SQL without sanitization
- A1 notation (Excel cell addresses) conflicts with reserved patterns

**Prevention:**
```typescript
// ❌ WRONG: Using field names directly in JSONB query
async getFieldStats(batchId: string, fieldName: string) {
  // Breaks if fieldName is "Column Name" (space) or "A1" (reserved)
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT data->>${fieldName}) as count
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
  `);

  return result.rows[0];
}

// ✅ CORRECT: Use parameterized queries with proper escaping
async getFieldStats(batchId: string, fieldName: string) {
  // sql template tag handles JSONB key escaping
  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT data->${sql.param(fieldName)}) as distinct_count,
      COUNT(*) - COUNT(data->${sql.param(fieldName)}) as null_count
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
      AND data ? ${sql.param(fieldName)}
  `);

  return result.rows[0];
}

// Backend: Sanitize field names during Excel parsing
function sanitizeFieldName(rawName: string): string {
  // Remove special characters that break JSONB operators
  return rawName
    .trim()
    .replace(/\s+/g, '_') // Spaces to underscores
    .replace(/[.$\[\]]/g, '_') // Remove JSONB-breaking chars
    .replace(/^(\d)/, '_$1') // Prefix if starts with number
    .substring(0, 255); // PostgreSQL identifier limit
}

// Alternative: Store mapping of original → sanitized names
interface ColumnMetadata {
  originalName: string;
  sanitizedName: string;
  columnIndex: number;
}
```

**Detection:**
- Field stats return null for fields visible in JSONB data
- SQL syntax errors in logs: `syntax error at or near "$"`
- Fields with spaces/special chars missing from inventory

**Which phase:** Phase 0 (Architecture Decision) - decide field name sanitization strategy before v2.3 implementation.

**Project-specific note:** Existing `columnMetadata` JSONB in `ingestion_batches` table could store original→sanitized mapping.

**Sources:**
- [PostgreSQL JSONB key special characters](https://www.postgresql.org/docs/current/datatype-json.html)
- [Excel Named Ranges: What characters are allowed](https://www.excelforum.com/excel-general/568288-named-ranges-what-characters-are-or-are-not-allowed-in-the-nam.html)
- [Using A1 or R1C1 Reference Notation in Excel](https://trumpexcel.com/a1-r1c1-reference-notation-excel/)

---

## Moderate Pitfalls

These mistakes cause delays, bugs, or technical debt but are recoverable.

### Pitfall 8: Search Input Lags on High-Cardinality Fields

**What goes wrong:** Typing in search input in side sheet value list triggers re-filtering on every keystroke. With 10K values, UI freezes for 200-500ms per character.

**Why it happens:** Frontend filters large array in memory on every onChange event without debouncing. React re-renders entire virtualized list for each keystroke.

**Consequences:**
- Search input feels sluggish (characters appear delayed)
- UI freezes briefly on every keystroke
- Poor UX on mobile devices (even worse performance)
- Users think feature is broken

**Prevention:**
```typescript
// ❌ WRONG: Filter on every keystroke
function ValueList({ values }: { values: string[] }) {
  const [search, setSearch] = useState('');

  // Filters 10K items on EVERY keystroke
  const filtered = values.filter(v =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)} // Instant re-filter
      />
      <ul>
        {filtered.map(v => <li key={v}>{v}</li>)}
      </ul>
    </>
  );
}

// ✅ CORRECT: Debounce search, server-side filter for large lists
import { useDebouncedValue } from '@/hooks/use-debounced-value';

function ValueList({ batchId, fieldName }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300); // 300ms delay

  // Server-side filtering with debounced search
  const { data, isLoading } = useQuery({
    queryKey: ['batches', batchId, 'fields', fieldName, 'values', { search: debouncedSearch }],
    queryFn: () => fetchFieldValues(batchId, fieldName, { search: debouncedSearch, limit: 100 })
  });

  return (
    <>
      <Input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)} // Fast input
        placeholder="Search values..."
      />
      {isLoading ? (
        <Skeleton count={5} />
      ) : (
        <VirtualizedList values={data?.values ?? []} />
      )}
    </>
  );
}
```

**Detection:**
- Typing in search input shows visible lag
- React DevTools Profiler shows 200+ ms render time per keystroke
- CPU usage spikes when typing in search

**Which phase:** Phase 2 (Frontend Side Sheet) - implement debouncing from start, upgrade to server-side filter if needed.

**Sources:**
- [React select is slow when you have more than 1000 items](https://github.com/JedWatson/react-select/issues/3128)
- [Optimize react-select to smoothly render 10k+ data](https://www.botsplash.com/post/optimize-your-react-select-component-to-smoothly-render-10k-data)

---

### Pitfall 9: Card Grid Re-renders on Every Field Click

**What goes wrong:** Clicking a field card to open side sheet causes entire card grid to re-render, creating visible flicker and poor UX.

**Why it happens:** Selected field state in parent component triggers re-render of all child FieldCard components without memoization.

**Consequences:**
- Visible flicker when clicking field cards
- Scroll position may jump
- Feels sluggish with 50+ field cards
- Selected card highlight flashes

**Prevention:**
```typescript
// ❌ WRONG: No memoization, all cards re-render
function FieldInventory({ stats }: { stats: FieldStats[] }) {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(field => (
        <FieldCard
          key={field.name}
          field={field}
          isSelected={selectedField === field.name}
          onClick={() => setSelectedField(field.name)}
        />
      ))}
    </div>
  );
}

function FieldCard({ field, isSelected, onClick }: Props) {
  // Re-renders on EVERY click (any field clicked)
  return (
    <Card onClick={onClick} className={isSelected ? 'border-blue-500' : ''}>
      <CardHeader>{field.name}</CardHeader>
      <CardContent>{field.distinctCount} unique values</CardContent>
    </Card>
  );
}

// ✅ CORRECT: Memoize cards, prevent unnecessary re-renders
import { memo } from 'react';

function FieldInventory({ stats }: { stats: FieldStats[] }) {
  const [selectedField, setSelectedField] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(field => (
        <MemoizedFieldCard
          key={field.name}
          field={field}
          isSelected={selectedField === field.name}
          onSelect={setSelectedField}
        />
      ))}
    </div>
  );
}

const MemoizedFieldCard = memo(function FieldCard({
  field,
  isSelected,
  onSelect
}: Props) {
  // Only re-renders when field or isSelected changes
  return (
    <Card
      onClick={() => onSelect(field.name)}
      className={isSelected ? 'border-blue-500' : ''}
    >
      <CardHeader>{field.name}</CardHeader>
      <CardContent>{field.distinctCount} unique values</CardContent>
    </Card>
  );
}, (prev, next) => {
  // Custom comparison: only re-render if selection state changes
  return prev.isSelected === next.isSelected && prev.field.name === next.field.name;
});
```

**Detection:**
- React DevTools Profiler shows all FieldCard components re-rendering on click
- Visible flicker when clicking cards
- Slower performance with 50+ fields

**Which phase:** Phase 2 (Frontend Card Grid) - add memoization during FieldCard component creation.

---

### Pitfall 10: Drizzle ORM Lacks Native JSONB Query Helpers

**What goes wrong:** Drizzle ORM doesn't have type-safe helpers for JSONB queries (`->`, `->>`, `?` operators). Developers resort to raw SQL strings, losing type safety and increasing SQL injection risk.

**Why it happens:** Drizzle ORM's JSONB support is limited compared to ORMs like Prisma. Complex JSONB operations require `sql` template literals.

**Consequences:**
- No autocomplete for JSONB field names
- Type safety lost for field stats queries
- Harder to maintain (raw SQL scattered in codebase)
- Potential SQL injection if not using `sql.param()`

**Prevention:**
```typescript
// ❌ WRONG: String interpolation (SQL injection risk)
async getFieldStats(batchId: string, fieldName: string) {
  // DANGEROUS: fieldName not escaped
  const result = await db.execute(
    `SELECT COUNT(DISTINCT data->>'${fieldName}') FROM ingestion_rows WHERE batch_id = '${batchId}'`
  );
}

// ❌ PARTIALLY WRONG: sql template but no type safety
async getFieldStats(batchId: string, fieldName: string) {
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT data->>${fieldName}) as count
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
  `);

  return result.rows[0].count; // Type is 'any', no type safety
}

// ✅ CORRECT: sql template with manual typing
import { z } from 'zod';

const fieldStatsSchema = z.object({
  distinct_count: z.number(),
  null_count: z.number(),
  total_rows: z.number(),
});

async getFieldStats(batchId: string, fieldName: string): Promise<FieldStats> {
  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT data->${sql.param(fieldName)}) as distinct_count,
      COUNT(*) - COUNT(data->${sql.param(fieldName)}) as null_count,
      COUNT(*) as total_rows
    FROM ingestion_rows
    WHERE batch_id = ${batchId}
  `);

  // Runtime validation with Zod
  const parsed = fieldStatsSchema.parse(result.rows[0]);
  return parsed;
}
```

**Detection:**
- Type errors in IDE when accessing query results
- No autocomplete for field names in JSONB queries
- Runtime errors due to unexpected null values

**Which phase:** Phase 1 (Backend Field Stats) - establish pattern of `sql` + Zod validation for all JSONB queries.

**Project-specific note:** Existing Populatte codebase already uses Zod extensively. Apply same pattern to JSONB queries.

**Sources:**
- [Drizzle ORM: Custom types](https://orm.drizzle.team/docs/custom-types)
- [Best way to query jsonb field - Drizzle Team](https://www.answeroverflow.com/m/1188144616541802506)
- [GitHub Drizzle: Native JSONB query support](https://github.com/drizzle-team/drizzle-orm/issues/1690)

---

## Minor Pitfalls

These mistakes cause annoyance or minor UX issues but are easily fixable.

### Pitfall 11: Field Cards Show Raw JSON for Null Values

**What goes wrong:** Fields with null values display "null" (string) or blank space instead of user-friendly "(empty)" text.

**Why it happens:** Rendering `null` directly in JSX converts to empty string, or `JSON.stringify(null)` returns `"null"`.

**Prevention:**
```typescript
// ❌ WRONG: Null renders as blank
function FieldCard({ field }: { field: FieldStats }) {
  return (
    <Card>
      <CardHeader>{field.name}</CardHeader>
      <CardContent>
        <p>{field.sampleValue}</p> {/* null → blank space */}
      </CardContent>
    </Card>
  );
}

// ✅ CORRECT: Explicit null handling
function FieldCard({ field }: { field: FieldStats }) {
  const displayValue = field.sampleValue === null
    ? '(empty)'
    : String(field.sampleValue);

  return (
    <Card>
      <CardHeader>{field.name}</CardHeader>
      <CardContent>
        <p className={field.sampleValue === null ? 'text-muted-foreground' : ''}>
          {displayValue}
        </p>
      </CardContent>
    </Card>
  );
}
```

**Which phase:** Phase 2 (Frontend Card Grid) - add during FieldCard rendering.

---

### Pitfall 12: Side Sheet Doesn't Close on Escape Key

**What goes wrong:** Users expect Escape key to close side sheet but it doesn't work because Sheet component not configured for keyboard events.

**Why it happens:** Forgot to enable keyboard event handling or prevent default Escape behavior.

**Prevention:**
```typescript
// ❌ WRONG: No keyboard handling
<Sheet open={!!selectedField} onOpenChange={() => setSelectedField(null)}>
  <SheetContent>
    <FieldValueList field={selectedField} />
  </SheetContent>
</Sheet>

// ✅ CORRECT: Handle Escape key
<Sheet
  open={!!selectedField}
  onOpenChange={(open) => {
    if (!open) setSelectedField(null);
  }}
>
  <SheetContent onEscapeKeyDown={() => setSelectedField(null)}>
    <FieldValueList field={selectedField} />
  </SheetContent>
</Sheet>
```

**Which phase:** Phase 2 (Frontend Side Sheet) - configure during Sheet setup.

---

### Pitfall 13: No Empty State for Fields with Zero Values

**What goes wrong:** Field with all null values shows empty side sheet with no explanation when clicked.

**Prevention:**
```typescript
function FieldValueList({ values }: { values: unknown[] }) {
  if (values.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>No values found</p>
        <p className="text-sm">All rows have empty values for this field</p>
      </div>
    );
  }

  return <VirtualizedList values={values} />;
}
```

**Which phase:** Phase 2 (Frontend Side Sheet) - add during ValueList component creation.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 0: Architecture | Field name encoding strategy undefined | Decide: sanitize during Excel parsing OR store original→sanitized mapping in columnMetadata |
| Phase 1: Backend Field Stats | No GIN index on JSONB data column | Add GIN index in migration before implementing stats endpoint |
| Phase 1: Backend Field Stats | N+1 query pattern (stats per field) | Aggregate all fields in single CTE query |
| Phase 1: Backend Field Stats | Type inference returns single type | Implement type distribution (string: 90%, number: 10%) not single inferred type |
| Phase 1: Backend Field Values | Fetch all distinct values without limit | Paginate backend: limit=100, offset, search parameter |
| Phase 2: Frontend View Toggle | Different query keys per view | Use shared queryKey, toggle view via URL param |
| Phase 2: Frontend Card Grid | All cards re-render on selection | Memo FieldCard with custom comparison function |
| Phase 2: Frontend Side Sheet | Modal Sheet blocks interaction | Set `modal={false}` on Sheet component |
| Phase 2: Frontend Side Sheet | Copy fails without fallback | Implement textarea fallback for clipboard API |
| Phase 2: Frontend Side Sheet | Search lags on large lists | Debounce search input (300ms), server-side filter if >1000 values |
| Phase 2: Frontend Side Sheet | Large value list overwhelms DOM | Use react-window FixedSizeList for virtualization |

---

## Integration Warnings with Existing System

### Existing Pattern: JSONB data Column Without Indexes

**Current state:** `ingestion_rows.data` is JSONB but has no GIN index (verified in schema).

**Field Inventory challenge:** Aggregating field stats will trigger table scans.

**Recommendation:**
```sql
-- Migration: Add GIN index before v2.3
CREATE INDEX idx_ingestion_rows_data_gin
ON ingestion_rows USING GIN (data jsonb_path_ops);

-- Optional: Expression index for frequent field access
CREATE INDEX idx_ingestion_rows_batch_data
ON ingestion_rows (batch_id) INCLUDE (data);
```

### Existing Pattern: columnMetadata JSONB in ingestion_batches

**Current state:** `ingestion_batches.columnMetadata` stores array of column info (type unknown, not verified).

**Field Inventory opportunity:** Could store field name sanitization mapping here.

**Recommendation:**
```typescript
interface ColumnMetadata {
  columnIndex: number;
  originalName: string; // "Column Name" (spaces, special chars)
  sanitizedName: string; // "column_name" (safe for JSONB queries)
  excelColumn: string; // "A", "B", "C" (original Excel letter)
}

// Store in batch creation, use in field stats queries
const columnMetadata: ColumnMetadata[] = [
  { columnIndex: 0, originalName: "Client Name", sanitizedName: "client_name", excelColumn: "A" },
  { columnIndex: 1, originalName: "Price ($)", sanitizedName: "price", excelColumn: "B" }
];
```

### Existing Pattern: N+1 Query in ListBatchesUseCase

**Current state:** Known N+1 pattern in batch listing (accepted technical debt at limit=100).

**Field Inventory challenge:** Field stats adds another N+1 risk (stats per field).

**Recommendation:** Don't repeat the pattern. Use CTE aggregation for all fields in one query.

### Existing Pattern: Drizzle ORM with sql Template Literals

**Current state:** Codebase uses Drizzle but raw SQL for complex queries (verified in existing migrations).

**Field Inventory integration:** JSONB queries will need `sql` template + Zod validation.

**Recommendation:** Establish reusable helper:
```typescript
// packages/commons/src/utils/jsonb.utils.ts
export class JsonbQueryUtils {
  static fieldStats(batchId: string, fieldName: string) {
    return sql`
      SELECT
        COUNT(DISTINCT data->${sql.param(fieldName)}) as distinct_count,
        COUNT(*) - COUNT(data->${sql.param(fieldName)}) as null_count,
        jsonb_typeof(data->${sql.param(fieldName)}) as inferred_type
      FROM ingestion_rows
      WHERE batch_id = ${batchId}
        AND data ? ${sql.param(fieldName)}
    `;
  }
}
```

---

## Research Confidence Assessment

| Pitfall Category | Confidence | Notes |
|------------------|-----------|-------|
| JSONB aggregation performance | HIGH | Official PostgreSQL docs + multiple authoritative sources on GIN indexes |
| Type inference on mixed types | HIGH | PostgreSQL jsonb_typeof() documented, null handling verified |
| Large value list rendering | HIGH | React virtualization well-documented, react-window established pattern |
| View toggle state management | MEDIUM | React Query caching patterns verified, but view-specific less documented |
| Side sheet modal behavior | MEDIUM | shadcn Sheet docs confirm modal prop, UX sources on non-modal patterns |
| Clipboard API browser security | HIGH | MDN documentation + recent 2026 articles on permissions |
| Field name special characters | MEDIUM | PostgreSQL JSONB docs clear, Excel A1 notation documented, but integration scenarios less common |
| Search input debouncing | HIGH | Standard React performance pattern, well-documented |
| Drizzle JSONB limitations | MEDIUM | GitHub issues confirm lack of native helpers, sql template workaround verified |
| Integration with Populatte | HIGH | Direct codebase analysis (schema files, existing patterns) |

---

## Sources

### PostgreSQL JSONB Performance
- [PostgreSQL JSONB and Statistics](https://blog.anayrat.info/en/2017/11/26/postgresql-jsonb-and-statistics/)
- [How to avoid performance bottlenecks when using JSONB in PostgreSQL](https://www.metisdata.io/blog/how-to-avoid-performance-bottlenecks-when-using-jsonb-in-postgresql)
- [Postgres large JSON value query performance](https://www.evanjones.ca/postgres-large-json-performance.html)
- [PostgreSQL Indexing Strategies for JSONB Columns](https://www.rickychilcott.com/2025/09/22/postgresql-indexing-strategies-for-jsonb-columns/)
- [PostgreSQL JSONB - Powerful Storage for Semi-Structured Data](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage)
- [5mins of Postgres: JSONB TOAST performance cliffs](https://pganalyze.com/blog/5mins-postgres-jsonb-toast)

### PostgreSQL JSONB Queries
- [PostgreSQL JSON Functions and Operators](https://www.postgresql.org/docs/current/functions-json.html)
- [PostgreSQL JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL: NULL values in JSONB](https://mbork.pl/2020-02-15_PostgreSQL_and_null_values_in_jsonb)
- [PostgreSQL JSONB special characters and escaping](https://runebook.dev/en/docs/postgresql/datatype-json/string)

### React Virtualization
- [React Virtualized: Improving Performance for Large Lists](https://medium.com/@ignatovich.dm/virtualization-in-react-improving-performance-for-large-lists-3df0800022ef)
- [How to Optimize React Dashboard Rendering Performance](https://www.zigpoll.com/content/how-can-i-optimize-the-rendering-performance-of-large-datasets-in-a-react-dashboard-using-virtualization-techniques)
- [Efficient rendering of large lists with react-select](https://fasterthanlight.me/blog/post/react-select)
- [React select is slow with 1000+ items](https://github.com/JedWatson/react-select/issues/3128)
- [Optimize react-select to smoothly render 10k+ data](https://www.botsplash.com/post/optimize-your-react-select-component-to-smoothly-render-10k-data)

### React State Management
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025)
- [Top State Management Pitfalls in Modern UI](https://logicloom.in/state-management-gone-wrong-avoiding-common-pitfalls-in-modern-ui-development/)

### Modal/Sheet UX Patterns
- [Modal vs Drawer: When to use the right component](https://medium.com/@ninad.kotasthane/modal-vs-drawer-when-to-use-the-right-component-af0a76b952da)
- [Modal and Non-Modal components in UI design](https://medium.com/design-bootcamp/ux-blueprint-09-modal-and-non-modal-components-in-ui-design-why-they-matter-75e6ffb62946)
- [Exploring Drawer and Sheet Components in shadcn UI](https://medium.com/@enayetflweb/exploring-drawer-and-sheet-components-in-shadcn-ui-cf2332e91c40)
- [Modal UX design: Patterns, examples, and best practices](https://blog.logrocket.com/ux-design/modal-ux-design-patterns-examples-best-practices/)

### Clipboard API
- [Clipboard API - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [Unblocking clipboard access](https://web.dev/articles/async-clipboard)
- [JavaScript Clipboard API with fallback](https://www.sitelint.com/blog/javascript-clipboard-api-with-fallback)
- [Safeguarding User Privacy with Permissions-Policy Clipboard-Read](https://www.softforge.co.uk/blogs/all-topics/safeguarding-user-privacy-with-the-permissions-policy-clipboard-read-directive)

### Drizzle ORM JSONB
- [Drizzle ORM: Custom types](https://orm.drizzle.team/docs/custom-types)
- [Best way to query jsonb field - Drizzle Team](https://www.answeroverflow.com/m/1188144616541802506)
- [GitHub Drizzle: Native JSONB query support](https://github.com/drizzle-team/drizzle-orm/issues/1690)
- [API with NestJS: Handling JSON data with PostgreSQL and Drizzle](https://wanago.io/2024/07/15/api-nestjs-json-drizzle-postgresql/)

### Excel Column Naming
- [Using A1 or R1C1 Reference Notation in Excel](https://trumpexcel.com/a1-r1c1-reference-notation-excel/)
- [Excel Named Ranges: What characters are allowed](https://www.excelforum.com/excel-general/568288-named-ranges-what-characters-are-or-are-not-allowed-in-the-nam.html)
- [Refer to Cells and Ranges by Using A1 Notation](https://learn.microsoft.com/en-us/office/vba/excel/concepts/cells-and-ranges/refer-to-cells-and-ranges-by-using-a1-notation)

### PostgreSQL Parameter Limits
- [Passing the Postgres 65535 parameter limit](https://klotzandrew.com/blog/postgres-passing-65535-parameter-limit/)
- [PostgreSQL: Appendix K. PostgreSQL Limits](https://www.postgresql.org/docs/current/limits.html)
