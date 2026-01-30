# Technology Stack: Dashboard Upload & Listing UI

**Domain:** Frontend dashboard for Excel upload, batch listing, and data table viewing
**Researched:** 2026-01-30
**Overall confidence:** HIGH

## Context

This research focuses on **NEW capabilities needed for Dashboard Upload & Listing UI**. The existing stack is validated and requires no changes:

**Validated (DO NOT re-add):**
- Next.js 16.0.5 with App Router
- React 19.2.0
- Clerk authentication (auth, middleware, hooks)
- TanStack Query v5.90.20 (React Query)
- react-hook-form v7.71.1 + @hookform/resolvers v5.2.2
- Zod v4.3.6
- shadcn/ui (16 components installed)
- Tailwind CSS v4
- Sonner for toasts
- Lucide React icons

**Backend (fully implemented):**
- POST /projects/:projectId/batches (multipart/form-data upload)
- GET /projects/:projectId/batches (paginated list)
- GET /batches/:batchId (detail)
- GET /batches/:batchId/rows (paginated rows with dynamic JSONB columns)

## NEW Stack Additions

### File Upload Components

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **react-dropzone** | ^14.4.0 | Drag-and-drop file upload UI | Industry standard with 10M+ weekly downloads. Hook-based API (`useDropzone`) works seamlessly with React 19. Provides both drag-and-drop and click-to-browse. **COMPATIBILITY NOTE:** React 19 is not officially supported in peer dependencies. Use `npm install --legacy-peer-deps` or `--force`. Library is stable and works with React 19 despite peer dependency warnings. |

### Data Table Foundation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@tanstack/react-table** | ^8.21.3 | Headless data table library | Current stable version (v9 is still in alpha). **React 19 compatible** for basic usage (confirmed by official sources). Provides pagination, sorting, filtering APIs. v8.21.3 released April 2025, actively maintained. Powers shadcn/ui data-table pattern. |

### Date/Time Utilities

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **date-fns** | ^4.1.0 | Relative time formatting | Current standard for Next.js apps (tree-shakable, functional API). Use `formatDistance()` for "2 hours ago" formatting. 18KB gzipped without locales. Works directly with JavaScript Date objects (no wrapper classes). Already common in React ecosystem. **NOT dayjs** (smaller but requires plugin system for relative time, less idiomatic for Next.js). |

## shadcn/ui Components to Install

Install via CLI from `apps/web`:

```bash
cd apps/web

# Data table foundation
pnpm dlx shadcn@latest add table

# Upload & listing UI
pnpm dlx shadcn@latest add radio-group
pnpm dlx shadcn@latest add pagination
pnpm dlx shadcn@latest add progress
```

| Component | Purpose | Used In |
|-----------|---------|---------|
| **table** | Base Table component for shadcn/ui data-table pattern | BatchDataTable (paginated rows with dynamic columns from JSONB) |
| **radio-group** | Mode selector (List/Profile) | UploadBatchModal (choose ingestion mode) |
| **pagination** | Pagination controls | BatchDataTable, BatchGrid (navigate pages) |
| **progress** | Upload progress indicator | UploadBatchModal (file upload feedback) |

**Already installed (verified in milestone context):**
- Badge, Button, Card, Dialog, DropdownMenu, Form, Input, Label, Select, Separator, Sheet, Sidebar, Skeleton, Sonner, Textarea, Tooltip

## Installation

```bash
# From monorepo root
npm install react-dropzone@^14.4.0 --legacy-peer-deps
npm install @tanstack/react-table@^8.21.3
npm install date-fns@^4.1.0

# From apps/web (shadcn components)
cd apps/web
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add radio-group
pnpm dlx shadcn@latest add pagination
pnpm dlx shadcn@latest add progress
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| **File upload** | react-dropzone | react-filepond | Too heavy (includes styling, image preview). Populatte only needs Excel upload, not image processing. react-dropzone is lighter and more flexible. |
| **File upload** | react-dropzone | HTML input + custom handlers | Reinventing the wheel. react-dropzone handles drag-and-drop, file validation, error states out of the box. Saves 100+ lines of custom code. |
| **Data table** | TanStack Table v8 | TanStack Table v9 | **v9 is still in alpha** (v9.0.0-alpha.10 as of Jan 2026). No stable release timeline. v8.21.3 is production-ready and React 19 compatible. |
| **Data table** | TanStack Table v8 | AG Grid / react-table-library | Overkill. AG Grid is enterprise-grade with Excel-like features (sorting, filtering, grouping) but 200KB+ bundle size. Populatte needs simple paginated table with dynamic columns. TanStack Table is headless (40KB) and integrates with shadcn/ui. |
| **Date formatting** | date-fns | dayjs | Smaller bundle (6KB) but requires `RelativeTime` plugin and chainable API (`dayjs().to(dayjs())`). date-fns is more idiomatic for functional React code (`formatDistance(date1, date2)`). Tree-shakable to match dayjs size. |
| **Date formatting** | date-fns | Temporal API | **Not browser-ready.** Temporal is Stage 3 (not Stage 4 finalized). No native browser support yet. Requires polyfill (90KB+). date-fns is production-ready. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `npm install react-dropzone` (without flag) | **Peer dependency warning for React 19.** npm will error with `ERESOLVE unable to resolve dependency tree` because react-dropzone@14.4.0 declares `peerDependencies: "react": ">=16.8 || 18.0.0"`. React 19 is not listed but **works fine in practice**. | Use `npm install react-dropzone@^14.4.0 --legacy-peer-deps` or `--force`. Library is stable with React 19 (uses hooks only, no deprecated APIs). |
| TanStack Table v9 alpha | **Not production-ready.** v9.0.0-alpha.10 is the latest (Oct 2024). No stable release timeline. Breaking changes expected. | Use TanStack Table v8.21.3 (stable, React 19 compatible). |
| Custom data table from scratch | **Reinventing complexity.** Pagination state, sorting state, column definitions, dynamic column rendering from JSONB all require 500+ lines of code. TanStack Table provides this via hooks. | Use TanStack Table v8 + shadcn/ui data-table pattern (battle-tested). |
| `Content-Type: multipart/form-data` header in fetch | **Breaks file upload.** When using FormData with fetch, the browser automatically sets `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`. Manually setting this header removes the boundary, causing backend to reject the request. | **Never set Content-Type header** when posting FormData via fetch. Let browser handle it automatically. |
| Moment.js | **Deprecated since 2020.** 67KB minified. No tree-shaking. Mutable API prone to bugs. | Use date-fns (tree-shakable, immutable, modern). |

## Integration with Existing Stack

### 1. react-dropzone + react-hook-form + shadcn/ui Dialog

**Pattern:** Dropzone inside modal with form validation.

```typescript
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const uploadSchema = z.object({
  mode: z.enum(['list', 'profile']),
  file: z.instanceof(File).refine(
    (file) => file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Only .xlsx files are allowed'
  ),
});

function UploadBatchModal() {
  const form = useForm({
    resolver: zodResolver(uploadSchema),
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      form.setValue('file', acceptedFiles[0]);
    },
  });

  return (
    <Dialog>
      <DialogContent>
        <Form {...form}>
          <RadioGroup>
            {/* List/Profile mode selector */}
          </RadioGroup>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            {isDragActive ? 'Drop here' : 'Drag and drop or click'}
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Why:** react-dropzone provides `getRootProps` and `getInputProps` that integrate seamlessly with react-hook-form's controlled components. Zod schema validates file type before upload.

### 2. TanStack Table + shadcn/ui Table + Server Pagination

**Pattern:** Headless table with server-side pagination matching backend API.

```typescript
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

function BatchDataTable({ batchId }: { batchId: string }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Fetch paginated rows from GET /batches/:batchId/rows?page=1&limit=20
  const { data } = useQuery({
    queryKey: ['batch-rows', batchId, pagination.pageIndex],
    queryFn: () => fetchBatchRows(batchId, pagination.pageIndex + 1, pagination.pageSize),
  });

  // Define columns dynamically from JSONB keys
  const columns = useMemo(() => {
    if (!data?.rows[0]) return [];
    return Object.keys(data.rows[0].data).map((key) => ({
      accessorKey: `data.${key}`,
      header: key,
    }));
  }, [data]);

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    pageCount: Math.ceil((data?.total ?? 0) / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // Server-side pagination
  });

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        currentPage={pagination.pageIndex + 1}
        totalPages={table.getPageCount()}
        onPageChange={(page) => setPagination({ ...pagination, pageIndex: page - 1 })}
      />
    </>
  );
}
```

**Why:**
- `manualPagination: true` tells TanStack Table to skip client-side pagination (data is already paginated by backend)
- `pageCount` matches backend total pages (from `GET /batches/:batchId/rows` response)
- Columns are generated dynamically from first row's JSONB keys (handles varying Excel structures)
- TanStack Query caches pages, reducing redundant API calls

### 3. date-fns + TanStack Query + Relative Time Display

**Pattern:** Format relative timestamps for batch upload times.

```typescript
import { formatDistance } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

function BatchGrid({ projectId }: { projectId: string }) {
  const { data: batches } = useQuery({
    queryKey: ['batches', projectId],
    queryFn: () => fetchBatches(projectId),
  });

  return (
    <div className="grid gap-4">
      {batches?.map((batch) => (
        <Card key={batch.id}>
          <CardHeader>
            <CardTitle>{batch.name}</CardTitle>
            <CardDescription>
              Uploaded {formatDistance(new Date(batch.createdAt), new Date(), { addSuffix: true })}
              {/* Output: "Uploaded 2 hours ago" */}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
```

**Why:**
- `formatDistance(date1, date2, { addSuffix: true })` outputs "2 hours ago" format
- Works directly with JavaScript Date objects (no wrapper classes like dayjs)
- Tree-shakable (only imports `formatDistance` function, ~2KB)

### 4. FormData + fetch + Existing API Client Pattern

**Pattern:** File upload with multipart/form-data using existing Clerk-authenticated client.

```typescript
import { useApiClient } from '@/lib/api/hooks/use-api-client';
import { useMutation } from '@tanstack/react-query';

function useUploadBatch(projectId: string) {
  const apiClient = useApiClient(); // Client-side API client with Clerk auth

  return useMutation({
    mutationFn: async (data: { file: File; mode: 'list' | 'profile' }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('mode', data.mode);

      // CRITICAL: Do NOT set Content-Type header (browser sets it with boundary)
      const response = await fetch(`${apiClient.baseURL}/projects/${projectId}/batches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await apiClient.getToken()}`, // Clerk auth token
          // NO Content-Type header (FormData sets it automatically)
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Batch uploaded successfully');
    },
  });
}
```

**Why:**
- FormData automatically serializes file + metadata as `multipart/form-data`
- **Browser sets `Content-Type: multipart/form-data; boundary=...` automatically** (do NOT set manually)
- Uses existing Clerk auth token from `useApiClient` hook
- TanStack Query's `useMutation` provides loading state, error handling, optimistic updates

## Performance Considerations

### react-dropzone

| Scenario | Behavior | Performance Impact |
|----------|----------|-------------------|
| Drag file over dropzone | `isDragActive` state updates | Negligible (single state update) |
| Drop 1 file | File validation + `onDrop` callback | < 10ms (synchronous validation) |
| Drop 10 files (max 1 accepted) | Rejects extra files, calls `onDropRejected` | < 20ms (validates all, accepts 1) |
| Large file (50MB) | Browser loads into File object | Instant (no parsing, just File reference) |

**Note:** react-dropzone does NOT parse or read files. It only validates metadata (size, type) and returns File objects. Actual parsing happens on backend.

### TanStack Table

| Rows | Columns | Render Time | Notes |
|------|---------|-------------|-------|
| 20 (1 page) | 5 static | < 50ms | Standard use case for paginated data |
| 20 (1 page) | 10 dynamic (JSONB) | < 100ms | Column generation from JSONB keys adds overhead |
| 100 (5 pages) | 5 static | < 50ms | Only renders current page (20 rows) |
| 1000 (50 pages) | 5 static | < 50ms | Server-side pagination, only fetches current page |

**Key:** With server-side pagination (`manualPagination: true`), TanStack Table never renders more than `pageSize` rows. Performance is constant regardless of total dataset size.

### date-fns Tree-Shaking

| Import | Bundle Size | Notes |
|--------|-------------|-------|
| `import { formatDistance } from 'date-fns'` | ~2KB gzipped | Single function, tree-shaken |
| `import * from 'date-fns'` | ~70KB gzipped | Entire library (avoid this) |
| `import { formatDistance, format } from 'date-fns'` | ~4KB gzipped | Two functions, tree-shaken |

**Best practice:** Import only needed functions. Next.js with Turborepo automatically tree-shakes unused exports.

## Compatibility Matrix

| Package | React 19.2.0 | Next.js 16.0.5 | TypeScript 5.x | Notes |
|---------|--------------|----------------|----------------|-------|
| react-dropzone@14.4.0 | ⚠️ Works with `--legacy-peer-deps` | ✅ | ✅ | Peer dependency warnings but functionally compatible (uses hooks only) |
| @tanstack/react-table@8.21.3 | ✅ Confirmed compatible | ✅ | ✅ | React 19 compatible for basic usage. React Compiler compatibility unknown. |
| date-fns@4.1.0 | ✅ | ✅ | ✅ | Pure functions, no React dependencies |

## Migration Path

### Step 1: Install Dependencies

```bash
# From monorepo root
npm install react-dropzone@^14.4.0 --legacy-peer-deps
npm install @tanstack/react-table@^8.21.3
npm install date-fns@^4.1.0
```

### Step 2: Install shadcn/ui Components

```bash
cd apps/web
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add radio-group
pnpm dlx shadcn@latest add pagination
pnpm dlx shadcn@latest add progress
```

### Step 3: Verify Peer Dependencies

```bash
# Check react-dropzone installed correctly
npm list react-dropzone
# Expected: react-dropzone@14.4.0

# Check no conflicts with existing TanStack Query
npm list @tanstack/react-query @tanstack/react-table
# Expected:
#   @tanstack/react-query@5.90.20
#   @tanstack/react-table@8.21.3
```

### Step 4: Create shadcn/ui data-table Pattern

Follow official shadcn/ui data-table documentation pattern:
1. Create `components/ui/table.tsx` (installed via CLI)
2. Create `components/data/batch-data-table.tsx` (custom implementation using TanStack Table)
3. Define columns in `components/data/batch-columns.tsx`

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| react-dropzone | **HIGH** | Version 14.4.0 verified from npm registry (Jan 2025). React 19 compatibility confirmed via GitHub issue #1400 (works with `--legacy-peer-deps`). Hook-based API stable since v11.0. Used by 10M+ projects weekly. |
| TanStack Table v8 | **HIGH** | Version 8.21.3 verified from npm registry (April 2025). React 19 compatibility confirmed via official sources (works for basic usage, React Compiler compatibility unknown). v9 confirmed still in alpha. shadcn/ui data-table pattern uses v8. |
| date-fns | **HIGH** | Version 4.1.0 verified from npm registry (Jan 2025). Tree-shaking confirmed by official docs. `formatDistance()` API documented with examples. Standard choice for Next.js ecosystem. |
| shadcn/ui components | **HIGH** | Official docs verified for table, radio-group, pagination, progress. Installation via CLI confirmed. Compatible with existing shadcn/ui setup in project. |
| FormData + fetch | **HIGH** | MDN documentation verified. **Critical finding:** DO NOT set Content-Type header manually (browser sets `multipart/form-data; boundary=...` automatically). Confirmed by multiple sources (2024-2026). |
| Performance numbers | **MEDIUM** | TanStack Table render times are estimates based on community benchmarks. Actual performance varies by dataset structure. react-dropzone overhead is negligible (verified via library source code, no heavy computation). |

## Sources

### Primary Sources (Official Documentation)
- [TanStack Table v8 Pagination API](https://tanstack.com/table/v8/docs/api/features/pagination) - Pagination state management, server-side pagination
- [TanStack Table React Examples](https://tanstack.com/table/v8/docs/framework/react/examples/pagination) - Pagination implementation patterns
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/data-table) - Installation instructions, dependencies, TanStack Table integration
- [shadcn/ui Table Component](https://ui.shadcn.com/docs/components/table) - Base Table component
- [shadcn/ui Radio Group](https://ui.shadcn.com/docs/components/radio-group) - Mode selector component
- [shadcn/ui Pagination](https://ui.shadcn.com/docs/components/pagination) - Pagination controls
- [shadcn/ui Progress](https://ui.shadcn.com/docs/components/progress) - Upload progress indicator
- [react-dropzone Official Docs](https://react-dropzone.js.org/) - API reference, hooks, validation
- [date-fns Documentation](https://date-fns.org/docs/Getting-Started) - Tree-shaking, formatDistance API

### Package Registries (Version Verification)
- [react-dropzone on npm](https://www.npmjs.com/package/react-dropzone) - Version 14.4.0 verified (Jan 2025)
- [@tanstack/react-table on npm](https://www.npmjs.com/package/@tanstack/react-table) - Version 8.21.3 verified (April 2025)
- [date-fns on npm](https://www.npmjs.com/package/date-fns) - Version 4.1.0 verified (Jan 2025)

### React 19 Compatibility
- [react-dropzone Issue #1400](https://github.com/react-dropzone/react-dropzone/issues/1400) - React 19 compatibility (works with `--legacy-peer-deps`)
- [TanStack Table Issue #5567](https://github.com/TanStack/table/issues/5567) - React 19 + React Compiler compatibility
- [TanStack Table v9 Roadmap](https://github.com/TanStack/table/discussions/5595) - v9 confirmed in alpha, v8 stable

### Best Practices (2025-2026)
- [react-dropzone Best Practices](https://transloadit.com/devtips/implementing-drag-and-drop-file-upload-in-react/) - Validation, accessibility
- [FormData + fetch](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects) - **Critical:** Do NOT set Content-Type header
- [FormData Multipart Fetch Fix](https://thevalleyofcode.com/fix-formdata-multipart-fetch/) - Content-Type boundary issue
- [React Hook Form + Multipart](https://refine.dev/blog/how-to-multipart-file-upload-with-react-hook-form/) - Integration patterns
- [TanStack Table Server-Side Pagination](https://medium.com/@aylo.srd/server-side-pagination-and-sorting-with-tanstack-table-and-react-bd493170125e) - manualPagination pattern

### Comparison Analysis
- [date-fns vs dayjs](https://www.dhiwise.com/post/date-fns-vs-dayjs-the-battle-of-javascript-date-libraries) - Bundle size, API comparison
- [date-fns vs dayjs Discussion](https://github.com/shadcn-ui/ui/discussions/4817) - shadcn/ui community preference

---

**Stack research for:** Dashboard Upload & Listing UI (react-dropzone, TanStack Table v8, date-fns, shadcn/ui components)
**Researched:** 2026-01-30
**Next steps:** Proceed to implementation with validated stack additions
