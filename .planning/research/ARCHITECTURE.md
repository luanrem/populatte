# Architecture Patterns: Dashboard Upload & Listing UI

**Domain:** Next.js 16 App Router frontend integration for batch upload and data viewing
**Researched:** 2026-01-30
**Confidence:** HIGH

## Recommended Architecture

The new batch upload and listing pages should follow the existing Next.js architecture patterns already established in the `/projects` page. This is a **subsequent milestone** that extends, rather than replaces, the current structure.

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Client (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  App Router Pages                                               │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ /projects/[id]   │  │ /projects/[id]/  │                    │
│  │                  │  │ batches/[batchId]│                    │
│  │ Project Detail   │  │                  │                    │
│  │ + Batch List     │  │ Batch Data Table │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                               │
│  ┌────────▼─────────────────────▼────────┐                     │
│  │     React Query Hooks                 │                     │
│  │  - useBatches(projectId)              │                     │
│  │  - useBatch(projectId, batchId)       │                     │
│  │  - useBatchRows(projectId, batchId)   │                     │
│  │  - useUploadBatch()                   │                     │
│  └────────┬──────────────────────────────┘                     │
│           │                                                     │
│  ┌────────▼──────────────────────────────┐                     │
│  │     API Client (useApiClient)         │                     │
│  │  - Clerk token injection              │                     │
│  │  - 401 retry logic                    │                     │
│  │  - FormData support (for upload)      │                     │
│  └────────┬──────────────────────────────┘                     │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
            │ HTTP (fetch)
            │
┌───────────▼─────────────────────────────────────────────────────┐
│                    NestJS API (existing)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BatchController                                                │
│  - POST /projects/:projectId/batches                            │
│  - GET  /projects/:projectId/batches?limit=50&offset=0          │
│  - GET  /projects/:projectId/batches/:batchId                   │
│  - GET  /projects/:projectId/batches/:batchId/rows?limit&offset │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

**Pattern 1: List Batches (with Pagination)**
```
Page → useBatches(projectId, { limit, offset })
     → createBatchEndpoints(fetchFn).list(projectId, limit, offset)
     → API client fetch with token
     → GET /projects/:projectId/batches?limit=50&offset=0
     → Response: { items: BatchWithTotalRows[], total, limit, offset }
     → Zod validation (batchListResponseSchema)
     → React Query cache
     → Component re-renders
```

**Pattern 2: Upload Batch (Multipart Form-Data)**
```
Component → handleUpload(files, mode)
          → useUploadBatch().mutate({ projectId, files, mode })
          → createBatchEndpoints(fetchFn).upload(projectId, formData)
          → FormData construction (files + mode field)
          → API client fetch with Content-Type: multipart/form-data
          → POST /projects/:projectId/batches
          → Response: Batch
          → Zod validation (batchResponseSchema)
          → Invalidate batches query cache
          → Success toast
```

**Pattern 3: View Batch Rows (Paginated Table)**
```
Page → useBatchRows(projectId, batchId, { limit, offset })
     → createBatchEndpoints(fetchFn).listRows(projectId, batchId, limit, offset)
     → API client fetch with token
     → GET /projects/:projectId/batches/:batchId/rows?limit=50&offset=0
     → Response: { items: Row[], total, limit, offset }
     → Zod validation (rowListResponseSchema)
     → Extract dynamic columns from columnMetadata
     → TanStack Table with server-side pagination
     → Render table with shadcn/ui Table components
```

## Component Structure

### Directory Organization

Follow the existing pattern established in the project:

```
apps/web/
├── app/
│   └── (platform)/
│       └── projects/
│           ├── page.tsx                           # Existing: project list
│           └── [id]/
│               ├── page.tsx                       # NEW: project detail + batch list
│               └── batches/
│                   └── [batchId]/
│                       └── page.tsx               # NEW: batch data table
├── components/
│   ├── ui/                                        # shadcn/ui only (DO NOT create custom here)
│   │   ├── table.tsx                              # NEW: Add via shadcn CLI
│   │   ├── pagination.tsx                         # NEW: Add via shadcn CLI (if available)
│   │   └── ...existing shadcn components
│   ├── layout/
│   │   └── ...existing layout components
│   ├── projects/
│   │   └── ...existing project components
│   └── batches/                                   # NEW: Feature directory
│       ├── batch-grid.tsx                         # Grid layout for batch cards
│       ├── batch-card.tsx                         # Individual batch card
│       ├── batch-empty-state.tsx                  # Empty state when no batches
│       ├── upload-batch-dialog.tsx                # Upload modal with dropzone
│       ├── batch-data-table.tsx                   # Data table wrapper
│       ├── batch-table-columns.tsx                # Dynamic column definitions
│       └── batch-table-pagination.tsx             # Pagination controls
├── lib/
│   ├── api/
│   │   ├── client.ts                              # Existing: useApiClient hook
│   │   ├── endpoints/
│   │   │   ├── projects.ts                        # Existing
│   │   │   ├── batches.ts                         # NEW: Batch endpoint factory
│   │   │   └── index.ts                           # Update: export batches
│   │   └── schemas/
│   │       ├── project.schema.ts                  # Existing
│   │       ├── batch.schema.ts                    # NEW: Batch response schemas
│   │       └── index.ts                           # Update: export batch schemas
│   └── query/
│       └── hooks/
│           ├── use-projects.ts                    # Existing
│           ├── use-batches.ts                     # NEW: Batch query hooks
│           └── index.ts                           # Update: export batch hooks
└── package.json
```

### Component Boundaries

| Component | Responsibility | Props In | Events Out |
|-----------|---------------|----------|------------|
| **batch-grid.tsx** | Layout batches in responsive grid, loading states, empty state | `batches?: BatchWithTotalRows[]`, `isLoading: boolean`, `onUploadClick`, `onBatchClick` | `onUploadClick()`, `onBatchClick(batch)` |
| **batch-card.tsx** | Display single batch summary (status, row count, created date) | `batch: BatchWithTotalRows`, `onClick` | `onClick(batch)` |
| **batch-empty-state.tsx** | Empty state with upload CTA | `onUploadClick` | `onUploadClick()` |
| **upload-batch-dialog.tsx** | Modal with mode selector, file dropzone, upload logic | `open: boolean`, `projectId: string`, `onOpenChange`, `isPending` | `onOpenChange(open)`, (mutation handled internally) |
| **batch-data-table.tsx** | Table wrapper, connects TanStack Table with shadcn/ui | `columns: ColumnDef[]`, `data: Row[]`, `pagination: PaginationState`, `onPaginationChange` | `onPaginationChange(state)` |
| **batch-table-columns.tsx** | Generate dynamic columns from columnMetadata | `columnMetadata: ColumnMetadata[]` | Returns `ColumnDef[]` |
| **batch-table-pagination.tsx** | Previous/Next buttons, page info | `table: Table<Row>`, `totalRows: number` | (controls table directly) |

### Component Composition Strategy

**Project Detail Page** (`app/(platform)/projects/[id]/page.tsx`):
- Server component for initial load (can fetch project via server-side API client)
- Client component for batch list interactivity
- Renders: `<AppHeader>` + `<BatchGrid>` + `<UploadBatchDialog>`
- Uses: `useParams()` to get `projectId`, `useBatches(projectId)`

**Batch Data Table Page** (`app/(platform)/projects/[id]/batches/[batchId]/page.tsx`):
- Client component for table interactivity
- Renders: `<AppHeader>` + `<BatchDataTable>` + breadcrumb navigation
- Uses: `useParams()` to get `projectId` and `batchId`, `useBatch()` for metadata, `useBatchRows()` for paginated data
- State: `pagination: { pageIndex, pageSize }` (local state, syncs with URL query params optionally)

## Integration Points with Existing Code

### 1. API Client - FormData Support

**Current limitation:** The existing `createApiClient` always sets `Content-Type: application/json`.

**Required modification:**
```typescript
// lib/api/client.ts (line 83)
// BEFORE:
headers.set('Content-Type', 'application/json');

// AFTER:
// Only set Content-Type if not already set (allows FormData to set boundary)
if (!headers.has('Content-Type')) {
  headers.set('Content-Type', 'application/json');
}
```

**Why:** When using `FormData`, the browser must set `Content-Type: multipart/form-data; boundary=...` automatically. If we force `application/json`, the server won't parse the files correctly.

**Where used:** `createBatchEndpoints().upload()` will pass `FormData` as body without manually setting Content-Type.

### 2. Endpoint Factory Pattern

**Follow existing pattern** from `lib/api/endpoints/projects.ts`:

```typescript
// lib/api/endpoints/batches.ts
export function createBatchEndpoints(
  fetchFn: (endpoint: string, options?: RequestInit) => Promise<Response>,
) {
  return {
    async list(projectId: string, limit = 50, offset = 0): Promise<BatchListResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/batches?limit=${limit}&offset=${offset}`
      );
      const data: unknown = await response.json();
      const result = batchListResponseSchema.safeParse(data);

      if (!result.success) {
        console.error('[API] Batch list validation failed:', result.error.issues);
        throw new Error('Invalid batch list data received from server');
      }

      return result.data;
    },

    async getById(projectId: string, batchId: string): Promise<BatchResponse> {
      const response = await fetchFn(`/projects/${projectId}/batches/${batchId}`);
      const data: unknown = await response.json();
      const result = batchResponseSchema.safeParse(data);

      if (!result.success) {
        console.error('[API] Batch validation failed:', result.error.issues);
        throw new Error('Invalid batch data received from server');
      }

      return result.data;
    },

    async listRows(
      projectId: string,
      batchId: string,
      limit = 50,
      offset = 0
    ): Promise<RowListResponse> {
      const response = await fetchFn(
        `/projects/${projectId}/batches/${batchId}/rows?limit=${limit}&offset=${offset}`
      );
      const data: unknown = await response.json();
      const result = rowListResponseSchema.safeParse(data);

      if (!result.success) {
        console.error('[API] Row list validation failed:', result.error.issues);
        throw new Error('Invalid row list data received from server');
      }

      return result.data;
    },

    async upload(
      projectId: string,
      files: File[],
      mode: BatchMode
    ): Promise<BatchResponse> {
      // Create FormData (browser will set correct Content-Type with boundary)
      const formData = new FormData();
      formData.append('mode', mode);

      // Append multiple files with same field name (matches backend FilesInterceptor)
      files.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await fetchFn(`/projects/${projectId}/batches`, {
        method: 'POST',
        body: formData,
        // DO NOT set Content-Type header - FormData sets it automatically
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

**Key differences from project endpoints:**
- `list()` and `listRows()` accept `limit` and `offset` parameters
- `upload()` uses `FormData` instead of `JSON.stringify()`
- `upload()` does NOT set `Content-Type` header (FormData handles this)

### 3. React Query Hooks Pattern

**Follow existing pattern** from `lib/query/hooks/use-projects.ts`:

```typescript
// lib/query/hooks/use-batches.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../../api/client';
import { createBatchEndpoints } from '../../api/endpoints/batches';
import type {
  BatchResponse,
  BatchListResponse,
  RowListResponse,
  UploadBatchRequest,
} from '../../api/schemas/batch.schema';

export function useBatches(projectId: string, limit = 50, offset = 0) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<BatchListResponse>({
    queryKey: ['projects', projectId, 'batches', { limit, offset }],
    queryFn: () => endpoints.list(projectId, limit, offset),
    enabled: !!projectId,
  });
}

export function useBatch(projectId: string, batchId: string) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<BatchResponse>({
    queryKey: ['projects', projectId, 'batches', batchId],
    queryFn: () => endpoints.getById(projectId, batchId),
    enabled: !!projectId && !!batchId,
  });
}

export function useBatchRows(
  projectId: string,
  batchId: string,
  limit = 50,
  offset = 0
) {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);

  return useQuery<RowListResponse>({
    queryKey: ['projects', projectId, 'batches', batchId, 'rows', { limit, offset }],
    queryFn: () => endpoints.listRows(projectId, batchId, limit, offset),
    enabled: !!projectId && !!batchId,
  });
}

export function useUploadBatch() {
  const client = useApiClient();
  const endpoints = createBatchEndpoints(client.fetch);
  const queryClient = useQueryClient();

  return useMutation<BatchResponse, Error, UploadBatchRequest>({
    mutationFn: ({ projectId, files, mode }) =>
      endpoints.upload(projectId, files, mode),
    onSuccess: (_, variables) => {
      // Invalidate all batch lists for this project (all pagination states)
      void queryClient.invalidateQueries({
        queryKey: ['projects', variables.projectId, 'batches']
      });
    },
  });
}
```

**Key patterns:**
- Query keys include parent resources (`['projects', projectId, 'batches']`)
- Pagination params in query key as object: `{ limit, offset }`
- `enabled` guards prevent fetching when params are missing
- Mutations invalidate parent queries using partial query key matching

### 4. Zod Schema Definitions

**New file:** `lib/api/schemas/batch.schema.ts`

```typescript
import { z } from 'zod';

// Enums (must match backend)
export const batchModeSchema = z.enum(['LIST_MODE', 'PROFILE_MODE']);
export const batchStatusSchema = z.enum(['PROCESSING', 'COMPLETED', 'FAILED']);
export const rowStatusSchema = z.enum(['DRAFT', 'VALID', 'WARNING', 'ERROR']);

export type BatchMode = z.infer<typeof batchModeSchema>;
export type BatchStatus = z.infer<typeof batchStatusSchema>;
export type RowStatus = z.infer<typeof rowStatusSchema>;

// ColumnMetadata (matches backend ColumnMetadata interface)
export const columnMetadataSchema = z.object({
  originalHeader: z.string(),
  normalizedKey: z.string(),
  inferredType: z.string(),
  position: z.number(),
});

export type ColumnMetadata = z.infer<typeof columnMetadataSchema>;

// Batch response (matches backend Batch entity)
export const batchResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  mode: batchModeSchema,
  status: batchStatusSchema,
  fileCount: z.number(),
  rowCount: z.number(),
  columnMetadata: z.array(columnMetadataSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  deletedBy: z.string().nullable(),
});

export type BatchResponse = z.infer<typeof batchResponseSchema>;

// BatchWithTotalRows (matches backend ListBatchesResult item)
export const batchWithTotalRowsSchema = batchResponseSchema.extend({
  totalRows: z.number(),
});

export type BatchWithTotalRows = z.infer<typeof batchWithTotalRowsSchema>;

// List batches response (matches backend ListBatchesResult)
export const batchListResponseSchema = z.object({
  items: z.array(batchWithTotalRowsSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type BatchListResponse = z.infer<typeof batchListResponseSchema>;

// ValidationMessage (matches backend ValidationMessage interface)
export const validationMessageSchema = z.object({
  field: z.string(),
  type: z.string(),
  message: z.string(),
});

export type ValidationMessage = z.infer<typeof validationMessageSchema>;

// Row response (matches backend Row entity)
export const rowResponseSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  data: z.record(z.unknown()), // JSONB: Record<string, unknown>
  status: rowStatusSchema,
  validationMessages: z.array(validationMessageSchema),
  sourceFileName: z.string(),
  sourceSheetName: z.string(),
  sourceRowIndex: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Row = z.infer<typeof rowResponseSchema>;

// List rows response (matches backend ListRowsResult)
export const rowListResponseSchema = z.object({
  items: z.array(rowResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type RowListResponse = z.infer<typeof rowListResponseSchema>;

// Upload batch request (client-side only)
export const uploadBatchRequestSchema = z.object({
  projectId: z.string(),
  files: z.array(z.instanceof(File)).min(1, 'At least one file is required'),
  mode: batchModeSchema,
});

export type UploadBatchRequest = z.infer<typeof uploadBatchRequestSchema>;
```

**Critical alignments:**
- Enum values match backend exactly (case-sensitive)
- Field names match backend entity interfaces
- `columnMetadata` array structure matches backend `ColumnMetadata[]`
- `data` field uses `z.record(z.unknown())` for JSONB flexibility

### 5. Page Integration with Next.js App Router

**New file:** `app/(platform)/projects/[id]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { AppHeader } from '@/components/layout/app-header';
import { Button } from '@/components/ui/button';
import { BatchGrid } from '@/components/batches/batch-grid';
import { UploadBatchDialog } from '@/components/batches/upload-batch-dialog';
import { useProject } from '@/lib/query/hooks/use-projects';
import { useBatches } from '@/lib/query/hooks/use-batches';
import type { BatchWithTotalRows } from '@/lib/api/schemas/batch.schema';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: batchList, isLoading: batchesLoading } = useBatches(projectId);

  const [uploadOpen, setUploadOpen] = useState(false);

  function handleUploadClick() {
    setUploadOpen(true);
  }

  function handleBatchClick(batch: BatchWithTotalRows) {
    router.push(`/projects/${projectId}/batches/${batch.id}`);
  }

  return (
    <main className="w-full">
      <AppHeader title={project?.name ?? 'Projeto'}>
        <Button onClick={handleUploadClick} size="sm">
          <Plus />
          Novo Lote
        </Button>
      </AppHeader>

      <BatchGrid
        batches={batchList?.items}
        isLoading={batchesLoading}
        onUploadClick={handleUploadClick}
        onBatchClick={handleBatchClick}
      />

      <UploadBatchDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
      />
    </main>
  );
}
```

**Key patterns:**
- Use `useParams<{ id: string }>()` for type-safe param access
- Fetch both project (for header title) and batches (for grid)
- Local state for dialog open/close
- Navigate programmatically via `useRouter().push()`

**New file:** `app/(platform)/projects/[id]/batches/[batchId]/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { AppHeader } from '@/components/layout/app-header';
import { BatchDataTable } from '@/components/batches/batch-data-table';
import { useBatch, useBatchRows } from '@/lib/query/hooks/use-batches';
import { createColumns } from '@/components/batches/batch-table-columns';

export default function BatchDetailPage() {
  const params = useParams<{ id: string; batchId: string }>();
  const projectId = params.id;
  const batchId = params.batchId;

  const { data: batch } = useBatch(projectId, batchId);

  // Pagination state (managed locally, could sync with URL query params)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const offset = pagination.pageIndex * pagination.pageSize;

  const { data: rowList, isLoading } = useBatchRows(
    projectId,
    batchId,
    pagination.pageSize,
    offset
  );

  // Generate dynamic columns from columnMetadata
  const columns = batch?.columnMetadata
    ? createColumns(batch.columnMetadata)
    : [];

  return (
    <main className="w-full">
      <AppHeader title="Dados do Lote">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Projetos
          </Link>
          <ChevronRight className="size-4" />
          <Link href={`/projects/${projectId}`} className="hover:text-foreground">
            {batch?.projectId ?? 'Projeto'}
          </Link>
          <ChevronRight className="size-4" />
          <span className="text-foreground">Lote</span>
        </nav>
      </AppHeader>

      <div className="p-8">
        <BatchDataTable
          columns={columns}
          data={rowList?.items ?? []}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRows={rowList?.total ?? 0}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}
```

**Key patterns:**
- Nested dynamic routes: `[id]` and `[batchId]`
- Breadcrumb navigation for UX
- Pagination state syncs with `useBatchRows()` offset calculation
- Dynamic columns generated from `columnMetadata`

## Patterns to Follow

### Pattern 1: Server-Side Pagination State Management

**Use local component state, derive offset:**
```typescript
const [pagination, setPagination] = useState({
  pageIndex: 0,  // TanStack Table convention
  pageSize: 50
});

const offset = pagination.pageIndex * pagination.pageSize;

const { data } = useBatchRows(projectId, batchId, pagination.pageSize, offset);
```

**Why:** TanStack Table expects `pageIndex` (0-based), but the API expects `offset` (row number). Calculate offset from pageIndex to keep table logic clean.

**Optional enhancement:** Sync `pageIndex` with URL query params using `useSearchParams()` for shareable links.

### Pattern 2: Dynamic Columns from Metadata

**Use factory function to generate column definitions:**
```typescript
// components/batches/batch-table-columns.tsx
import type { ColumnDef } from '@tanstack/react-table';
import type { ColumnMetadata, Row } from '@/lib/api/schemas/batch.schema';

export function createColumns(columnMetadata: ColumnMetadata[]): ColumnDef<Row>[] {
  // Sort by position to maintain Excel column order
  const sorted = [...columnMetadata].sort((a, b) => a.position - b.position);

  return sorted.map((meta) => ({
    accessorFn: (row) => row.data[meta.normalizedKey],
    id: meta.normalizedKey,
    header: meta.originalHeader,
    cell: ({ getValue }) => {
      const value = getValue();
      // Format based on inferredType
      if (value === null || value === undefined) return '-';
      return String(value);
    },
  }));
}
```

**Why:** Each batch can have different columns (JSONB schema varies). Generate columns dynamically from `columnMetadata` rather than hardcoding.

### Pattern 3: File Upload with react-dropzone

**Use react-dropzone in upload dialog:**
```typescript
// components/batches/upload-batch-dialog.tsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { useUploadBatch } from '@/lib/query/hooks/use-batches';
import type { BatchMode } from '@/lib/api/schemas/batch.schema';

export function UploadBatchDialog({ open, onOpenChange, projectId }) {
  const [mode, setMode] = useState<BatchMode>('LIST_MODE');
  const [files, setFiles] = useState<File[]>([]);

  const uploadMutation = useUploadBatch();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 50,
  });

  async function handleUpload() {
    if (files.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return;
    }

    uploadMutation.mutate(
      { projectId, files, mode },
      {
        onSuccess: () => {
          toast.success('Lote criado com sucesso');
          onOpenChange(false);
          setFiles([]);
        },
        onError: () => {
          toast.error('Erro ao criar lote');
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mode selector radio group */}
      {/* Dropzone with getRootProps/getInputProps */}
      {/* File list preview */}
      {/* Upload button with isPending state */}
    </Dialog>
  );
}
```

**Key points:**
- `accept` prop validates file types client-side
- `maxSize` and `maxFiles` match backend limits (5MB, 50 files)
- Mutation handles API call, cache invalidation, toasts
- Clear files on success

### Pattern 4: TanStack Table with Server-Side Pagination

**Wire table with pagination state:**
```typescript
// components/batches/batch-data-table.tsx
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { BatchTablePagination } from './batch-table-pagination';

export function BatchDataTable({
  columns,
  data,
  pagination,
  onPaginationChange,
  totalRows,
  isLoading
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // Server-side pagination
    pageCount: Math.ceil(totalRows / pagination.pageSize),
    state: { pagination },
    onPaginationChange,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>Loading...</TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>Nenhum dado encontrado</TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BatchTablePagination table={table} totalRows={totalRows} />
    </div>
  );
}
```

**Key configurations:**
- `manualPagination: true` tells TanStack Table that pagination is server-controlled
- `pageCount` calculated from `totalRows` and `pageSize`
- `state: { pagination }` and `onPaginationChange` wire external state
- `getCoreRowModel()` only (no pagination model, since server-side)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Pagination with Large Datasets

**What goes wrong:** Loading all rows into browser memory, then paginating client-side.

```typescript
// ❌ WRONG
const { data: allRows } = useBatchRows(projectId, batchId, 999999, 0); // Fetch all
const table = useReactTable({
  data: allRows,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(), // Client-side pagination
});
```

**Why bad:** A batch with 10,000 rows would load 10,000 rows into memory, causing:
- Slow initial load
- Browser memory issues
- Wasted bandwidth

**Instead:** Use server-side pagination with `manualPagination: true` and fetch only the current page.

### Anti-Pattern 2: Setting Content-Type for FormData

**What goes wrong:** Manually setting `Content-Type: multipart/form-data` breaks file upload.

```typescript
// ❌ WRONG
const formData = new FormData();
formData.append('documents', file);

await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data', // Missing boundary!
  },
  body: formData,
});
```

**Why bad:** The browser must set `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...` with a generated boundary. If you set it manually without the boundary, the server can't parse the multipart data.

**Instead:** Let the browser set `Content-Type` automatically when using `FormData`. Modify API client to NOT force `application/json` when `Content-Type` is already set.

### Anti-Pattern 3: Invalidating Specific Pagination Queries

**What goes wrong:** Only invalidating the current page after upload, causing stale data on other pages.

```typescript
// ❌ WRONG
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ['projects', projectId, 'batches', { limit: 50, offset: 0 }]
  });
}
```

**Why bad:** If the user is on page 2 (offset: 50), that query won't be invalidated. When they navigate back to page 1, they'll see stale data.

**Instead:** Use partial query key matching to invalidate ALL pagination states:
```typescript
queryClient.invalidateQueries({
  queryKey: ['projects', projectId, 'batches'] // Matches all sub-queries
});
```

### Anti-Pattern 4: Hardcoded Column Definitions

**What goes wrong:** Defining table columns in code instead of deriving from `columnMetadata`.

```typescript
// ❌ WRONG
const columns = [
  { accessorKey: 'cnpj', header: 'CNPJ' },
  { accessorKey: 'razaoSocial', header: 'Razão Social' },
  // ... hardcoded columns
];
```

**Why bad:** Each batch can have different columns (user uploads different Excel files). Hardcoded columns won't match the actual data structure.

**Instead:** Generate columns dynamically from `batch.columnMetadata` using a factory function.

## Scalability Considerations

| Concern | At 100 rows | At 10K rows | At 1M rows |
|---------|-------------|-------------|------------|
| **Pagination** | Client-side OK | Server-side required | Server-side + cursor-based pagination |
| **Column count** | All columns visible | Horizontal scroll | Virtual scrolling + column hiding controls |
| **Initial load** | Fetch first page | Fetch first page | Fetch first page + streaming (future) |
| **Search/Filter** | Client-side | Server-side via query params | Server-side with debounced input |
| **Export** | Browser download | Server-side export job | Background job + email link |

**Current implementation targets:** 10K rows per batch (server-side pagination, no virtualization needed yet).

**Future optimizations:**
- Add column visibility controls for wide tables (20+ columns)
- Add server-side search/filter via API query params
- Add virtual scrolling for batches with 50+ columns
- Add cursor-based pagination for batches with 100K+ rows

## Build Order (Recommended Implementation Sequence)

### Phase 1: Foundation (Backend Integration)

1. **Add shadcn/ui table component:**
   ```bash
   cd apps/web
   pnpm dlx shadcn@latest add table
   ```

2. **Create Zod schemas:**
   - `lib/api/schemas/batch.schema.ts` (all schemas above)
   - Export in `lib/api/schemas/index.ts`

3. **Modify API client for FormData:**
   - Update `lib/api/client.ts` to conditionally set `Content-Type`

4. **Create batch endpoints:**
   - `lib/api/endpoints/batches.ts` (endpoint factory)
   - Export in `lib/api/endpoints/index.ts`

5. **Create React Query hooks:**
   - `lib/query/hooks/use-batches.ts` (all hooks above)
   - Export in `lib/query/hooks/index.ts`

**Test:** Verify hooks work in isolation (browser console or Storybook).

### Phase 2: Batch List Page

6. **Create empty state component:**
   - `components/batches/batch-empty-state.tsx`

7. **Create batch card component:**
   - `components/batches/batch-card.tsx`
   - Display: status badge, row count, created date, mode

8. **Create batch grid component:**
   - `components/batches/batch-grid.tsx`
   - Layout: responsive grid (same as project-grid)
   - States: loading skeleton, empty state, populated grid

9. **Create project detail page:**
   - `app/(platform)/projects/[id]/page.tsx`
   - Wire up: `useBatches()`, `BatchGrid`

**Test:** Navigate to `/projects/{id}`, verify batch list loads and displays.

### Phase 3: Upload Modal

10. **Install react-dropzone:**
    ```bash
    cd apps/web
    npm install react-dropzone
    ```

11. **Create upload dialog component:**
    - `components/batches/upload-batch-dialog.tsx`
    - Features: mode selector (radio group), dropzone, file list preview, upload button
    - Wire up: `useUploadBatch()` mutation

12. **Integrate upload dialog into project detail page:**
    - Add "Novo Lote" button in `AppHeader`
    - Wire dialog open/close state

**Test:** Upload files, verify batch appears in list after successful upload.

### Phase 4: Data Table Page

13. **Create dynamic column factory:**
    - `components/batches/batch-table-columns.tsx`
    - Function: `createColumns(columnMetadata)`

14. **Create pagination component:**
    - `components/batches/batch-table-pagination.tsx`
    - Buttons: Previous, Next, page info

15. **Create data table component:**
    - `components/batches/batch-data-table.tsx`
    - Integrate: TanStack Table, shadcn/ui Table, pagination controls

16. **Create batch detail page:**
    - `app/(platform)/projects/[id]/batches/[batchId]/page.tsx`
    - Wire up: `useBatch()`, `useBatchRows()`, `BatchDataTable`
    - Add: breadcrumb navigation

**Test:** Click batch card, verify data table loads with correct columns and pagination.

### Phase 5: Polish

17. **Add loading states:**
    - Skeleton loaders for batch cards
    - Table loading state (spinner or skeleton rows)

18. **Add error states:**
    - Error boundaries for pages
    - Toast notifications for mutation errors

19. **Add empty states:**
    - "No batches yet" for project detail
    - "No rows found" for data table

20. **Add accessibility:**
    - ARIA labels for buttons
    - Keyboard navigation for pagination
    - Focus management in dialogs

**Test:** Manual QA for UX edge cases.

## Sources

**Next.js App Router:**
- [Next.js Dynamic Routes Documentation](https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes)
- [Next.js useParams Hook](https://nextjs.org/docs/app/api-reference/functions/use-params)
- [Next.js Dynamic Route Segments Guide 2026](https://thelinuxcode.com/nextjs-dynamic-route-segments-in-the-app-router-2026-guide/)

**TanStack Query (React Query):**
- [TanStack Query Mutations Guide](https://tanstack.com/query/latest/docs/react/guides/mutations)
- [React Query useMutation for File Upload Discussion](https://github.com/TanStack/query/discussions/1098)
- [TanStack Query Better Upload Integration](https://better-upload.com/docs/guides/tanstack-query)

**TanStack Table:**
- [TanStack Table Pagination Guide](https://tanstack.com/table/v8/docs/guide/pagination)
- [TanStack Table Pagination Example](https://tanstack.com/table/v8/docs/framework/react/examples/pagination)
- [Server-Side Pagination with TanStack Table](https://medium.com/@aylo.srd/server-side-pagination-and-sorting-with-tanstack-table-and-react-bd493170125e)

**shadcn/ui:**
- [shadcn/ui Data Table Guide](https://ui.shadcn.com/docs/components/data-table)
- [shadcn/ui Table Component](https://ui.shadcn.com/docs/components/table)

**File Upload:**
- [react-dropzone Official Documentation](https://react-dropzone.js.org/)
- [Building File Upload with react-dropzone](https://medium.com/@basavarajavyadav/building-a-file-upload-component-with-react-and-react-dropzone-a28afc075e4d)
- [React-Dropzone File Upload Tutorial](https://dev.to/nnnirajn/how-to-use-react-dropzone-for-uploading-files-hm2)

**Existing Codebase:**
- `apps/web/lib/api/client.ts` (API client implementation)
- `apps/web/lib/api/endpoints/projects.ts` (endpoint factory pattern)
- `apps/web/lib/query/hooks/use-projects.ts` (React Query hooks pattern)
- `apps/web/app/(platform)/projects/page.tsx` (page structure pattern)
- `apps/api/src/presentation/controllers/batch.controller.ts` (backend API structure)
- `apps/api/src/presentation/dto/batch.dto.ts` (backend pagination schema)
- `apps/api/src/core/entities/batch.entity.ts` (backend entity definitions)
