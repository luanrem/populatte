# Domain Pitfalls: Dashboard Upload & Listing UI

**Domain:** File upload UI, dynamic data tables, and paginated views in Next.js 16 with React Query v5
**Researched:** 2026-01-30
**Project Context:** Adding frontend features to existing Populatte Next.js dashboard

---

## Critical Pitfalls

These mistakes cause rewrites, major bugs, or data integrity issues.

### Pitfall 1: Manual Content-Type Header with FormData

**What goes wrong:** Setting `Content-Type: multipart/form-data` manually when uploading files causes the upload to fail. The browser/fetch needs to set the boundary parameter automatically.

**Why it happens:** Developers familiar with JSON APIs apply the same pattern (manually setting Content-Type) to file uploads without understanding multipart encoding requires a dynamically generated boundary.

**Consequences:**
- Upload fails with 400/422 errors
- Server cannot parse the request body
- Hard to debug because error messages are generic ("Invalid request body")

**Prevention:**
```typescript
// ❌ WRONG: Manual Content-Type breaks multipart uploads
const formData = new FormData();
formData.append('files', file);

await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data', // ← BREAKS UPLOAD
  },
  body: formData,
});

// ✅ CORRECT: Let browser set Content-Type with boundary
await fetch('/api/upload', {
  method: 'POST',
  // No Content-Type header - browser adds it automatically
  body: formData,
});
```

**Detection:** Upload endpoint returns 400/422, browser DevTools shows missing boundary in Content-Type header.

**Which phase:** Phase 1 (Upload UI implementation) - must be addressed in initial upload form.

**Sources:**
- [GitHub: vercel/next.js Discussion #39957](https://github.com/vercel/next.js/discussions/39957)
- [DEV Community: Handling multipart/form-data in Next.js](https://dev.to/mazinashfaq/handling-multipartform-data-in-nextjs-26ea)

---

### Pitfall 2: useApiClient Sets Content-Type to JSON

**What goes wrong:** The existing `useApiClient` hook in Populatte automatically sets `Content-Type: application/json` in all requests. This breaks file uploads which require the browser to set multipart/form-data with boundary.

**Why it happens:** The client was designed for JSON APIs (projects, users). When file upload is added, the hardcoded JSON header conflicts with FormData.

**Consequences:**
- File uploads fail despite correct FormData usage elsewhere
- Debugging is confusing because the fetch call looks correct
- Error only appears when using the project's standard API client

**Prevention:**
```typescript
// Current implementation (apps/web/lib/api/client.ts):
const headers = new Headers(requestOptions.headers);
headers.set('Content-Type', 'application/json'); // ← Always sets JSON

// Solution 1: Skip header for FormData
const headers = new Headers(requestOptions.headers);
if (!(requestOptions.body instanceof FormData)) {
  headers.set('Content-Type', 'application/json');
}

// Solution 2: Allow override via skipContentType flag
const { skipAuth, skipContentType, ...requestOptions } = options;
const headers = new Headers(requestOptions.headers);
if (!skipContentType) {
  headers.set('Content-Type', 'application/json');
}

// Solution 3: Create separate upload client (RECOMMENDED for Populatte)
// Keep useApiClient for JSON, create useUploadClient for multipart
export function useUploadClient(): UploadClient {
  const { getToken } = useAuth();
  // No Content-Type header set - browser handles it
}
```

**Detection:** File upload fails even though FormData is used. DevTools shows `Content-Type: application/json` instead of `multipart/form-data`.

**Which phase:** Phase 1 (Upload UI) - architectural decision needed before implementing upload form.

**Project-specific note:** This is a **Populatte-specific integration pitfall**. The codebase's existing API client pattern conflicts with file upload requirements.

---

### Pitfall 3: React Query Cache Not Invalidated After Upload

**What goes wrong:** After a successful file upload, the batch list doesn't update automatically because React Query's cache still contains stale data. Users see old data until manual refresh.

**Why it happens:** Mutations don't automatically invalidate related queries. Developers forget to call `invalidateQueries` in the mutation's `onSuccess` callback.

**Consequences:**
- Stale UI showing old batch list after upload
- User confusion ("I just uploaded, why don't I see it?")
- Trust issues with the application
- Manual page refresh required

**Prevention:**
```typescript
// ❌ WRONG: No cache invalidation
export function useUploadBatch() {
  const client = useUploadClient();

  return useMutation({
    mutationFn: (data) => client.upload(data),
    // Missing onSuccess - cache stays stale
  });
}

// ✅ CORRECT: Invalidate batch list on success
export function useUploadBatch(projectId: string) {
  const client = useUploadClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => client.upload(projectId, data),
    onSuccess: () => {
      // Invalidate ALL batch-related queries for this project
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'batches']
      });
    },
  });
}
```

**Detection:** After upload succeeds (201 response), list doesn't show new item. Refreshing page shows new data.

**Which phase:** Phase 1 (Upload UI) - implement invalidation immediately with upload mutation.

**Sources:**
- [TanStack Query: Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [TkDodo's Blog: Automatic Query Invalidation](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations)
- [Medium: React Query Cache Invalidation](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1)

---

### Pitfall 4: Dynamic Table Columns Cause Expensive Re-renders

**What goes wrong:** JSONB data has different keys per batch. Creating column definitions from `Object.keys()` on every render causes the entire table to re-mount, destroying scroll position and selection state.

**Why it happens:** Developers derive columns from data without memoization. Each render creates new column objects with new references, triggering TanStack Table to rebuild.

**Consequences:**
- Table flickers on every state change
- Scroll position resets
- Selected rows clear
- Terrible UX with large datasets
- Performance degrades significantly

**Prevention:**
```typescript
// ❌ WRONG: Columns recreated every render
function BatchDataTable({ data }: { data: BatchRow[] }) {
  // New columns array EVERY render - new object references
  const columns = Object.keys(data[0]?.data ?? {}).map(key => ({
    accessorKey: `data.${key}`,
    header: key,
  }));

  return <DataTable columns={columns} data={data} />;
}

// ✅ CORRECT: Memoize columns, recompute only when keys change
function BatchDataTable({ data }: { data: BatchRow[] }) {
  const columns = useMemo(() => {
    const firstRow = data[0];
    if (!firstRow) return [];

    return Object.keys(firstRow.data).map(key => ({
      accessorKey: `data.${key}`,
      header: key,
    }));
  }, [
    // Stable key: recompute only when column set changes
    JSON.stringify(Object.keys(data[0]?.data ?? {}))
  ]);

  const table = useReactTable({ columns, data });
  return <Table />;
}
```

**Detection:** Table visibly flickers when typing in search, changing filters, or any state update. React DevTools Profiler shows DataTable re-rendering on every keystroke.

**Which phase:** Phase 2 (Batch Data Table) - must implement memoization from the start, very hard to fix later.

**Sources:**
- [GitHub TanStack/table: Dynamic columns work on first load but fail when columns change](https://github.com/TanStack/table/discussions/3705)
- [GitHub TanStack/table: React-Table crashes with dynamic columns](https://github.com/TanStack/table/issues/1147)

---

### Pitfall 5: react-hook-form File Not Persisted on Re-render

**What goes wrong:** File selected via react-dropzone is lost from form state after component re-renders (e.g., validation error, parent state change). Upload button becomes disabled, form shows "no file selected."

**Why it happens:** File objects don't persist properly in react-hook-form without explicit `setValue` calls. Using Controller's `onChange` incorrectly or relying on automatic field registration fails.

**Consequences:**
- User selects file, sees preview, but submission fails ("no file")
- File lost after validation error shown
- Confusing UX: "I selected a file, why is it gone?"
- Multiple bug reports from users

**Prevention:**
```typescript
// ❌ WRONG: Relying on automatic registration
function UploadForm() {
  const { register } = useForm();

  const onDrop = (files: File[]) => {
    // register() doesn't handle File objects well
    // Files lost on re-render
  };

  const { getRootProps } = useDropzone({ onDrop });
  return <div {...getRootProps()} {...register('files')} />;
}

// ✅ CORRECT: Explicit setValue in Controller + watch
function UploadForm() {
  const { control, watch, setValue } = useForm();
  const files = watch('files');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Explicit setValue persists files across re-renders
    setValue('files', acceptedFiles, {
      shouldValidate: true,
      shouldDirty: true
    });
  }, [setValue]);

  return (
    <Controller
      control={control}
      name="files"
      render={({ field: { onChange, value } }) => (
        <Dropzone
          onDrop={(files) => {
            onChange(files);
            onDrop(files);
          }}
        />
      )}
    />
  );
}
```

**Detection:** File preview shows, but form submission logs "files: undefined". Re-rendering the parent component clears file selection.

**Which phase:** Phase 1 (Upload UI) - critical for dropzone integration, must be correct from start.

**Sources:**
- [GitHub react-hook-form: Integration with react-dropzone Discussion #2146](https://github.com/orgs/react-hook-form/discussions/2146)
- [DEV Community: How to use react-dropzone with react-hook-form](https://dev.to/vibhanshu909/how-to-use-react-dropzone-with-react-hook-form-1omc)
- [Bacancy: React Dropzone with React Hook Form Guide](https://www.bacancytechnology.com/qanda/react/react-dropzone-with-react-hook-form)

---

### Pitfall 6: Fetch API Upload Progress Not Tracked

**What goes wrong:** Fetch API doesn't emit upload progress events like XMLHttpRequest. Developers try to show upload progress but the UI never updates (stuck at 0%).

**Why it happens:** Common misconception that fetch supports progress tracking. It only supports download progress (via response.body ReadableStream), not upload progress.

**Consequences:**
- Upload progress bar stuck at 0% during large uploads
- No user feedback for slow uploads
- Users refresh page thinking upload failed
- Poor UX for multi-file uploads

**Prevention:**
```typescript
// ❌ WRONG: fetch has NO upload progress
async function uploadWithProgress(formData: FormData) {
  // fetch API doesn't expose upload progress
  // This code can't track upload progress:
  const response = await fetch('/upload', {
    method: 'POST',
    body: formData,
  });
  // No way to get upload progress here
}

// ✅ SOLUTION 1: Use XMLHttpRequest for uploads
function uploadWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      resolve(new Response(xhr.response, { status: xhr.status }));
    });

    xhr.open('POST', '/upload');
    xhr.send(formData);
  });
}

// ✅ SOLUTION 2: Fake progress with timer (MVP acceptable)
function uploadWithFakeProgress(formData: FormData) {
  let progress = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + 10, 90); // Stop at 90%
    setUploadProgress(progress);
  }, 500);

  const promise = fetch('/upload', { method: 'POST', body: formData });

  promise.finally(() => {
    clearInterval(interval);
    setUploadProgress(100);
  });

  return promise;
}

// ✅ SOLUTION 3: Indeterminate progress (RECOMMENDED for Populatte)
// Show spinner/indeterminate progress instead of percentage
// Simpler, no XMLHttpRequest, good UX for typical file sizes
```

**Detection:** Upload progress bar added but never updates from 0%. Console has no errors.

**Which phase:** Phase 1 (Upload UI) - decide on progress strategy during upload form implementation.

**Project-specific note:** Given Populatte's 5MB max per file limit and fetch API preference, **indeterminate progress** (spinner) is recommended over switching to XMLHttpRequest.

**Sources:**
- [JakeArchibald.com: Fetch streams are great, but not for measuring upload progress](https://jakearchibald.com/2025/fetch-streams-not-for-progress/)
- [Medium: Upload and Download progress tracking with Fetch and Axios](https://medium.com/@msingh.mayank/upload-and-download-progress-tracking-with-fetch-and-axios-f6212b64b703)
- [GitHub Gist: How to follow upload progress with fetch()](https://gist.github.com/adinan-cenci/9fc1d9785700d58f63055bc8d02a54d0)

---

### Pitfall 7: Non-ASCII Filenames Fail FormData Parsing

**What goes wrong:** Files with Chinese, emoji, or other non-ASCII characters in filenames cause "Failed to parse body as FormData" errors on the server, even though the upload code is correct.

**Why it happens:** Known Next.js/Node.js issue with how FormData handles non-ASCII filenames in Content-Type headers. The boundary parsing fails with certain character encodings.

**Consequences:**
- Upload fails for international users
- Random-looking failures (depends on filename)
- Hard to reproduce in testing (depends on locale)
- Requires filename sanitization workaround

**Prevention:**
```typescript
// ❌ WRONG: Allow any filename (breaks with non-ASCII)
function UploadForm() {
  const onDrop = (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file); // Original filename may break
    });
    upload(formData);
  };
}

// ✅ CORRECT: Sanitize filenames to ASCII
function UploadForm() {
  const onDrop = (files: File[]) => {
    const formData = new FormData();

    files.forEach(file => {
      // Sanitize filename: remove non-ASCII, replace with underscores
      const sanitized = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^\x00-\x7F]/g, '_'); // Replace non-ASCII

      // Create new File with sanitized name
      const sanitizedFile = new File([file], sanitized, {
        type: file.type
      });

      formData.append('files', sanitizedFile);
    });

    upload(formData);
  };
}
```

**Detection:** Upload fails with 400/500 "Failed to parse body as FormData" for files with Chinese/emoji names, but succeeds for ASCII-only filenames.

**Which phase:** Phase 1 (Upload UI) - add sanitization in dropzone handler before FormData creation.

**Sources:**
- [GitHub vercel/next.js Issue #76893: Failed to parse body as FormData with non-ASCII filenames](https://github.com/vercel/next.js/issues/76893)
- [GitHub vercel/next.js Issue #73220: Upload error with formData in App Router](https://github.com/vercel/next.js/issues/73220)

---

## Moderate Pitfalls

These mistakes cause delays, bugs, or technical debt but are recoverable.

### Pitfall 8: Pagination State in URL Params vs React Query

**What goes wrong:** Using URL search params (`?page=2`) for pagination conflicts with React Query's cache when navigating with browser back/forward. Cache shows wrong page or flashes old data.

**Why it happens:** Two sources of truth: URL params and React Query cache. React Query doesn't automatically sync with URL changes, leading to desync.

**Consequences:**
- Back button shows wrong page of results
- URL says page=2, table shows page=1 data
- Confusing UX during navigation
- Cache invalidation complexity increases

**Prevention:**
```typescript
// ❌ PATTERN 1: URL params only (loses cache on navigation)
function BatchList() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');

  // Every URL change refetches - no cache benefit
  const { data } = useQuery({
    queryKey: ['batches', page],
    queryFn: () => fetchBatches({ page }),
  });
}

// ❌ PATTERN 2: React Query state only (not shareable/bookmarkable)
function BatchList() {
  const [page, setPage] = useState(1);

  const { data } = useQuery({
    queryKey: ['batches', page],
    queryFn: () => fetchBatches({ page }),
  });
  // URL doesn't update - can't share link to specific page
}

// ✅ CORRECT: Sync URL with React Query via queryKey
function BatchList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = Number(searchParams.get('page') ?? '1');

  const { data } = useQuery({
    queryKey: ['batches', { page }], // URL state in queryKey
    queryFn: () => fetchBatches({ page }),
    placeholderData: keepPreviousData, // Show old data while loading new page
  });

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    router.push(`?${params.toString()}`);
    // React Query automatically refetches due to queryKey change
  }

  return <Pagination page={page} onPageChange={goToPage} />;
}
```

**Detection:** Browser back button shows wrong page. URL and displayed data don't match. Hard refresh required to fix state.

**Which phase:** Phase 2 (Batch Data Table) - implement during pagination component creation.

**Sources:**
- [Next.js Learn: Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)
- [Medium: Mastering State in Next.js App Router with URL Query Parameters](https://medium.com/@roman_j/mastering-state-in-next-js-app-router-with-url-query-parameters-a-practical-guide-03939921d09c)
- [LogRocket: Why URL state matters - useSearchParams guide](https://blog.logrocket.com/url-state-usesearchparams/)

---

### Pitfall 9: keepPreviousData Replaced by placeholderData in v5

**What goes wrong:** Using `keepPreviousData: true` in React Query v5 causes TypeScript errors or runtime failures because the option was removed in the v5 migration.

**Why it happens:** React Query v5 changed the API. `keepPreviousData` is now a function passed to `placeholderData`, not a boolean flag.

**Consequences:**
- TypeScript compilation errors
- Pagination shows loading spinner instead of previous data
- Flash of empty state between pages
- Poor UX during page transitions

**Prevention:**
```typescript
import { keepPreviousData } from '@tanstack/react-query';

// ❌ WRONG: v4 syntax doesn't work in v5
const { data } = useQuery({
  queryKey: ['batches', page],
  queryFn: () => fetchBatches(page),
  keepPreviousData: true, // ← TypeScript error in v5
});

// ✅ CORRECT: v5 syntax with placeholderData
const { data } = useQuery({
  queryKey: ['batches', page],
  queryFn: () => fetchBatches(page),
  placeholderData: keepPreviousData, // ← Import function, use as value
});
```

**Detection:** TypeScript error "Property 'keepPreviousData' does not exist". Pagination shows loading state instead of previous page data.

**Which phase:** Phase 2 (Batch Data Table) - use correct v5 syntax from the start.

**Sources:**
- [TanStack Query: Paginated Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)
- [GitHub TanStack/query Discussion #6460: keepPreviousData deprecated - what now?](https://github.com/TanStack/query/discussions/6460)
- [TanStack Query: Migrating to v5](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)

---

### Pitfall 10: Zod File Validation MIME Type Errors Hidden

**What goes wrong:** Using Zod v4's `.mime()` method to validate file types works (rejects invalid files), but the custom error message doesn't appear in react-hook-form's field errors.

**Why it happens:** Known issue in Zod v4 where `.mime()` error messages don't surface properly when integrated with react-hook-form's zodResolver.

**Consequences:**
- File type validation works (wrong types rejected)
- But user sees generic "Invalid input" instead of "Only PNG and JPEG allowed"
- Confusing UX - user doesn't know WHY file was rejected
- Extra debugging needed

**Prevention:**
```typescript
import { z } from 'zod';

// ❌ PARTIALLY WORKING: Validates but error message missing
const schema = z.object({
  files: z
    .array(z.instanceof(File))
    .refine((files) => files.length > 0, 'At least one file required')
    .refine(
      (files) => files.every(f => f.size <= 5_000_000),
      { message: 'File too large (max 5MB)' } // ← Works
    )
    .refine(
      (files) => files.every(f => f.type.match(/image\/(png|jpeg)/)),
      { message: 'Only PNG and JPEG allowed' } // ← ALSO WORKS (custom refine)
    ),
});

// ❌ DOESN'T SHOW MESSAGE: Zod v4 .mime() issue
const schema = z.object({
  files: z
    .array(z.instanceof(File))
    .refine((files) => files.length > 0, 'At least one file required')
    .refine(
      (files) => files.every(f => f.size <= 5_000_000),
      { message: 'File too large (max 5MB)' } // ← Works
    ),
  // Using .mime() directly on File instance doesn't integrate well
});

// ✅ RECOMMENDED: Use custom refine() with type.match()
const uploadSchema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, 'At least one file required')
    .refine(
      (files) => files.every(file => file.size <= 5_000_000),
      { message: 'Each file must be under 5MB' }
    )
    .refine(
      (files) => files.every(file =>
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'
      ),
      { message: 'Only Excel files (.xlsx, .xls) are allowed' }
    ),
  mode: z.enum(['list_mode', 'profile_mode']),
});
```

**Detection:** File validation works but error message is generic. Console shows Zod validation passed, but field error message is wrong.

**Which phase:** Phase 1 (Upload UI) - use `.refine()` with custom logic instead of `.mime()`.

**Sources:**
- [GitHub colinhacks/zod Issue #4686: Zod v4 .mime() error message not displaying with react-hook-form](https://github.com/colinhacks/zod/issues/4686)
- [Medium: React Hook Form with Zod: Complete Guide for 2026](https://dev.to/marufrahmanlive/react-hook-form-with-zod-complete-guide-for-2026-1em1)
- [Medium: Adding File Upload using React-Hook-Form and Zod](https://medium.com/@christianovik009/adding-file-upload-using-react-hook-form-and-zod-using-nextks-f6def5d6881f)

---

### Pitfall 11: Large Table Re-renders on Every Pagination Click

**What goes wrong:** Clicking to the next page causes the entire table component to re-render unnecessarily, creating a flash of loading state even though previous data could be shown.

**Why it happens:** Without `placeholderData: keepPreviousData`, React Query returns `undefined` while fetching the new page, causing table to show empty/loading state.

**Consequences:**
- Jarring UX - table flashes empty between pages
- Scroll position may reset
- Feels slower than it is
- Users think data is loading from scratch

**Prevention:**
```typescript
import { keepPreviousData } from '@tanstack/react-query';

// ❌ WRONG: No placeholder data - flashes empty
function BatchDataTable({ batchId, page }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['batches', batchId, 'rows', { page }],
    queryFn: () => fetchRows(batchId, page),
  });

  if (isLoading) return <Spinner />; // Shows on EVERY page change

  return <Table data={data.items} />;
}

// ✅ CORRECT: Keep previous data while loading next page
function BatchDataTable({ batchId, page }: Props) {
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['batches', batchId, 'rows', { page }],
    queryFn: () => fetchRows(batchId, page),
    placeholderData: keepPreviousData, // ← Shows previous page while loading
  });

  return (
    <>
      {isFetching && <LoadingIndicator />} {/* Subtle indicator */}
      <Table
        data={data?.items ?? []}
        opacity={isPlaceholderData ? 0.5 : 1} // Dim during load
      />
    </>
  );
}
```

**Detection:** Table shows loading spinner on every page change instead of keeping previous data visible.

**Which phase:** Phase 2 (Batch Data Table) - add during initial pagination implementation.

**Sources:**
- [TanStack Query: Paginated Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)
- [TkDodo's Blog: Placeholder and Initial Data in React Query](https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query)

---

### Pitfall 12: shadcn/ui Table vs DataTable Confusion

**What goes wrong:** Using shadcn/ui's basic `<Table>` component for complex data when `<DataTable>` pattern is needed. Results in manual pagination logic, no sorting, no filtering.

**Why it happens:** shadcn/ui provides both a basic Table (HTML semantic wrapper) and a DataTable pattern (TanStack Table integration). Developers pick the wrong one.

**Consequences:**
- Manual pagination implementation required
- No built-in sorting/filtering
- Poor accessibility for complex data
- Reinventing features TanStack Table provides

**Prevention:**
```typescript
// ❌ WRONG: Using basic Table for complex data
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';

function BatchDataTable({ data }: { data: BatchRow[] }) {
  // Manual pagination logic
  const [page, setPage] = useState(1);
  const paginatedData = data.slice((page - 1) * 10, page * 10);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.map(row => (
          <TableRow key={row.id}>
            <TableCell>{row.id}</TableCell>
            <TableCell>{JSON.stringify(row.data)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ✅ CORRECT: Use DataTable pattern with TanStack Table
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';
import { Table } from '@/components/ui/table';

function BatchDataTable({ data }: { data: BatchRow[] }) {
  const columns = useMemo(() => [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'data', header: 'Data' },
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // TanStack Table handles pagination, sorting, filtering
  });

  // Use shadcn Table components for rendering
  return <DataTableImplementation table={table} />;
}
```

**Detection:** Implementing manual pagination, sorting, filtering when it should be built-in. Lots of useState for table features.

**Which phase:** Phase 2 (Batch Data Table) - use correct pattern from architecture planning.

**Sources:**
- [shadcn/ui: Data Table Component](https://ui.shadcn.com/docs/components/data-table)
- [Shadcraft Blog: Building production ready data tables with shadcn/ui](https://shadcraft.com/blog/building-production-ready-data-tables-with-shadcn-ui)

---

### Pitfall 13: Dynamic Route Params Not Validated

**What goes wrong:** Using route params like `[projectId]` and `[batchId]` directly without validation. Malicious or malformed IDs cause database errors or expose security issues.

**Why it happens:** Next.js types params as `string | string[] | undefined`, but developers assume they're always valid UUIDs. No runtime validation at component boundary.

**Consequences:**
- SQL injection risk if IDs used in raw queries
- Crashes with "invalid UUID format" from database
- Poor error messages for users
- Security logging doesn't catch attempted exploits

**Prevention:**
```typescript
import { z } from 'zod';

// ❌ WRONG: Using params directly without validation
export default function BatchPage({
  params
}: {
  params: { projectId: string; batchId: string }
}) {
  // params.projectId could be malicious input
  const { data } = useBatch(params.projectId, params.batchId);

  return <BatchDataTable batchId={params.batchId} />;
}

// ✅ CORRECT: Validate params at component boundary
const routeParamsSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  batchId: z.string().uuid('Invalid batch ID'),
});

export default function BatchPage({
  params
}: {
  params: Promise<{ projectId: string; batchId: string }> // Next.js 15+ async params
}) {
  const resolvedParams = use(params);

  // Validate at boundary
  const validationResult = routeParamsSchema.safeParse(resolvedParams);

  if (!validationResult.success) {
    notFound(); // Next.js 404 page
  }

  const { projectId, batchId } = validationResult.data;

  // Now safe to use
  const { data } = useBatch(projectId, batchId);

  return <BatchDataTable batchId={batchId} />;
}
```

**Detection:** Database errors like "invalid input syntax for type uuid" in logs. No validation errors in user-facing UI.

**Which phase:** Phase 2 (Batch Data Table) - add validation wrapper during page component creation.

**Sources:**
- [Next.js: Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Vercel Blog: Common mistakes with Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [TheLinuxCode: Next.js Dynamic Route Segments 2026 Guide](https://thelinuxcode.com/nextjs-dynamic-route-segments-in-the-app-router-2026-guide/)

---

## Minor Pitfalls

These mistakes cause annoyance or minor UX issues but are easily fixable.

### Pitfall 14: Upload Button Enabled During Upload

**What goes wrong:** User clicks "Upload" and can immediately click it again before the first upload completes, triggering duplicate uploads.

**Why it happens:** Forgot to disable button during mutation's `isPending` state.

**Consequences:**
- Duplicate batch creation
- Wasted API calls
- User confusion (why two batches?)
- Easy to fix but embarrassing

**Prevention:**
```typescript
// ❌ WRONG: No disabled state
function UploadForm() {
  const { mutate } = useUploadBatch();

  return (
    <Button onClick={() => mutate(formData)}>
      Upload
    </Button>
  );
}

// ✅ CORRECT: Disable during upload
function UploadForm() {
  const { mutate, isPending } = useUploadBatch();

  return (
    <Button
      onClick={() => mutate(formData)}
      disabled={isPending}
    >
      {isPending ? 'Uploading...' : 'Upload'}
    </Button>
  );
}
```

**Detection:** Clicking upload button multiple times creates duplicate batches.

**Which phase:** Phase 1 (Upload UI) - add during button implementation.

---

### Pitfall 15: Empty State Not Handled in Table

**What goes wrong:** When no batches exist for a project, table shows nothing or broken layout instead of helpful empty state.

**Why it happens:** Only implemented the "data exists" path, forgot edge case.

**Consequences:**
- Confusing UX for new users
- Looks broken instead of intentional
- No call-to-action to upload first batch

**Prevention:**
```typescript
// ❌ WRONG: No empty state
function BatchList({ projectId }: Props) {
  const { data } = useBatches(projectId);

  return <DataTable data={data?.items ?? []} />;
  // Shows empty table headers with no explanation
}

// ✅ CORRECT: Explicit empty state
function BatchList({ projectId }: Props) {
  const { data, isLoading } = useBatches(projectId);

  if (isLoading) return <Spinner />;

  if (!data?.items.length) {
    return (
      <EmptyState
        icon={<UploadIcon />}
        title="No batches yet"
        description="Upload your first Excel file to get started"
        action={<UploadButton />}
      />
    );
  }

  return <DataTable data={data.items} />;
}
```

**Detection:** New project shows empty table with headers but no rows, no explanation.

**Which phase:** Phase 1 (Upload UI) and Phase 2 (Batch Data Table) - add empty states to both views.

---

### Pitfall 16: Missing Loading States for Slow Networks

**What goes wrong:** On slow networks, table/list appears empty for several seconds with no loading indicator, then suddenly populates.

**Why it happens:** Not checking `isLoading` or `isFetching` states from React Query.

**Consequences:**
- Users think page is broken
- Multiple refreshes attempting to fix "broken" page
- Poor mobile UX

**Prevention:**
```typescript
// ❌ WRONG: No loading state
function BatchList({ projectId }: Props) {
  const { data } = useBatches(projectId);

  return <DataTable data={data?.items ?? []} />;
}

// ✅ CORRECT: Show skeleton during load
function BatchList({ projectId }: Props) {
  const { data, isLoading } = useBatches(projectId);

  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  return <DataTable data={data?.items ?? []} />;
}
```

**Detection:** Throttle network in DevTools - page shows blank for 3+ seconds before content appears.

**Which phase:** Phase 2 (Batch Data Table) - add during initial query implementation.

---

### Pitfall 17: Success Toast Not Shown After Upload

**What goes wrong:** File upload succeeds (201 response) but user gets no confirmation. They don't know if upload worked.

**Why it happens:** Forgot to trigger toast notification in mutation's `onSuccess`.

**Consequences:**
- User re-uploads same file thinking first failed
- No feedback loop = poor UX
- Undermines trust in application

**Prevention:**
```typescript
import { toast } from 'sonner';

// ❌ WRONG: No user feedback
export function useUploadBatch(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => uploadBatch(projectId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'batches']
      });
      // No toast - user doesn't know upload succeeded
    },
  });
}

// ✅ CORRECT: Toast confirmation
export function useUploadBatch(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => uploadBatch(projectId, data),
    onSuccess: (response) => {
      toast.success(`Batch uploaded successfully (${response.totalRows} rows)`);
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'batches']
      });
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}
```

**Detection:** Upload succeeds but user sees no confirmation message.

**Which phase:** Phase 1 (Upload UI) - add during mutation implementation.

**Project-specific note:** Populatte already uses `sonner` for toasts (in package.json), use it consistently.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Upload Modal | useApiClient breaks multipart uploads | Create separate upload client OR skip Content-Type header for FormData |
| Phase 1: Upload Modal | File lost on re-render in react-hook-form | Use Controller + explicit setValue in dropzone onDrop |
| Phase 1: Upload Modal | Non-ASCII filenames break upload | Sanitize filenames before FormData creation |
| Phase 1: Upload Modal | No progress indicator for upload | Use indeterminate spinner (recommended for 5MB limit) |
| Phase 1: Upload Modal | Cache not invalidated after upload | invalidateQueries in onSuccess with correct queryKey |
| Phase 2: Batch Data Table | Dynamic columns cause re-renders | useMemo columns with stable dependency (JSON.stringify keys) |
| Phase 2: Batch Data Table | Pagination flashes empty between pages | placeholderData: keepPreviousData |
| Phase 2: Batch Data Table | URL params and React Query desync | Use searchParams in queryKey, update URL on page change |
| Phase 2: Batch Data Table | Route params not validated | Zod validation at page component boundary, notFound() on invalid |
| Phase 2: Batch Data Table | Used basic Table instead of DataTable | Use TanStack Table with shadcn DataTable pattern |

---

## Integration Warnings with Existing System

### Existing Pattern: Factory Functions for Endpoints

**Current pattern:** Endpoints use factory functions (`createProjectEndpoints(fetchFn)`) that compose with any fetch implementation.

**Upload integration challenge:** File upload requires different Content-Type handling than JSON endpoints.

**Recommendation:**
- **Option 1:** Add `skipContentType` flag to ApiRequestOptions, modify client.ts to skip JSON header when flag set
- **Option 2:** Create separate `createBatchEndpoints` that doesn't set Content-Type (cleaner separation)
- **Option 3:** Create dedicated `useUploadClient` hook without Content-Type (RECOMMENDED - keeps JSON/upload concerns separated)

### Existing Pattern: Zod Validation on Response

**Current pattern:** All endpoint responses validated with `.safeParse()` and detailed error logging.

**Upload integration challenge:** Upload response is still JSON (batch metadata), but request is multipart.

**Recommendation:** Follow existing pattern - validate response with `batchResponseSchema.safeParse()` same as projects.

### Existing Pattern: invalidateQueries with void Prefix

**Current pattern:** `void queryClient.invalidateQueries(...)` used in project mutations.

**Upload integration challenge:** Same pattern applies.

**Recommendation:** Follow existing convention - `void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'batches'] })`.

---

## Research Confidence Assessment

| Pitfall Category | Confidence | Notes |
|------------------|-----------|-------|
| File upload with FormData | HIGH | Well-documented Next.js/fetch issues, official sources |
| React Query v5 cache invalidation | HIGH | Official TanStack docs + authoritative blog posts |
| react-hook-form + dropzone | MEDIUM | Community patterns verified across multiple sources |
| TanStack Table dynamic columns | MEDIUM | GitHub issues confirm pattern, but JSONB-specific not documented |
| Fetch upload progress | HIGH | Recent authoritative source (JakeArchibald.com Jan 2025) |
| Pagination with URL params | HIGH | Official Next.js docs + multiple community guides |
| Zod file validation | MEDIUM | GitHub issue confirms .mime() problem, workaround verified |
| shadcn/ui Table patterns | HIGH | Official shadcn docs + production guides |
| Next.js dynamic routes | HIGH | Official Vercel sources + security best practices |
| Integration with Populatte | HIGH | Direct codebase analysis (client.ts, endpoints patterns) |

---

## Sources

### File Upload & FormData
- [GitHub vercel/next.js Issue #76893: Failed to parse body as FormData with non-ASCII filenames](https://github.com/vercel/next.js/issues/76893)
- [GitHub vercel/next.js Issue #73220: Upload error with formData in App Router](https://github.com/vercel/next.js/issues/73220)
- [GitHub vercel/next.js Discussion #39957: File upload from Next.js API route using multipart form](https://github.com/vercel/next.js/discussions/39957)
- [DEV Community: Handling multipart/form-data in Next.js](https://dev.to/mazinashfaq/handling-multipartform-data-in-nextjs-26ea)

### React Query Cache & Pagination
- [TanStack Query: Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [TkDodo's Blog: Automatic Query Invalidation after Mutations](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations)
- [Medium: React Query Cache Invalidation Issues](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1)
- [TanStack Query: Paginated Queries Guide](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries)
- [GitHub TanStack/query Discussion #6460: keepPreviousData deprecated](https://github.com/TanStack/query/discussions/6460)
- [TkDodo's Blog: Placeholder and Initial Data in React Query](https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query)

### react-hook-form + Dropzone
- [GitHub react-hook-form Discussion #2146: Integration with react-dropzone](https://github.com/orgs/react-hook-form/discussions/2146)
- [DEV Community: How to use react-dropzone with react-hook-form](https://dev.to/vibhanshu909/how-to-use-react-dropzone-with-react-hook-form-1omc)
- [Bacancy: React Dropzone with React Hook Form Guide](https://www.bacancytechnology.com/qanda/react/react-dropzone-with-react-hook-form)

### TanStack Table Performance
- [GitHub TanStack/table Discussion #3705: Dynamic columns fail when columns change](https://github.com/TanStack/table/discussions/3705)
- [GitHub TanStack/table Issue #1147: React-Table crashes with dynamic columns](https://github.com/TanStack/table/issues/1147)
- [GitHub TanStack/table Issue #6024: Performance Issue on table](https://github.com/TanStack/table/issues/6024)

### Fetch Upload Progress
- [JakeArchibald.com: Fetch streams are great, but not for measuring upload progress](https://jakearchibald.com/2025/fetch-streams-not-for-progress/)
- [Medium: Upload and Download progress tracking with Fetch and Axios](https://medium.com/@msingh.mayank/upload-and-download-progress-tracking-with-fetch-and-axios-f6212b64b703)
- [GitHub Gist: How to follow upload progress with fetch()](https://gist.github.com/adinan-cenci/9fc1d9785700d58f63055bc8d02a54d0)

### Next.js Pagination & URL State
- [Next.js Learn: Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)
- [Medium: Mastering State in Next.js App Router with URL Query Parameters](https://medium.com/@roman_j/mastering-state-in-next-js-app-router-with-url-query-parameters-a-practical-guide-03939921d09c)
- [LogRocket: Why URL state matters - useSearchParams guide](https://blog.logrocket.com/url-state-usesearchparams/)

### Zod File Validation
- [GitHub colinhacks/zod Issue #4686: Zod v4 .mime() error message not displaying](https://github.com/colinhacks/zod/issues/4686)
- [DEV Community: React Hook Form with Zod Complete Guide for 2026](https://dev.to/marufrahmanlive/react-hook-form-with-zod-complete-guide-for-2026-1em1)
- [Medium: Adding File Upload using React-Hook-Form and Zod](https://medium.com/@christianovik009/adding-file-upload-using-react-hook-form-and-zod-using-nextks-f6def5d6881f)

### shadcn/ui DataTable
- [shadcn/ui: Data Table Component](https://ui.shadcn.com/docs/components/data-table)
- [Shadcraft Blog: Building production ready data tables with shadcn/ui](https://shadcraft.com/blog/building-production-ready-data-tables-with-shadcn-ui)

### Next.js Dynamic Routes
- [Next.js: Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Vercel Blog: Common mistakes with Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [TheLinuxCode: Next.js Dynamic Route Segments 2026 Guide](https://thelinuxcode.com/nextjs-dynamic-route-segments-in-the-app-router-2026-guide/)
