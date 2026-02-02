# Phase 20: Frontend View Values Side Sheet - Research

**Researched:** 2026-02-02
**Domain:** React side sheet with infinite scroll, search, and clipboard interaction
**Confidence:** HIGH

## Summary

This phase implements a non-modal side sheet for exploring distinct field values with search and copy functionality. The implementation leverages the existing Phase 18 backend endpoint (`GET /batches/:batchId/fields/:fieldKey/values`) and builds a controlled Sheet component using shadcn/ui primitives (Radix Dialog).

The standard stack is already in place: shadcn/ui Sheet component (built on Radix Dialog), TanStack Query v5 for infinite scroll with `useInfiniteQuery`, native Clipboard API for copy functionality, and debounced search input. The architecture follows the established pattern from Phase 19 (field inventory) where FieldCard onClick triggers the sheet open.

**Primary recommendation:** Build the side sheet as a controlled component using shadcn/ui Sheet (Radix Dialog primitive), manage open state and selected field in the BatchFieldInventory parent, implement infinite scroll with TanStack Query's useInfiniteQuery + react-intersection-observer, and use native Clipboard API with inline checkmark feedback (no toast).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Sheet | Latest | Side panel UI | Already installed, built on Radix Dialog with accessibility |
| TanStack Query | 5.90.20 | Infinite scroll data fetching | Already in use, useInfiniteQuery for pagination |
| Radix Dialog | Latest (via Sheet) | Controlled modal primitive | Handles ESC key, backdrop clicks, focus trap automatically |
| Clipboard API | Native browser | Copy to clipboard | No dependencies, well-supported across modern browsers |
| react-intersection-observer | 9.x | Infinite scroll trigger | Performant, integrates seamlessly with useInfiniteQuery |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | 0.555.0 | Icons (X, Copy, CheckCheck) | Already in use throughout project |
| Zod | 4.3.6 | Runtime validation for API responses | Existing pattern for API data |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useInfiniteQuery | Manual scroll listener + useQuery | useInfiniteQuery handles page merging, hasNextPage logic automatically |
| Native Clipboard API | react-copy-to-clipboard | Native API is zero-dependency, equally well-supported |
| react-intersection-observer | Manual IntersectionObserver | Hook is cleaner, handles cleanup automatically |
| Radix Dialog (Sheet) | Custom modal | Radix provides keyboard nav, focus trap, ESC key handling out of the box |

**Installation:**
```bash
cd apps/web
pnpm add react-intersection-observer
# Sheet component already installed via shadcn/ui
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── components/projects/
│   ├── batch-field-inventory.tsx          # Add Sheet state management here
│   ├── field-card.tsx                     # Wire onClick to open sheet
│   ├── field-values-side-sheet.tsx        # NEW: Side sheet component
│   └── field-value-row.tsx                # NEW: Individual value row with copy
├── lib/
│   ├── query/hooks/
│   │   └── use-batches.ts                 # Add useFieldValuesInfinite hook here
│   ├── api/
│   │   ├── endpoints/batches.ts           # Add getFieldValues method
│   │   └── schemas/
│   │       └── field-values.schema.ts     # NEW: Zod schemas for field values response
│   └── hooks/
│       └── use-debounce.ts                # NEW: Debounce hook for search input
```

### Pattern 1: Controlled Sheet with Dynamic Content Swapping
**What:** Sheet open state controlled by parent, content changes based on selected field
**When to use:** When clicking different field cards should swap content without closing
**Example:**
```typescript
// Source: Radix Dialog controlled pattern
'use client';

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function BatchFieldInventory({ projectId, batchId, totalRows }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const handleFieldClick = (fieldName: string) => {
    setSelectedField(fieldName);
    setIsSheetOpen(true); // Open sheet with new field
  };

  return (
    <>
      <div className="grid">
        {fields.map((field) => (
          <FieldCard
            key={field.fieldName}
            field={field}
            onClick={() => handleFieldClick(field.fieldName)}
          />
        ))}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          {selectedField && (
            <FieldValuesSideSheet
              projectId={projectId}
              batchId={batchId}
              fieldName={selectedField}
              onFieldChange={(newFieldName) => setSelectedField(newFieldName)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### Pattern 2: useInfiniteQuery with react-intersection-observer
**What:** TanStack Query infinite scroll integrated with IntersectionObserver trigger
**When to use:** Loading paginated data as user scrolls within the sheet
**Example:**
```typescript
// Source: TanStack Query + react-intersection-observer integration
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function useFieldValuesInfinite(
  projectId: string,
  batchId: string,
  fieldKey: string,
  search?: string
) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useInfiniteQuery({
    queryKey: ['projects', projectId, 'batches', batchId, 'field-values', fieldKey, { search }],
    queryFn: ({ pageParam = 0 }) =>
      endpoints.getFieldValues(projectId, batchId, fieldKey, {
        limit: 50,
        offset: pageParam,
        search,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.values.length, 0);
      return loadedCount < lastPage.matchingCount ? loadedCount : undefined;
    },
    enabled: !!projectId && !!batchId && !!fieldKey,
  });
}

// In component
function ValueList() {
  const { ref, inView } = useInView();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFieldValuesInfinite(...);

  // Auto-fetch when scrolling to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.values.map((value) => (
            <ValueRow key={value} value={value} count={0} />
          ))}
        </React.Fragment>
      ))}
      <div ref={ref}>
        {isFetchingNextPage ? 'Loading...' : hasNextPage ? '' : ''}
      </div>
    </div>
  );
}
```

### Pattern 3: Debounced Search Input
**What:** Custom hook to delay search query updates until user stops typing
**When to use:** Search input that triggers API calls (prevents excessive requests)
**Example:**
```typescript
// Source: React hooks best practices
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage in component
const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebounce(searchInput, 300); // 300ms delay

// Pass debouncedSearch to useInfiniteQuery, not searchInput
const { data } = useFieldValuesInfinite(projectId, batchId, fieldKey, debouncedSearch);
```

### Pattern 4: Clipboard API with Inline Feedback
**What:** Native browser Clipboard API with temporary icon swap for feedback
**When to use:** Copy button that provides immediate visual confirmation
**Example:**
```typescript
// Source: Native Clipboard API with React state
import { useState } from 'react';
import { Copy, CheckCheck } from 'lucide-react';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500); // Reset after 1.5s
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Copy value"
    >
      {copied ? (
        <CheckCheck className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}
```

### Pattern 5: Sheet Header with Stats Badges
**What:** Sheet header showing field metadata (type badge, presence count, unique count)
**When to use:** Providing context about the field being explored
**Example:**
```typescript
// Source: Existing badge patterns from FieldCard
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

function FieldValueSheetHeader({ fieldName, inferredType, presenceCount, uniqueCount }) {
  return (
    <SheetHeader>
      <div className="flex items-center gap-2">
        <SheetTitle>{fieldName}</SheetTitle>
        <Badge variant={getTypeBadgeVariant(inferredType)}>
          {inferredType}
        </Badge>
      </div>
      <SheetDescription>
        {presenceCount} registros • {uniqueCount} valores únicos
      </SheetDescription>
    </SheetHeader>
  );
}
```

### Pattern 6: Result Count Display
**What:** Shows filtered count vs total count based on backend response
**When to use:** Search is active and results are filtered
**Example:**
```typescript
// Source: Phase 18 dual count system (matchingCount + totalDistinctCount)
function ResultsCount({ data, search }) {
  if (!data?.pages[0]) return null;

  const matchingCount = data.pages[0].matchingCount;
  const totalCount = data.pages[0].totalDistinctCount;

  if (search) {
    return (
      <p className="text-sm text-muted-foreground">
        Mostrando {matchingCount} de {totalCount} valores
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {totalCount} valores únicos
    </p>
  );
}
```

### Anti-Patterns to Avoid
- **Re-opening sheet on content change:** Don't close and re-open, swap content in place via controlled open state
- **Toast notifications for copy:** Don't use toast, inline icon swap is lighter and keeps attention on data
- **Throttle instead of debounce for search:** Throttle still fires during typing, debounce waits until user stops
- **Manual scroll listener:** Don't use onScroll events, IntersectionObserver is more performant
- **Resetting infinite query on search change:** queryKey includes search param, TanStack Query handles cache invalidation automatically

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Side sheet UI | Custom modal with position:fixed | shadcn/ui Sheet (Radix Dialog) | ESC key handling, focus trap, backdrop overlay, animations built-in |
| Infinite scroll trigger | Manual scroll event listener | react-intersection-observer | Low-priority async callbacks, better performance, automatic cleanup |
| Page merging for infinite scroll | Manual array concatenation | TanStack Query useInfiniteQuery | Handles page params, hasNextPage logic, stale data management |
| Debounce search | setTimeout in component | useDebounce hook | Cleanup on unmount, proper dependency tracking |
| Copy to clipboard | Manual document.execCommand | navigator.clipboard.writeText | Modern API, promise-based, better error handling |
| Keyboard shortcuts (ESC) | Manual event listener | Radix Dialog's built-in handler | Handles focus restoration, modal stack, accessibility |

**Key insight:** Radix Dialog (via shadcn/ui Sheet) handles all modal edge cases: ESC key, backdrop clicks, focus trapping, scroll locking, and screen reader announcements. Building these from scratch introduces accessibility bugs.

## Common Pitfalls

### Pitfall 1: Sheet Content Resets on Field Change
**What goes wrong:** When clicking a different field card, sheet content flickers or shows stale data
**Why it happens:** React Query cache key doesn't include field name, or component doesn't reset scroll position
**How to avoid:** Include fieldKey in queryKey array, reset scroll to top when selectedField changes
**Warning signs:** User sees previous field's values briefly before new data loads
```typescript
// WRONG: Missing fieldKey in queryKey
queryKey: ['field-values', projectId, batchId, { search }]

// RIGHT: Include fieldKey to isolate cache per field
queryKey: ['projects', projectId, 'batches', batchId, 'field-values', fieldKey, { search }]

// Also reset scroll position
useEffect(() => {
  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
}, [fieldKey]);
```

### Pitfall 2: Infinite Scroll Triggers Multiple Fetches
**What goes wrong:** fetchNextPage called multiple times in quick succession, duplicating data
**Why it happens:** IntersectionObserver fires multiple times before isFetchingNextPage updates
**How to avoid:** Guard fetchNextPage with `!isFetchingNextPage` check in useEffect
**Warning signs:** Console shows multiple API calls for same offset, duplicate rows rendered
```typescript
// WRONG: No guard against concurrent fetches
useEffect(() => {
  if (inView && hasNextPage) {
    fetchNextPage(); // Can fire multiple times before state updates
  }
}, [inView, hasNextPage, fetchNextPage]);

// RIGHT: Guard with isFetchingNextPage
useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
```

### Pitfall 3: Stale Search Results After Field Change
**What goes wrong:** Search input retains previous field's search term when switching fields
**Why it happens:** Search state lives in parent component and isn't reset on field change
**How to avoid:** Reset search input whenever selectedField changes via useEffect
**Warning signs:** User clicks new field, sees "No matches" because old search term still applies
```typescript
// Reset search when field changes
useEffect(() => {
  setSearchInput(''); // Clear search input
}, [selectedField]);
```

### Pitfall 4: Copy Button Hidden on Mobile
**What goes wrong:** Hover-based opacity means copy button never appears on touch devices
**Why it happens:** CSS `group-hover:opacity-100` doesn't trigger on touch
**How to avoid:** Use `@media (hover: hover)` for hover-only behavior, always visible on touch
**Warning signs:** Mobile users can't find copy button
```css
/* WRONG: Hidden on touch devices */
.copy-button { opacity: 0; }
.group:hover .copy-button { opacity: 100; }

/* RIGHT: Always visible on touch, hover-reveal on desktop */
.copy-button { opacity: 100; } /* Default: visible on mobile */
@media (hover: hover) {
  .copy-button { opacity: 0; }
  .group:hover .copy-button { opacity: 100; }
}
```

### Pitfall 5: Sheet Doesn't Close on Backdrop Click
**What goes wrong:** Clicking outside sheet doesn't close it (ESC key works but backdrop doesn't)
**Why it happens:** SheetOverlay not rendered, or onOpenChange not wired to state
**How to avoid:** Use shadcn/ui Sheet as-is, ensure `onOpenChange` prop connected to state setter
**Warning signs:** Only ESC key closes sheet, backdrop clicks do nothing
```typescript
// WRONG: Missing onOpenChange
<Sheet open={isOpen}>

// RIGHT: onOpenChange wired to state
<Sheet open={isOpen} onOpenChange={setIsOpen}>
```

### Pitfall 6: Loading State Shows Stale Data
**What goes wrong:** During search, old values remain visible while new data loads
**Why it happens:** useInfiniteQuery `isLoading` only true on first load, not on search change
**How to avoid:** Use `isFetching` instead of `isLoading` to detect refetch state
**Warning signs:** User types in search, sees old results for a moment before update
```typescript
// WRONG: Only shows skeleton on initial mount
if (isLoading) return <Skeleton />;

// RIGHT: Shows loading state during search refetch too
if (isFetching && !data) return <Skeleton />;
```

## Code Examples

Verified patterns from official sources:

### Field Values API Endpoint
```typescript
// Source: Existing pattern from batches.ts endpoint file
export function createBatchEndpoints(fetchFn) {
  return {
    async getFieldValues(
      projectId: string,
      batchId: string,
      fieldKey: string,
      params: { limit: number; offset: number; search?: string }
    ): Promise<FieldValuesResponse> {
      const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
      const response = await fetchFn(
        `/projects/${projectId}/batches/${batchId}/fields/${encodeURIComponent(fieldKey)}/values?limit=${params.limit}&offset=${params.offset}${searchParam}`
      );
      const data: unknown = await response.json();

      const result = fieldValuesResponseSchema.safeParse(data);

      if (!result.success) {
        console.error('[API] Field values response validation failed:', result.error.issues);
        throw new Error('Invalid field values data received from server');
      }

      return result.data;
    },
  };
}
```

### Zod Schema for Field Values Response
```typescript
// Source: Existing schema patterns in field-stats.schema.ts
import { z } from 'zod';

export const fieldValuesResponseSchema = z.object({
  values: z.array(z.string()),
  matchingCount: z.number(),
  totalDistinctCount: z.number(),
});

export type FieldValuesResponse = z.infer<typeof fieldValuesResponseSchema>;
```

### Value Row Component with Copy Button
```typescript
// Source: Project patterns + Clipboard API
interface ValueRowProps {
  value: string;
  count: number;
}

export function ValueRow({ value, count }: ValueRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="group flex items-center justify-between px-4 py-3 border-b hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm truncate" title={value}>
          {value}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">{count}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
          aria-label="Copy value"
        >
          {copied ? (
            <CheckCheck className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
```

### Side Sheet with Infinite Scroll
```typescript
// Source: TanStack Query infinite pattern + Radix Dialog
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface FieldValuesSideSheetProps {
  projectId: string;
  batchId: string;
  fieldName: string;
  inferredType: string;
  presenceCount: number;
  uniqueCount: number;
}

export function FieldValuesSideSheet({
  projectId,
  batchId,
  fieldName,
  inferredType,
  presenceCount,
  uniqueCount,
}: FieldValuesSideSheetProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useFieldValuesInfinite(projectId, batchId, fieldName, debouncedSearch);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const matchingCount = data?.pages[0]?.matchingCount ?? 0;
  const totalCount = data?.pages[0]?.totalDistinctCount ?? 0;

  return (
    <div className="flex flex-col h-full">
      <SheetHeader>
        <div className="flex items-center gap-2">
          <SheetTitle>{fieldName}</SheetTitle>
          <Badge variant={getTypeBadgeVariant(inferredType)}>
            {inferredType}
          </Badge>
        </div>
        <SheetDescription>
          {presenceCount} registros • {uniqueCount} valores únicos
        </SheetDescription>
      </SheetHeader>

      <div className="sticky top-0 bg-background py-4 border-b z-10">
        <Input
          placeholder="Buscar valores..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full"
        />
        {data && (
          <p className="text-sm text-muted-foreground mt-2">
            {debouncedSearch
              ? `Mostrando ${matchingCount} de ${totalCount} valores`
              : `${totalCount} valores únicos`}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isFetching && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : matchingCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-muted-foreground">
              {debouncedSearch
                ? 'Nenhum valor corresponde à busca'
                : 'Nenhum valor encontrado'}
            </p>
          </div>
        ) : (
          <>
            {data?.pages.map((page, pageIndex) => (
              <React.Fragment key={pageIndex}>
                {page.values.map((value, valueIndex) => (
                  <ValueRow key={`${pageIndex}-${valueIndex}`} value={value} count={0} />
                ))}
              </React.Fragment>
            ))}
            <div ref={ref} className="py-4 text-center">
              {isFetchingNextPage ? (
                <span className="text-sm text-muted-foreground">Carregando...</span>
              ) : hasNextPage ? (
                <span className="text-sm text-muted-foreground">Role para carregar mais</span>
              ) : (
                <span className="text-sm text-muted-foreground">Fim da lista</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### Empty State Pattern
```typescript
// Source: Existing BatchFieldInventory empty state
import { FileQuestion } from 'lucide-react';

function NoValuesEmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 mb-6">
        <FileQuestion className="h-12 w-12 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mt-2">
        {hasSearch ? 'Nenhum valor corresponde à busca' : 'Nenhum valor encontrado'}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
        {hasSearch
          ? 'Tente buscar por outro termo.'
          : 'Todos os registros têm valores vazios para este campo.'}
      </p>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual scroll listeners | IntersectionObserver via react-intersection-observer | ~2019 | Better performance, async callbacks, less main thread work |
| document.execCommand('copy') | navigator.clipboard.writeText | ~2020 | Promise-based, better error handling, more secure |
| Toast for every copy action | Inline icon swap feedback | Design trend 2024+ | Less intrusive, keeps focus on content |
| Modal for detail views | Side sheet (Radix Dialog) | Design trend 2023+ | Non-blocking, preserves page context |
| Separate queries for each page | useInfiniteQuery with page merging | TanStack Query v4+ | Simplified pagination logic, automatic cache management |

**Deprecated/outdated:**
- **react-copy-to-clipboard package:** Native Clipboard API is now well-supported, extra dependency not needed
- **Custom scroll event throttling:** IntersectionObserver handles this better with low-priority callbacks
- **Full modal for value list:** Side sheets are preferred for exploratory UI (less disruptive)

## Open Questions

Things that couldn't be fully resolved:

1. **Occurrence Count Per Value**
   - What we know: Phase 18 endpoint returns `matchingCount` and `totalDistinctCount` but NOT per-value counts
   - What's unclear: Does the endpoint return count for each value (e.g., "São Paulo — 42")?
   - Recommendation: Check Phase 18 implementation. If backend doesn't return per-value counts, display value without count or add backend enhancement in separate phase. For Phase 20, focus on value display and copy functionality.

2. **Sheet Width on Different Screens**
   - What we know: Sheet should feel like detail panel, not full modal
   - What's unclear: Optimal width for desktop (400px? 540px? 640px?)
   - Recommendation: Start with `w-[400px] sm:w-[540px]` (shadcn/ui Sheet default for right side). Test with long field names and values. Adjust if truncation feels too aggressive.

3. **Search Input Sticky Behavior**
   - What we know: Search should be sticky as user scrolls value list
   - What's unclear: Should it have drop shadow on scroll or just border?
   - Recommendation: Use `sticky top-0 bg-background border-b z-10` (consistent with table header patterns). Add subtle shadow on scroll if desired via IntersectionObserver on first value row.

4. **Debounce Delay for Search**
   - What we know: Debounce prevents excessive API calls
   - What's unclear: 300ms? 500ms?
   - Recommendation: Start with 300ms (standard for search inputs). User testing may reveal need for adjustment.

## Sources

### Primary (HIGH confidence)
- [TanStack Query useInfiniteQuery documentation](https://tanstack.com/query/latest) - Infinite scroll patterns, hasNextPage, fetchNextPage
- [Radix UI Dialog primitives](https://www.radix-ui.com/primitives/docs/components/dialog) - Controlled open state, keyboard handling
- [shadcn/ui Sheet component](https://ui.shadcn.com/docs/components/sheet) - Side panel patterns
- [react-intersection-observer npm](https://www.npmjs.com/package/react-intersection-observer) - useInView hook for scroll trigger
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - navigator.clipboard.writeText

### Secondary (MEDIUM confidence)
- [Implementing copy-to-clipboard in React with Clipboard API - LogRocket](https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/) - Clipboard feedback patterns
- [How to Create Infinite Scrolling in React Using the Intersection Observer API - freeCodeCamp](https://www.freecodecamp.org/news/infinite-scrolling-in-react/) - IntersectionObserver integration
- [useDebounce React Hook – useHooks](https://usehooks.com/usedebounce) - Custom debounce hook implementation
- [Beginner's Guide to Closing a Modal in React on Outside Click and Escape Keypress - Medium](https://medium.com/@priyaeswaran/beginners-guide-to-closing-a-modal-in-react-on-outside-click-and-escape-keypress-9812b1d48b84) - ESC key handling (already built into Radix)
- [Exploring Drawer and Sheet Components in shadcn UI - Medium](https://medium.com/@enayetflweb/exploring-drawer-and-sheet-components-in-shadcn-ui-cf2332e91c40) - Sheet component patterns

### Tertiary (LOW confidence)
- None — all patterns verified with official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project (except react-intersection-observer, well-documented)
- Architecture: HIGH - Patterns established in Phase 19 (field inventory), Phase 18 (backend endpoint exists)
- Pitfalls: MEDIUM - Based on common React Query + IntersectionObserver patterns, some project-specific assumptions
- Code examples: HIGH - Derived from existing codebase patterns and official documentation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days — stable stack, no fast-moving dependencies)

## Codebase-Specific Context

**Established patterns to follow:**
- React Query hooks in `lib/query/hooks/use-batches.ts` — add `useFieldValuesInfinite` following same pattern
- API endpoints in `lib/api/endpoints/batches.ts` — add `getFieldValues` method (Phase 18 backend already exists)
- Zod schemas in `lib/api/schemas/` — create `field-values.schema.ts`
- Component structure from `components/projects/batch-field-inventory.tsx` — Sheet state management in parent
- Sheet component from `components/ui/sheet.tsx` — Already installed, built on Radix Dialog
- Copy patterns from Material Design guidelines — inline feedback preferred over toast

**Integration points:**
- FieldCard component: Wire `onClick` prop to open sheet (currently no-op from Phase 19)
- BatchFieldInventory component: Add Sheet state (`isSheetOpen`, `selectedField`)
- Batch detail page: No changes needed, Sheet state managed in BatchFieldInventory

**Type safety chain:**
- Backend: `apps/api/src/core/entities/field-values.entity.ts` defines `FieldValuesResult` (already exists from Phase 18)
- Frontend schemas: Create matching Zod schemas in `field-values.schema.ts`
- React Query: Type `useInfiniteQuery<FieldValuesResponse>` with inferred Zod type
- Components: Props typed with `FieldValuesResponse` from schema

**Styling conventions:**
- Sheet width: `w-[400px] sm:w-[540px]` (shadcn/ui Sheet default for right side)
- Value rows: `px-4 py-3 border-b hover:bg-muted/50` (consistent with table row hover)
- Copy button: `opacity-0 group-hover:opacity-100` with `@media (hover: hover)` for mobile
- Sticky search: `sticky top-0 bg-background border-b z-10` (matches table header pattern)
- Icon sizes: `h-4 w-4` for inline icons (Copy, CheckCheck)
- Empty state: Reuse `LayoutGrid` icon pattern from BatchFieldInventory
