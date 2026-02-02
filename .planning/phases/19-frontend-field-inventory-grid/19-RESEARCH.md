# Phase 19: Frontend Field Inventory Grid - Research

**Researched:** 2026-02-02
**Domain:** Frontend UI with React, Next.js 16, TanStack Query v5, shadcn/ui, Tailwind CSS
**Confidence:** HIGH

## Summary

This phase implements a card-based field exploration UI on the batch detail page. The implementation leverages existing patterns from the codebase (React Query hooks, shadcn/ui components, responsive grids) and introduces a view toggle between table and field inventory views.

The standard stack is already in place: Next.js 16 with React 19.2, TanStack Query v5.90.20 for data fetching, shadcn/ui components for UI primitives, and Tailwind CSS v4 for styling. The architecture follows established patterns from Phase 16 (batch data table) and Phase 17 (field stats endpoint).

**Primary recommendation:** Build the field inventory grid as a new client component alongside the existing BatchDataTable component, using a view toggle component to switch between them. Leverage the existing field stats endpoint from Phase 17 and follow the same React Query patterns established in use-batches.ts.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.0.5 | App Router framework | Current stable release, already in project |
| React | 19.2.0 | UI library | Latest stable, paired with Next.js 16 |
| TanStack Query | 5.90.20 | Data fetching & caching | Already in use for batches, projects |
| shadcn/ui | Latest | UI component library | Project standard, already integrated |
| Tailwind CSS | 4.x | Styling framework | Existing styling approach |
| Lucide React | 0.555.0 | Icon library | Already in use throughout project |
| Zod | 4.3.6 | Runtime validation | Existing pattern for API responses |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | Component variants | Badge type colors, card states |
| clsx / tailwind-merge | Latest | Class merging | Conditional styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query | SWR | TanStack Query already established, no reason to switch |
| shadcn/ui | Custom components | Violates project standard, not accessible |
| CSS Grid | Flexbox | Grid better for uniform card heights |

**Installation:**
No new packages required. All components already available via shadcn/ui CLI:
```bash
cd apps/web
pnpm dlx shadcn@latest add toggle-group  # For view switcher
pnpm dlx shadcn@latest add progress       # For presence progress bars
# input, badge, card, skeleton already installed
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/(platform)/projects/[id]/batches/[batchId]/
│   └── page.tsx                          # Add view toggle state here
├── components/projects/
│   ├── batch-data-table.tsx              # Existing table view
│   ├── batch-field-inventory.tsx         # NEW: Field inventory grid
│   ├── field-card.tsx                    # NEW: Individual field card
│   └── batch-view-toggle.tsx             # NEW: View switcher component
└── lib/
    ├── query/hooks/
    │   └── use-batches.ts                # Add useFieldStats hook here
    └── api/
        ├── endpoints/batches.ts          # Add getFieldStats method
        └── schemas/
            └── field-stats.schema.ts     # NEW: Zod schemas for field stats

```

### Pattern 1: View Toggle State Management
**What:** Client-side state for switching between table and field inventory views
**When to use:** On the batch detail page, managing view preference per session (no persistence)
**Example:**
```typescript
// Source: Established Next.js 16 App Router pattern
'use client';

import { useState } from 'react';

export default function BatchDetailPage({ params }) {
  const { id, batchId } = use(params);
  const { data: batch } = useBatch(id, batchId);

  // Default view based on batch mode
  const defaultView = batch?.mode === 'PROFILE_MODE' ? 'inventory' : 'table';
  const [view, setView] = useState<'table' | 'inventory'>(defaultView);

  return (
    <>
      <BatchViewToggle view={view} onViewChange={setView} />
      {view === 'table' ? (
        <BatchDataTable {...props} />
      ) : (
        <BatchFieldInventory {...props} />
      )}
    </>
  );
}
```

### Pattern 2: React Query Hook for Field Stats
**What:** Custom hook following existing use-batches.ts pattern
**When to use:** Fetching field stats for the inventory view
**Example:**
```typescript
// Source: Existing pattern from use-batches.ts
export function useFieldStats(projectId: string, batchId: string) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<FieldStatsResponse>({
    queryKey: ['projects', projectId, 'batches', batchId, 'field-stats'],
    queryFn: () => endpoints.getFieldStats(projectId, batchId),
    enabled: !!projectId && !!batchId,
  });
}
```

### Pattern 3: Responsive Grid with Auto-Fill
**What:** Tailwind CSS grid that auto-fills columns based on screen width
**When to use:** Card grid layout for field inventory
**Example:**
```typescript
// Source: Tailwind CSS auto-fill pattern
<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
  {fields.map((field) => (
    <FieldCard key={field.fieldName} field={field} totalRows={totalRows} />
  ))}
</div>
```

### Pattern 4: Toggle Group Component (shadcn/ui)
**What:** Icon-based toggle for view switching
**When to use:** Compact view switcher like Notion
**Example:**
```typescript
// Source: shadcn/ui toggle-group documentation
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { LayoutGrid, Table } from "lucide-react"

export function BatchViewToggle({ view, onViewChange }) {
  return (
    <ToggleGroup type="single" value={view} onValueChange={onViewChange}>
      <ToggleGroupItem value="table" aria-label="Table view">
        <Table className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="inventory" aria-label="Field inventory">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```

### Pattern 5: Debounced Search Input
**What:** Custom hook for debouncing search filter input
**When to use:** Filter field cards by field name without excessive re-renders
**Example:**
```typescript
// Source: React hooks best practices
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage in component
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

const filteredFields = fields.filter(f =>
  f.fieldName.toLowerCase().includes(debouncedSearch.toLowerCase())
);
```

### Pattern 6: Loading States with Skeleton Cards
**What:** Skeleton loading grid matching card structure
**When to use:** While field stats are loading
**Example:**
```typescript
// Source: Existing pattern from batch-data-table.tsx
if (isLoading && !data) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-2 w-full mb-2" />
          <Skeleton className="h-4 w-24" />
        </Card>
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Global state for view toggle:** Don't use Zustand/Redux for simple view state — useState is sufficient
- **Eager re-fetching:** Don't refetch field stats on every view toggle — TanStack Query caching handles this
- **Masonry layout:** Don't use varying card heights — uniform heights create cleaner visual alignment
- **Custom toggle component:** Don't build from scratch — use shadcn/ui ToggleGroup
- **Uncontrolled search:** Don't filter on every keystroke — debounce to 300ms
- **Percentage calculations in component:** Do math in the card component, not at grid level

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| View toggle UI | Custom button group | shadcn/ui ToggleGroup | Accessibility, keyboard nav, ARIA labels |
| Progress bar | div with width % | shadcn/ui Progress | ARIA attributes, screen reader support |
| Card skeleton | Custom placeholder | shadcn/ui Skeleton | Consistent loading animation across app |
| Search input | Plain input + onChange | Input + useDebounce hook | Prevents excessive re-renders, better UX |
| Type badge colors | Inline color logic | Badge variant + CVA | Centralized variant management |
| Grid layout | Custom responsive logic | Tailwind auto-fill grid | Handles edge cases, responsive breakpoints |
| Data fetching | fetch + useState | TanStack Query useQuery | Caching, loading states, error handling |

**Key insight:** shadcn/ui components are built with Radix UI primitives — they handle accessibility, keyboard navigation, and screen reader support that custom components would miss.

## Common Pitfalls

### Pitfall 1: Stale Default View After Mode Change
**What goes wrong:** Default view is set once on mount, but if batch mode changes or data loads late, user sees wrong view
**Why it happens:** useState initializer runs once, before batch data loads
**How to avoid:** Use useEffect to update view when batch mode loads
**Warning signs:** PROFILE_MODE batches opening in table view on first load
```typescript
// WRONG: Default view set before data loads
const [view, setView] = useState(defaultView); // batch might be undefined

// RIGHT: Update view when batch loads
const [view, setView] = useState<'table' | 'inventory'>('table');

useEffect(() => {
  if (batch?.mode === 'PROFILE_MODE') {
    setView('inventory');
  } else if (batch?.mode === 'LIST_MODE') {
    setView('table');
  }
}, [batch?.mode]);
```

### Pitfall 2: N+1 Card Rendering Performance
**What goes wrong:** Each field card does percentage calculation, causing wasted renders
**Why it happens:** totalRows passed as prop, causing all cards to re-render when parent re-renders
**How to avoid:** Memoize totalRows or calculate percentage inside card with useMemo
**Warning signs:** Lag when typing in search input with many fields
```typescript
// In FieldCard component
const presencePercentage = useMemo(
  () => (field.presenceCount / totalRows) * 100,
  [field.presenceCount, totalRows]
);
```

### Pitfall 3: Incorrect Grid Column Sizing on Mobile
**What goes wrong:** Cards too narrow on mobile (minmax too small) or overflow (minmax too large)
**Why it happens:** Fixed minmax doesn't account for padding, gap, and container constraints
**How to avoid:** Test minmax values at mobile breakpoints (320px, 375px, 414px)
**Warning signs:** Horizontal scroll on mobile or cards crushed to unreadable width

### Pitfall 4: Search Filter Doesn't Update Grid
**What goes wrong:** Filtered fields array doesn't trigger re-render
**Why it happens:** React doesn't detect changes in derived state
**How to avoid:** Use debouncedSearch as dependency in useMemo for filtered fields
**Warning signs:** Search input updates but cards don't filter
```typescript
const filteredFields = useMemo(
  () => fields.filter(f =>
    f.fieldName.toLowerCase().includes(debouncedSearch.toLowerCase())
  ),
  [fields, debouncedSearch] // Include both dependencies
);
```

### Pitfall 5: Toggle Group Loses State on Re-render
**What goes wrong:** View toggle resets to default after parent re-renders
**Why it happens:** Controlled component without proper state lifting
**How to avoid:** Ensure view state lives in parent page component, not toggle component
**Warning signs:** View resets when data refetches or user interacts with other parts of page

### Pitfall 6: Missing Empty State for Zero Fields
**What goes wrong:** Blank screen or error when batch has no fields
**Why it happens:** Grid renders with empty array, showing nothing
**How to avoid:** Check fields.length === 0 and show empty state component
**Warning signs:** Blank white space when viewing batch with no data

## Code Examples

Verified patterns from official sources:

### Field Card Component Structure
```typescript
// Source: Project patterns + shadcn/ui Card component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface FieldCardProps {
  field: FieldStats;
  totalRows: number;
  onClick?: () => void;
}

export function FieldCard({ field, totalRows, onClick }: FieldCardProps) {
  const presencePercentage = (field.presenceCount / totalRows) * 100;
  const isUnique = field.uniqueCount === totalRows;
  const isLowPresence = presencePercentage < 50;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{field.fieldName}</CardTitle>
        <Badge variant={getTypeBadgeVariant(field.inferredType)}>
          {field.inferredType}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress
          value={presencePercentage}
          className={isLowPresence ? 'bg-amber-200' : undefined}
        />
        <p className="text-sm text-muted-foreground">
          {field.presenceCount} of {totalRows} records ({presencePercentage.toFixed(1)}%)
        </p>
        <p className="text-sm text-muted-foreground">
          {field.uniqueCount} unique value{field.uniqueCount !== 1 ? 's' : ''}
          {isUnique && ' (likely ID)'}
        </p>
        {field.sampleValues.length > 0 && (
          <div className="text-xs text-muted-foreground truncate">
            {field.sampleValues.slice(0, 3).join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Type Badge Color Mapping
```typescript
// Source: Existing badge patterns in batch-card.tsx
function getTypeBadgeVariant(type: InferredType): string {
  const typeConfig = {
    STRING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    NUMBER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    DATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    BOOLEAN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    UNKNOWN: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  };
  return typeConfig[type];
}
```

### Search Filter Input
```typescript
// Source: shadcn/ui Input component
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

<div className="flex items-center gap-2 mb-4">
  <div className="relative flex-1 max-w-sm">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Filter fields..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-9"
    />
  </div>
</div>
```

### Zod Schema for Field Stats Response
```typescript
// Source: Existing schema patterns in batch.schema.ts
import { z } from 'zod';

export const inferredTypeSchema = z.enum([
  'STRING',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'UNKNOWN',
]);

export const fieldStatsSchema = z.object({
  fieldName: z.string(),
  presenceCount: z.number(),
  uniqueCount: z.number(),
  inferredType: inferredTypeSchema,
  confidence: z.number(),
  sampleValues: z.array(z.unknown()),
});

export const fieldStatsResponseSchema = z.object({
  totalRows: z.number(),
  fields: z.array(fieldStatsSchema),
});

export type InferredType = z.infer<typeof inferredTypeSchema>;
export type FieldStats = z.infer<typeof fieldStatsSchema>;
export type FieldStatsResponse = z.infer<typeof fieldStatsResponseSchema>;
```

### Empty State Component
```typescript
// Source: Pattern from batch-table-empty-state.tsx
import { FileQuestion } from "lucide-react";

export function FieldInventoryEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No fields found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This batch has no fields or no data rows.
      </p>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| placeholderData (deprecated) | keepPreviousData | TanStack Query v5 | Already used in useBatchRows, same pattern |
| Custom debounce with lodash | useDebounce hook | React hooks era | No external dependency needed |
| Flexbox cards | CSS Grid auto-fill | Tailwind CSS v3+ | Uniform heights, better responsive behavior |
| Manual toggle state | shadcn/ui ToggleGroup | shadcn/ui v2+ | Built-in accessibility |
| Manual skeleton | shadcn/ui Skeleton | Project standard | Consistent loading states |

**Deprecated/outdated:**
- **react-window for virtualization:** Not needed for field inventory (max ~50-100 fields per batch)
- **CSS-in-JS for card styling:** Tailwind CSS is project standard
- **Redux for view toggle:** Overkill for local component state
- **Intersection Observer for lazy loading:** Fields load all at once, no pagination

## Open Questions

Things that couldn't be fully resolved:

1. **Sample Values Selection Strategy**
   - What we know: API returns `sampleValues: unknown[]` from Phase 17
   - What's unclear: Are these first N distinct, random, or most common?
   - Recommendation: Inspect Phase 17 implementation to confirm. Display first 2-3 as muted text. If truncation needed, use CSS `truncate` class.

2. **Presence Threshold for Color Shift**
   - What we know: Amber/red for low presence fields
   - What's unclear: Exact threshold percentage (30%? 50%? 70%?)
   - Recommendation: Start with 50% threshold. Visual indicator should help users spot sparse fields. Test with real data.

3. **Grid Column Count at Breakpoints**
   - What we know: ~3-4 columns on desktop, 1-2 on mobile
   - What's unclear: Exact minmax value for responsive behavior
   - Recommendation: Use `minmax(280px, 1fr)` for auto-fill. Test at 320px, 768px, 1024px, 1440px screen widths.

4. **Empty State Illustration**
   - What we know: Should show when no fields or no rows
   - What's unclear: Use Lucide icon or custom illustration?
   - Recommendation: Use `FileQuestion` icon from lucide-react (consistent with existing empty states in project).

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 Documentation](https://tanstack.com/query/latest/docs/framework/react/guides/queries) - useQuery patterns, loading states
- [shadcn/ui Toggle Group](https://ui.shadcn.com/docs/components/radix/toggle-group) - View switcher component
- [shadcn/ui Progress](https://ui.shadcn.com/docs/components/progress) - Progress bar component
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/base/card) - Card component structure
- [Tailwind CSS Grid Auto-Fill](https://tailwindcss.com/docs/grid-template-columns) - Responsive grid patterns
- [Lucide React Icons](https://lucide.dev/icons/) - LayoutGrid, Table icons for toggle

### Secondary (MEDIUM confidence)
- [Tailwind Responsive Grid Tutorial](https://www.uibun.dev/blog/tailwindcss-responsive-grid) - Auto-fill and auto-fit patterns
- [Next.js 16 State Management](https://www.pronextjs.dev/tutorials/state-management/intro-to-state-management-with-next-js-app-router) - Client component state patterns
- [React Debounce Best Practices](https://usehooks.com/usedebounce) - useDebounce hook pattern
- [CSS Grid Equal Heights](https://www.imarketinx.de/artikel/equal-height-columns-with-css-grid-layout.html) - Uniform card heights

### Tertiary (LOW confidence)
- None — all patterns verified with official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project with verified versions
- Architecture: HIGH - Patterns established in Phase 16 (batch table) and existing components
- Pitfalls: MEDIUM - Based on common React/TanStack Query patterns and codebase inspection
- Code examples: HIGH - Derived from existing codebase patterns and official documentation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days — stable stack, no fast-moving dependencies)

## Codebase-Specific Context

**Established patterns to follow:**
- React Query hooks in `lib/query/hooks/use-batches.ts` — create `useFieldStats` following same pattern
- API endpoints in `lib/api/endpoints/batches.ts` — add `getFieldStats` method
- Zod schemas in `lib/api/schemas/` — create `field-stats.schema.ts`
- Component structure from `components/projects/batch-card.tsx` — mode badges, date formatting
- Loading states from `components/projects/batch-data-table.tsx` — skeleton grid pattern
- Empty states from `components/projects/batch-table-empty-state.tsx` — icon + message

**Integration points:**
- Batch detail page: `app/(platform)/projects/[id]/batches/[batchId]/page.tsx`
- Existing BatchDataTable component: Keep as-is, add view toggle above it
- BatchDetailHeader component: No changes needed, toolbar goes below it
- API client: `useApiClient()` hook provides authenticated fetch wrapper

**Type safety chain:**
- Backend: `apps/api/src/core/entities/field-stats.entity.ts` defines `InferredType`, `FieldStats`, `GetFieldStatsResult`
- Frontend schemas: Create matching Zod schemas in `field-stats.schema.ts`
- React Query: Type `useQuery<FieldStatsResponse>` with inferred Zod type
- Components: Props typed with `FieldStats`, `InferredType` from schema

**Styling conventions:**
- Badge colors: Follow existing mode/status badge patterns (bg-{color}-100 text-{color}-800 dark:bg-{color}-900)
- Card hover: `hover:shadow-md hover:-translate-y-0.5` (established in batch-card.tsx)
- Icon sizes: `h-4 w-4` for toggle icons, `h-3.5 w-3.5` for inline text icons
- Spacing: `gap-4` for grid, `space-y-4` for vertical stacks
- Responsive padding: `px-8 py-6` for page containers (established in batch detail page)
