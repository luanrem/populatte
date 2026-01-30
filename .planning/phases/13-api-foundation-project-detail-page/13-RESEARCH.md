# Phase 13: API Foundation & Project Detail Page - Research

**Researched:** 2026-01-30
**Domain:** React data fetching, Zod schema validation, Next.js App Router dynamic routes, FormData uploads
**Confidence:** HIGH

## Summary

Phase 13 establishes the frontend API infrastructure for batch operations and creates the project detail page shell. The research identifies proven patterns for TanStack Query v5 hooks, Zod runtime validation, Next.js 15 dynamic routes with async params, and critical FormData upload fixes.

**Key findings:**
- TanStack Query v5 uses factory pattern for endpoints (already established in codebase)
- FormData uploads MUST NOT set Content-Type header (browser auto-generates multipart boundary)
- Next.js 15 dynamic routes require awaiting params (now a Promise)
- Zod v4 is installed (latest stable) with excellent TypeScript inference via z.infer
- Sonner toast library already integrated for notifications
- shadcn/ui components (Skeleton, Button, Badge) available for UI

The codebase already follows best practices for API client architecture, React Query integration, and Zod validation. The critical blocker is the hardcoded Content-Type header in useApiClient (line 83) which breaks multipart/form-data uploads.

**Primary recommendation:** Remove Content-Type header assignment for FormData requests in useApiClient, follow existing patterns for endpoint factories and React Query hooks, use Next.js 15 async params pattern for dynamic routes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.90.20 | Data fetching, caching, mutations | Industry standard for server state management in React, v5 is stable with useSyncExternalStore |
| zod | 4.3.6 | Runtime schema validation | TypeScript-first validation with static type inference, v4 offers 30-60% performance improvements over v3 |
| next | 16.0.5 | App Router framework | Next.js 15+ with App Router is current (16.x is canary/stable), dynamic routes require async params |
| sonner | 2.0.7 | Toast notifications | Already integrated, accessible, theme-aware toast system |
| lucide-react | 0.555.0 | Icon library | 1667+ icons, tree-shakeable, already integrated with Lucide icons like Upload, FileSpreadsheet |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | 5.2.2 | Zod + React Hook Form integration | Form validation (already used in project forms) |
| class-variance-authority | 0.7.1 | Variant-based styling | shadcn/ui component variants |
| clsx + tailwind-merge | 2.1.1 + 3.4.0 | Conditional class merging | cn() utility (already in codebase) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query | SWR | SWR is simpler but less powerful; React Query has better mutation/cache invalidation patterns |
| Zod | Yup, Joi | Zod is TypeScript-first with zero dependencies; Yup/Joi require @types packages |
| Sonner | react-hot-toast | Sonner has better theme integration and accessibility out of the box |

**Installation:**
```bash
# All dependencies already installed in apps/web/package.json
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── lib/
│   ├── api/
│   │   ├── client.ts              # useApiClient hook (needs FormData fix)
│   │   ├── endpoints/
│   │   │   ├── projects.ts        # Existing factory pattern
│   │   │   └── batches.ts         # NEW: createBatchEndpoints(fetchFn)
│   │   └── schemas/
│   │       ├── project.schema.ts  # Existing Zod schemas
│   │       └── batch.schema.ts    # NEW: Batch response schemas
│   ├── query/
│   │   └── hooks/
│   │       ├── use-projects.ts    # Existing hooks pattern
│   │       └── use-batches.ts     # NEW: Batch query/mutation hooks
│   └── utils.ts                   # cn() utility
├── app/
│   └── (platform)/
│       └── projects/
│           ├── page.tsx           # Existing project list
│           └── [id]/
│               └── page.tsx       # NEW: Project detail page
└── components/
    ├── ui/                        # shadcn/ui components
    │   ├── skeleton.tsx
    │   ├── button.tsx
    │   ├── badge.tsx
    │   └── breadcrumb.tsx         # NEW: Breadcrumb component
    ├── layout/
    │   └── app-header.tsx         # Existing header pattern
    └── projects/
        └── batch-empty-state.tsx  # NEW: Empty state for batches
```

### Pattern 1: Endpoint Factory with FormData Support
**What:** Factory function that creates typed API endpoints, composable with any fetch implementation
**When to use:** All API endpoints (existing pattern in codebase)
**Example:**
```typescript
// Source: apps/web/lib/api/endpoints/projects.ts (existing)
export function createBatchEndpoints(
  fetchFn: (endpoint: string, options?: RequestInit) => Promise<Response>,
) {
  return {
    async list(projectId: string, limit: number, offset: number): Promise<ListBatchesResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/batches?limit=${limit}&offset=${offset}`
      );
      const data: unknown = await response.json();
      const result = listBatchesResponseSchema.safeParse(data);

      if (!result.success) {
        console.error('[API] Batch list validation failed:', result.error.issues);
        throw new Error('Invalid batch list data received from server');
      }

      return result.data;
    },

    async upload(projectId: string, formData: FormData): Promise<BatchResponse> {
      // FormData is passed directly as body
      // DO NOT set Content-Type header (browser handles it)
      const response = await fetchFn(`/projects/${projectId}/batches`, {
        method: 'POST',
        body: formData, // FormData object, not JSON
      });
      const data: unknown = await response.json();
      const result = batchResponseSchema.safeParse(data);

      if (!result.success) {
        console.error('[API] Upload batch validation failed:', result.error.issues);
        throw new Error('Invalid batch data received from server');
      }

      return result.data;
    },
  };
}
```

### Pattern 2: React Query Hooks with Cache Invalidation
**What:** useQuery for reads, useMutation for writes, invalidateQueries on success
**When to use:** All data fetching/mutation operations (existing pattern in codebase)
**Example:**
```typescript
// Source: apps/web/lib/query/hooks/use-projects.ts (existing pattern)
export function useBatches(projectId: string, limit = 20, offset = 0) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<ListBatchesResponse>({
    queryKey: ['projects', projectId, 'batches', { limit, offset }],
    queryFn: () => endpoints.list(projectId, limit, offset),
    enabled: !!projectId,
  });
}

export function useUploadBatch(projectId: string) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<BatchResponse, Error, FormData>({
    mutationFn: (formData) => endpoints.upload(projectId, formData),
    onSuccess: () => {
      // Invalidate batch list cache to trigger refetch
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'batches']
      });
    },
  });
}
```

### Pattern 3: Zod Schema with Type Inference
**What:** Define runtime validation schemas, infer TypeScript types via z.infer
**When to use:** All API response/request validation (existing pattern in codebase)
**Example:**
```typescript
// Source: apps/web/lib/api/schemas/project.schema.ts (existing)
import { z } from 'zod';

export const columnMetadataSchema = z.object({
  originalHeader: z.string(),
  normalizedKey: z.string(),
  inferredType: z.string(),
  position: z.number(),
});

export const batchResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  mode: z.enum(['LIST_MODE', 'PROFILE_MODE']),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']),
  fileCount: z.number(),
  rowCount: z.number(),
  columnMetadata: z.array(columnMetadataSchema),
  totalRows: z.number(), // Extended by GetBatchResult in API
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const listBatchesResponseSchema = z.object({
  items: z.array(batchResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

// Type inference
export type BatchResponse = z.infer<typeof batchResponseSchema>;
export type ListBatchesResponse = z.infer<typeof listBatchesResponseSchema>;
```

### Pattern 4: Next.js 15 Dynamic Routes with Async Params
**What:** Dynamic route segments accessed via awaited params Promise
**When to use:** All dynamic routes in Next.js 15+ App Router
**Example:**
```typescript
// Source: Next.js 15 official docs
// app/(platform)/projects/[id]/page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  // MUST await params in Next.js 15+
  const { id } = await params;

  // Fetch project data server-side (optional, can use client hooks too)
  // const project = await fetchProject(id);

  return (
    <main className="w-full">
      {/* Page content */}
    </main>
  );
}
```

### Pattern 5: FormData Upload Without Content-Type Header
**What:** Pass FormData as fetch body, browser auto-generates multipart boundary
**When to use:** All file upload operations
**Example:**
```typescript
// Source: MDN, GitHub discussions on FormData + fetch
// CRITICAL FIX for apps/web/lib/api/client.ts

// ❌ WRONG (current code at line 83):
headers.set('Content-Type', 'application/json');

// ✅ CORRECT:
// Only set Content-Type for JSON requests
if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
  headers.set('Content-Type', 'application/json');
}

// When FormData is detected, browser automatically sets:
// Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

### Pattern 6: Skeleton Loading States
**What:** Gray placeholder elements that mirror final layout structure
**When to use:** Any loading state (existing pattern in codebase)
**Example:**
```typescript
// Source: apps/web/components/projects/project-grid.tsx (existing)
function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card py-6 shadow-sm">
      <div className="space-y-2 px-6">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex gap-2 px-6">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}
```

### Pattern 7: Empty State with Illustrative Icon
**What:** Centered empty state with Lucide icon, friendly copy, and CTA guidance
**When to use:** Lists/grids with no data (existing pattern in codebase)
**Example:**
```typescript
// Source: apps/web/components/projects/project-empty-state.tsx (existing)
import { FolderKanban } from "lucide-react";

export function BatchEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <div className="flex max-w-sm flex-col items-center space-y-6 text-center">
        <div className="rounded-full bg-muted p-5">
          <FileSpreadsheet className="size-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Nenhuma importacao ainda
          </h3>
          <p className="text-sm text-muted-foreground">
            Que tal comecar agora? Clique no botao "Nova Importacao" acima.
          </p>
        </div>
        {/* NO duplicate CTA button here - directs to button above */}
      </div>
    </div>
  );
}
```

### Pattern 8: Breadcrumb Navigation with usePathname
**What:** Client component that splits pathname into segments for breadcrumbs
**When to use:** Pages with nested navigation hierarchy
**Example:**
```typescript
// Source: Web research on Next.js App Router breadcrumbs
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link href="/" className="text-muted-foreground hover:text-foreground">
        Home
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;

        return (
          <React.Fragment key={href}>
            <span className="text-muted-foreground">/</span>
            {isLast ? (
              <span className="text-foreground font-medium">{segment}</span>
            ) : (
              <Link href={href} className="text-muted-foreground hover:text-foreground">
                {segment}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
```

### Anti-Patterns to Avoid
- **Setting Content-Type for FormData:** Browser MUST auto-generate multipart boundary
- **Not awaiting params in Next.js 15:** params is now a Promise, must be awaited
- **Duplicate CTAs in empty states:** Empty state should guide user to existing action, not duplicate it
- **Skipping Zod validation:** Always validate API responses with safeParse, log errors
- **Client-side pagination state for server pagination:** Use query params (limit/offset in URL)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Breadcrumb navigation | Manual path parsing with state | usePathname + map over segments | Next.js hook provides pathname, splitting/mapping is 10 lines |
| Toast notifications | Custom notification system | Sonner (already integrated) | Accessible, theme-aware, already configured in codebase |
| Loading skeletons | Div with gray background | shadcn/ui Skeleton component | Consistent animation, theming, already available |
| Icon library | SVG files or icon fonts | Lucide React (already integrated) | 1667+ icons, tree-shakeable, TypeScript types |
| Date formatting | Manual date parsing | Native Intl.DateTimeFormat or date-fns | Locale-aware, handles timezones correctly |
| Query cache invalidation | Manual cache clearing | queryClient.invalidateQueries | Automatically refetches active queries, handles dependencies |

**Key insight:** The codebase already has solutions for all common patterns (toasts, skeletons, icons, query hooks). Follow existing patterns rather than creating new abstractions.

## Common Pitfalls

### Pitfall 1: Hardcoded Content-Type Header Breaks FormData Uploads
**What goes wrong:** Setting `Content-Type: application/json` on all requests prevents FormData uploads from working because the browser cannot add the multipart boundary.
**Why it happens:** The current useApiClient code (line 83) sets Content-Type unconditionally without checking if the body is FormData.
**How to avoid:** Only set Content-Type for JSON bodies, detect FormData and skip header assignment.
**Warning signs:** Upload endpoint returns 400 Bad Request, server logs show "multipart boundary not found" or "unexpected end of stream."

**Fix:**
```typescript
// apps/web/lib/api/client.ts line 83
// BEFORE:
headers.set('Content-Type', 'application/json');

// AFTER:
if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
  headers.set('Content-Type', 'application/json');
}
```

### Pitfall 2: Not Awaiting Params in Next.js 15
**What goes wrong:** Accessing `params.id` directly throws runtime error because params is a Promise in Next.js 15.
**Why it happens:** Next.js 15 changed params from sync to async to support streaming layouts.
**How to avoid:** Always `await params` before accessing properties.
**Warning signs:** Runtime error "Cannot read property 'id' of Promise" or TypeScript error if props type is wrong.

**Fix:**
```typescript
// BEFORE:
export default function Page({ params }: { params: { id: string } }) {
  const projectId = params.id; // ❌ Runtime error
}

// AFTER:
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params; // ✅ Correct
}
```

### Pitfall 3: Invalidating Wrong Query Keys
**What goes wrong:** Cache invalidation doesn't trigger refetch because query key doesn't match.
**Why it happens:** React Query uses deep equality on query keys; even slight differences prevent matching.
**How to avoid:** Use consistent query key structure, partial matching with object syntax.
**Warning signs:** Data doesn't refresh after mutation, cache shows stale data.

**Fix:**
```typescript
// WRONG: Invalidating with different key structure
queryClient.invalidateQueries(['batches']); // Doesn't match ['projects', id, 'batches']

// CORRECT: Partial match with object syntax
queryClient.invalidateQueries({
  queryKey: ['projects', projectId, 'batches']
});
```

### Pitfall 4: Forgetting Enabled Flag for Conditional Queries
**What goes wrong:** Query runs before dependencies are ready (e.g., projectId is undefined), throws error.
**Why it happens:** useQuery runs immediately on mount unless disabled with `enabled: false`.
**How to avoid:** Always use `enabled: !!dependency` for queries that depend on props/params.
**Warning signs:** Console errors on page load, query runs with undefined parameters.

**Fix:**
```typescript
// WRONG:
const { data } = useQuery({
  queryKey: ['projects', projectId, 'batches'],
  queryFn: () => endpoints.list(projectId), // Runs with undefined projectId
});

// CORRECT:
const { data } = useQuery({
  queryKey: ['projects', projectId, 'batches'],
  queryFn: () => endpoints.list(projectId),
  enabled: !!projectId, // Only run when projectId is truthy
});
```

### Pitfall 5: Using parse() Instead of safeParse() for API Responses
**What goes wrong:** Zod parse() throws ZodError on validation failure, crashes the app if not caught.
**Why it happens:** parse() is designed for trusted input; API responses are untrusted and should use safeParse().
**How to avoid:** Always use safeParse() for API responses, check result.success, log errors.
**Warning signs:** Unhandled ZodError crashes, no validation error logging.

**Fix:**
```typescript
// WRONG:
const data = responseSchema.parse(json); // Throws on invalid data

// CORRECT:
const result = responseSchema.safeParse(json);
if (!result.success) {
  console.error('[API] Validation failed:', result.error.issues);
  throw new Error('Invalid data received from server');
}
return result.data; // TypeScript knows this is valid
```

## Code Examples

Verified patterns from official sources:

### TanStack Query v5: useMutation with Cache Invalidation
```typescript
// Source: TanStack Query v5 official docs
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: async (formData: FormData) => {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },
  onSuccess: () => {
    // Invalidate and refetch
    void queryClient.invalidateQueries({ queryKey: ['batches'] });
  },
});
```

### Zod v4: Schema Definition with Type Inference
```typescript
// Source: Zod v4 official docs
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string(), // ISO date string
});

// Infer TypeScript type
type User = z.infer<typeof userSchema>;

// Runtime validation
const result = userSchema.safeParse(data);
if (!result.success) {
  console.error('Validation failed:', result.error.issues);
  throw new Error('Invalid user data');
}
const user: User = result.data; // Type-safe
```

### Next.js 15: Dynamic Route with Async Params
```typescript
// Source: Next.js 15 official docs
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  // Can fetch data server-side or use client hooks
  return <ClientComponent projectId={id} />;
}
```

### FormData Upload with Fetch API
```typescript
// Source: MDN Web Docs
const formData = new FormData();
formData.append('documents', file);
formData.append('mode', 'LIST_MODE');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  // DO NOT set Content-Type header
  // Browser automatically sets: multipart/form-data; boundary=...
});
```

### Lucide Icon Usage
```typescript
// Source: Lucide React official docs
import { FileSpreadsheet, Upload, Plus } from 'lucide-react';

<FileSpreadsheet className="size-10 text-muted-foreground" />
<Upload className="size-4" />
<Plus /> {/* Default size from parent */}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Query v3/v4 | React Query v5 | Jan 2024 | isLoading → isPending, requires React 18+, useSyncExternalStore |
| Zod v3 | Zod v4 | Dec 2024 | 30-60% performance improvement, faster TypeScript compilation, Zod Mini for smaller bundles |
| Next.js Pages Router | App Router (Next.js 13-15) | Oct 2022-ongoing | File-based routing, server components, streaming, async params in v15 |
| params as object | params as Promise | Next.js 15 (Oct 2024) | Must await params, enables streaming layouts |
| Manual Content-Type | Auto-detect FormData | Always best practice | Browser manages multipart boundary |

**Deprecated/outdated:**
- **React Query v3/v4:** Use v5 (codebase already on 5.90.20)
- **Zod v3:** Use v4 (codebase already on 4.3.6)
- **getServerSideProps/getStaticProps:** Use App Router async components
- **next/router useRouter:** Use next/navigation usePathname/useRouter in App Router

## Open Questions

Things that couldn't be fully resolved:

1. **Breadcrumb label customization**
   - What we know: Can fetch project name and replace ID with readable label
   - What's unclear: Whether to fetch server-side in layout or client-side in component
   - Recommendation: Use client-side useProject hook to fetch name, show ID as fallback while loading

2. **Toast notification positioning**
   - What we know: Sonner is already configured in app/layout.tsx
   - What's unclear: Default position preference (top-right vs bottom-right vs bottom-center)
   - Recommendation: Keep existing configuration, positioning is Claude's discretion per CONTEXT.md

3. **Skeleton count for batch grid**
   - What we know: Project grid shows 6 skeletons (apps/web/components/projects/project-grid.tsx)
   - What's unclear: Whether batch grid should match (6) or differ based on expected volume
   - Recommendation: Use 6 for consistency with existing pattern

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 official docs](https://tanstack.com/query/v5/docs/framework/react/guides/mutations) - useQuery, useMutation, cache invalidation
- [Zod v4 GitHub](https://github.com/colinhacks/zod) - Schema validation, z.infer type inference
- [Next.js 15 File Conventions: Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) - Async params pattern
- [MDN: Using FormData Objects](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects) - FormData with fetch
- [Lucide React official docs](https://lucide.dev/guide/packages/lucide-react) - Icon library usage

### Secondary (MEDIUM confidence)
- [Next.js Dynamic Route Segments 2026 Guide](https://thelinuxcode.com/nextjs-dynamic-route-segments-in-the-app-router-2026-guide/) - Verified with official docs
- [FormData Multipart Fetch](https://muffinman.io/blog/uploading-files-using-fetch-multipart-form-data/) - Verified with MDN
- [Creating Dynamic Breadcrumb in Next.js App Router](https://medium.com/@kcabading/creating-a-breadcrumb-component-in-a-next-js-app-router-a0ea24cdb91a) - Community pattern, verified with official docs

### Tertiary (LOW confidence)
- None - all findings verified with authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in package.json and official docs
- Architecture: HIGH - Patterns extracted from existing codebase and official docs
- Pitfalls: HIGH - Content-Type issue confirmed via MDN, GitHub discussions, and testing

**Research date:** 2026-01-30
**Valid until:** 2026-03-30 (60 days - stable libraries with established patterns)
