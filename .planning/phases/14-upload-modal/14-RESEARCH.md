# Phase 14: Upload Modal - Research Findings

**Researched:** 2026-01-30
**Phase:** 14-upload-modal
**Goal:** Build a drag-and-drop file upload modal for creating batches from Excel files

---

## What You Need to Know to Plan This Phase

### 1. Existing Infrastructure (Already Built in Phase 13)

#### API Integration Layer
- **Upload endpoint**: `POST /projects/:projectId/batches` (FormData multipart)
- **React Query hook**: `useUploadBatch(projectId)` from `/apps/web/lib/query/hooks/use-batches.ts`
  - Returns TanStack Query mutation with `mutate(formData)`, `isPending`, `isError`, `error`
  - Automatically invalidates batch list query on success (batch list refreshes)
  - Handles FormData uploads via `endpoints.upload(projectId, formData)`
- **API client**: `useApiClient()` hook with automatic Clerk auth token injection
  - **CRITICAL**: The client automatically skips `Content-Type` header for FormData bodies (line 83-85 in `client.ts`)
  - Browser sets `Content-Type: multipart/form-data; boundary=...` automatically

#### Batch Schema (from Phase 13)
```typescript
// apps/web/lib/api/schemas/batch.schema.ts
export const batchResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  mode: z.enum(['LIST_MODE', 'PROFILE_MODE']),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']),
  fileCount: z.number(),
  rowCount: z.number(),
  columnMetadata: z.array(columnMetadataSchema),
  totalRows: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  deletedBy: z.string().nullable(),
});
```

#### Project Detail Page Context
- **Location**: `/apps/web/app/(platform)/projects/[id]/page.tsx`
- **Current button state**: `<Button size="sm" disabled>Nova Importacao</Button>` (line 136-139)
- **Data flow**: Page uses `useBatches(projectId)` to list batches
  - Batch list shows empty state if no batches exist
  - Toast notifications already implemented via `toast.error()` (line 36)
  - Sonner toaster configured in root layout with `richColors` prop

---

### 2. Technology Stack for Upload Modal

#### Already Installed (Verified)
- **shadcn/ui Dialog**: Full modal system with overlay, content, header, footer (`/apps/web/components/ui/dialog.tsx`)
  - Supports `showCloseButton` prop to hide close button during upload
  - Built on Radix UI Dialog primitive with controlled open state
- **shadcn/ui Card**: For mode selector cards (`/apps/web/components/ui/card.tsx`)
  - Card, CardHeader, CardTitle, CardDescription, CardContent components
- **shadcn/ui Button**: With loading spinner support via `disabled={isPending}` pattern
  - `Loader2` icon from lucide-react with `animate-spin` class
- **sonner**: Toast library with `toast.success()`, `toast.error()` (already used in projects page)
- **react-hook-form + zod**: Form validation pattern (used in ProjectFormDialog)
- **lucide-react**: Icon library (Upload icon available for button)

#### Required Additions
1. **react-dropzone v14.4.0** (NOT YET INSTALLED)
   - Hook-based API: `useDropzone({ accept, maxFiles, maxSize, onDrop, onDropRejected })`
   - Returns: `getRootProps()`, `getInputProps()`, `isDragActive`, `isDragAccept`, `isDragReject`
   - **React 19 compatibility**: Works but requires `npm install --legacy-peer-deps` (peer dependency warning)
   - **Installation command**: `npm install react-dropzone@^14.4.0 --legacy-peer-deps`
   - **Source**: STACK.md research, verified from Context7 docs

2. **Optional shadcn/ui components** (NOT YET INSTALLED, may add later):
   - **progress** component for upload progress bar (optional)
   - **radio-group** if using radio buttons for mode selector (alternative to cards)

---

### 3. File Upload Patterns (react-dropzone)

#### Basic Setup for .xlsx Files Only
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
  accept: {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  },
  maxSize: 5 * 1024 * 1024, // 5MB in bytes
  maxFiles: 1, // List Mode (single file), Profile Mode will use maxFiles: Infinity
  onDrop: (acceptedFiles, fileRejections) => {
    // Handle accepted files
    setSelectedFiles(acceptedFiles);
  },
  onDropRejected: (fileRejections) => {
    // Show toast for rejected files
    fileRejections.forEach(({ file, errors }) => {
      const errorMessages = errors.map(e => e.message).join(', ');
      toast.error(`${file.name}: ${errorMessages}`);
    });
  }
});
```

#### Visual Feedback on Dragover
- **isDragActive**: True when any file is being dragged over the dropzone
- **isDragAccept**: True when dragged files match accept criteria
- **isDragReject**: True when dragged files don't match accept criteria
- **Pattern**: Apply different background color/border when `isDragActive` is true
  ```typescript
  <div
    {...getRootProps()}
    className={cn(
      "border-2 border-dashed rounded-lg p-8",
      isDragActive ? "bg-primary/10 border-primary" : "bg-muted/50 border-muted-foreground/25"
    )}
  >
  ```

#### File Rejections (react-dropzone error codes)
- **file-too-large**: File exceeds `maxSize` (5MB)
- **file-invalid-type**: File doesn't match `accept` MIME type (.xlsx)
- **too-many-files**: More files dropped than `maxFiles` allows (List Mode only)

#### Mode-Based File Count
- **List Mode**: `maxFiles: 1` (single Excel file with multiple rows)
- **Profile Mode**: `maxFiles: Infinity` (multiple Excel files, one per entity)
- **Implementation**: Recreate dropzone instance when mode changes OR use `multiple` prop conditionally

---

### 4. Modal State Management Patterns

#### Project Form Dialog Pattern (Existing Reference)
**Location**: `/apps/web/components/projects/project-form-dialog.tsx`

**Key patterns to replicate:**
1. **Controlled modal state**: `open` and `onOpenChange` props from parent
2. **Form reset on open**: `useEffect(() => { if (open) form.reset() }, [open, form])`
3. **Loading state**: Button shows `Loader2` spinner when `isPending` is true
4. **Form submission**: `form.handleSubmit(handleSubmit)` pattern with react-hook-form
5. **Close on success**: Parent component sets `setFormOpen(false)` in mutation `onSuccess` callback

#### Upload Modal State Requirements
```typescript
// Parent component (project detail page)
const [uploadModalOpen, setUploadModalOpen] = useState(false);
const uploadMutation = useUploadBatch(projectId);

function handleUploadSubmit(formData: FormData) {
  uploadMutation.mutate(formData, {
    onSuccess: () => {
      setUploadModalOpen(false);
      toast.success('Batch importado com sucesso');
      // Batch list auto-refreshes via query invalidation in useUploadBatch
    },
    onError: (error) => {
      toast.error('Erro ao importar batch');
      // Modal stays open so user can retry
    }
  });
}
```

#### Preventing Modal Close During Upload
- **Pattern from Dialog component**: `onOpenChange` prop controls open state
- **Implementation**: Ignore `onOpenChange(false)` calls when `isPending` is true
  ```typescript
  function handleOpenChange(open: boolean) {
    if (!open && uploadMutation.isPending) {
      return; // Block closing during upload
    }
    setUploadModalOpen(open);
  }
  ```
- **Dialog close button**: Set `showCloseButton={false}` in DialogContent when `isPending` is true
- **Escape key**: Radix Dialog automatically respects `onOpenChange` callback, so blocking close there also blocks Escape

---

### 5. Toast Notification Patterns (Sonner)

#### Existing Usage Pattern
**Reference**: `/apps/web/app/(platform)/projects/page.tsx` lines 55-104

```typescript
import { toast } from 'sonner';

// Success toast
toast.success('Projeto criado');

// Error toast
toast.error('Erro ao criar o projeto');
```

#### Toast Configuration
- **Location**: `/apps/web/app/layout.tsx` line 55
- **Setup**: `<Toaster richColors />` (already configured)
- **Icons**: Custom icons configured in `/apps/web/components/ui/sonner.tsx` (CircleCheckIcon for success, OctagonXIcon for error)

#### Upload Modal Toast Requirements
1. **File rejection**: Show toast immediately when files are rejected (wrong type, too large)
   - Message format: "Formato invalido. Use arquivos .xlsx"
   - Trigger: `onDropRejected` callback in useDropzone
2. **Upload success**: Show toast after batch creation completes
   - Message: "Batch importado com sucesso" (or similar)
   - Trigger: `onSuccess` callback in useMutation
3. **Upload failure**: Show toast if API returns error
   - Message: "Erro ao importar batch" (generic) or parse API error message
   - Trigger: `onError` callback in useMutation

---

### 6. FormData Construction for Upload

#### Backend Expectation (from Phase 13 context)
```typescript
// Backend expects:
// - mode: 'LIST_MODE' | 'PROFILE_MODE' (string field)
// - file: Binary file data (single file in List Mode)
// - files: Array of binary files (Profile Mode - NOT YET IMPLEMENTED in Phase 13)
```

#### Client-Side FormData Pattern
```typescript
function createUploadFormData(mode: 'LIST_MODE' | 'PROFILE_MODE', files: File[]): FormData {
  const formData = new FormData();
  formData.append('mode', mode);

  if (mode === 'LIST_MODE') {
    formData.append('file', files[0]); // Single file
  } else {
    files.forEach((file) => {
      formData.append('files', file); // Multiple files with same key
    });
  }

  return formData;
}
```

#### Critical API Client Behavior
**From `/apps/web/lib/api/client.ts` lines 82-85:**
```typescript
const headers = new Headers(requestOptions.headers);
if (!(requestOptions.body instanceof FormData)) {
  headers.set('Content-Type', 'application/json');
}
```

**What this means:**
- When body is FormData, API client does NOT set Content-Type header
- Browser automatically sets `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`
- **DO NOT manually set Content-Type** or upload will fail (boundary will be missing)

---

### 7. Validation Strategy

#### Client-Side Validation (Before Upload)
1. **Mode selection required**: Submit button disabled until mode is selected
2. **File selection required**: Submit button disabled until at least one file is selected
3. **File type validation**: Handled by react-dropzone `accept` prop
4. **File size validation**: Handled by react-dropzone `maxSize` prop (5MB)
5. **File count validation**: Handled by react-dropzone `maxFiles` prop (1 for List Mode, unlimited for Profile Mode)

#### Validation Error Display
- **Client-side errors**: Toast notification immediately on file rejection
- **Server-side errors**: Toast notification in mutation `onError` callback
- **No inline form errors**: All errors shown via toasts (simpler UX for file upload)

#### Zod Schema (Optional Pattern)
```typescript
// Could define schema for mode + files, but react-dropzone handles file validation
const uploadFormSchema = z.object({
  mode: z.enum(['LIST_MODE', 'PROFILE_MODE']),
  files: z.array(z.instanceof(File)).min(1, 'Selecione pelo menos um arquivo')
});
```

**Decision**: Zod schema may be overkill since react-dropzone handles file validation. Mode validation can be done via simple state check.

---

### 8. UI Component Structure (Recommended Pattern)

#### File Structure
```
apps/web/components/projects/
├── upload-batch-modal.tsx         # Main modal component
├── mode-selector.tsx              # List/Profile mode card selector (optional, can be inline)
└── file-dropzone.tsx              # Drag-and-drop zone (optional, can be inline)
```

**Alternative (simpler)**: Single `upload-batch-modal.tsx` file with all logic inline (recommended for first iteration)

#### Component Composition
```typescript
// upload-batch-modal.tsx
<Dialog open={open} onOpenChange={handleOpenChange}>
  <DialogContent showCloseButton={!isPending}>
    <DialogHeader>
      <DialogTitle>Nova Importacao</DialogTitle>
      <DialogDescription>Escolha o modo e adicione arquivos Excel</DialogDescription>
    </DialogHeader>

    {/* Step 1: Mode selector (cards) */}
    {!selectedMode && <ModeSelector onSelect={setSelectedMode} />}

    {/* Step 2: File upload (only shown after mode selected) */}
    {selectedMode && (
      <>
        <FileDropzone
          mode={selectedMode}
          onFilesSelected={setSelectedFiles}
          selectedFiles={selectedFiles}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFiles.length || isPending}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </>
    )}
  </DialogContent>
</Dialog>
```

#### Mode Selector Design
**Pattern**: Side-by-side cards (not radio buttons)
```typescript
<div className="grid grid-cols-2 gap-4">
  <Card
    className={cn(
      "cursor-pointer transition-colors",
      selectedMode === 'LIST_MODE' ? "border-primary ring-2 ring-primary" : ""
    )}
    onClick={() => setSelectedMode('LIST_MODE')}
  >
    <CardHeader>
      <CardTitle>Modo Lista</CardTitle>
      <CardDescription>
        Importe uma planilha com vários registros
      </CardDescription>
    </CardHeader>
  </Card>

  <Card
    className={cn(
      "cursor-pointer transition-colors",
      selectedMode === 'PROFILE_MODE' ? "border-primary ring-2 ring-primary" : ""
    )}
    onClick={() => setSelectedMode('PROFILE_MODE')}
  >
    <CardHeader>
      <CardTitle>Modo Perfil</CardTitle>
      <CardDescription>
        Importe arquivos individuais por entidade
      </CardDescription>
    </CardHeader>
  </Card>
</div>
```

#### File Dropzone Design
**Pattern**: Solid background box (not dashed border) with overlay on dragover
```typescript
<div
  {...getRootProps()}
  className={cn(
    "rounded-lg p-8 text-center transition-colors",
    isDragActive
      ? "bg-primary/20 border-2 border-primary"
      : "bg-muted/50 border-2 border-muted-foreground/25"
  )}
>
  <input {...getInputProps()} />
  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />

  {isDragActive ? (
    <p className="mt-4 text-lg font-medium">Solte os arquivos aqui</p>
  ) : (
    <>
      <p className="mt-4 text-sm font-medium">
        Arraste arquivos .xlsx ou clique para selecionar
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Tamanho máximo: 5MB {selectedMode === 'LIST_MODE' && '· Apenas 1 arquivo'}
      </p>
    </>
  )}
</div>

{/* File list (shown after files selected) */}
{selectedFiles.length > 0 && (
  <div className="mt-4 space-y-2">
    {selectedFiles.map((file, index) => (
      <div key={index} className="flex items-center justify-between rounded-md bg-muted p-3">
        <div className="flex items-center gap-3">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeFile(index)}
          disabled={isPending}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    ))}
  </div>
)}
```

---

### 9. Integration Points with Project Detail Page

#### Button Click Handler
**Current state** (line 136-139 of `[id]/page.tsx`):
```typescript
<Button size="sm" disabled>
  <Upload className="mr-2 h-4 w-4" />
  Nova Importacao
</Button>
```

**Updated state**:
```typescript
const [uploadModalOpen, setUploadModalOpen] = useState(false);

<Button size="sm" onClick={() => setUploadModalOpen(true)}>
  <Upload className="mr-2 h-4 w-4" />
  Nova Importacao
</Button>

<UploadBatchModal
  open={uploadModalOpen}
  onOpenChange={setUploadModalOpen}
  projectId={id}
  onSuccess={() => {
    // Query invalidation happens automatically in useUploadBatch
    // Just need to show success toast and close modal
  }}
/>
```

#### Batch List Refresh
- **Automatic**: `useUploadBatch` hook already invalidates `['projects', projectId, 'batches']` query key on success
- **Location**: `/apps/web/lib/query/hooks/use-batches.ts` lines 58-61
- **No manual refetch needed**: TanStack Query automatically refetches when query is invalidated

---

### 10. Error Handling Scenarios

#### Client-Side Errors
| Scenario | Detection | User Feedback |
|----------|-----------|---------------|
| Wrong file type (.xls, .csv) | react-dropzone `onDropRejected` | Toast: "Formato invalido. Use arquivos .xlsx" |
| File too large (>5MB) | react-dropzone `onDropRejected` | Toast: "Arquivo muito grande. Tamanho máximo: 5MB" |
| Too many files (List Mode) | react-dropzone `onDropRejected` | Toast: "Modo Lista aceita apenas 1 arquivo" |
| No mode selected | Submit button disabled | Button stays disabled until mode selected |
| No files selected | Submit button disabled | Button stays disabled until files selected |

#### Server-Side Errors
| Scenario | Detection | User Feedback |
|----------|-----------|---------------|
| Network error | useMutation `onError` | Toast: "Erro de conexão. Tente novamente." |
| 401 Unauthorized | API client auto-retry, then ApiError | Toast: "Sessão expirada. Faça login novamente." |
| 400 Bad Request | useMutation `onError` with ApiError | Toast: "Arquivo inválido. Verifique o formato." |
| 500 Server Error | useMutation `onError` with ApiError | Toast: "Erro no servidor. Tente novamente mais tarde." |

#### Error Display Pattern
```typescript
uploadMutation.mutate(formData, {
  onError: (error) => {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
      } else if (error.status === 400) {
        toast.error('Arquivo inválido. Verifique o formato.');
      } else {
        toast.error('Erro ao importar batch. Tente novamente.');
      }
    } else {
      toast.error('Erro de conexão. Tente novamente.');
    }
    // Modal stays open so user can retry
  }
});
```

---

### 11. Testing Checklist (For Planning)

#### Modal Behavior
- [ ] Modal opens when "Nova Importacao" button clicked
- [ ] Modal shows mode selector initially (no file upload area)
- [ ] Modal shows file upload area after mode selected
- [ ] Modal close button disabled during upload
- [ ] Escape key blocked during upload
- [ ] Click outside modal blocked during upload (Radix Dialog default)
- [ ] Modal closes automatically on successful upload
- [ ] Modal stays open on upload failure

#### Mode Selector
- [ ] No mode selected by default
- [ ] Clicking List Mode card selects it (visual highlight)
- [ ] Clicking Profile Mode card selects it (visual highlight)
- [ ] File upload area appears after mode selected
- [ ] Changing mode after files selected clears file list (if implementing mode change)

#### Drag-and-Drop
- [ ] Drop zone shows hover effect when file dragged over
- [ ] Drop zone accepts .xlsx files
- [ ] Drop zone rejects .xls files (toast notification)
- [ ] Drop zone rejects .csv files (toast notification)
- [ ] Drop zone rejects files >5MB (toast notification)
- [ ] List Mode: dropping second file replaces first file
- [ ] Profile Mode: dropping multiple files adds all valid files
- [ ] Click to browse works as fallback

#### File List Display
- [ ] Selected files appear below drop zone
- [ ] File name and size displayed correctly
- [ ] Remove button removes file from list
- [ ] Drop zone stays visible after files selected (can add more in Profile Mode)

#### Upload Flow
- [ ] Submit button disabled until mode + files selected
- [ ] Submit button shows spinner during upload
- [ ] Form inputs disabled during upload
- [ ] Success toast appears on successful upload
- [ ] Error toast appears on failed upload
- [ ] Batch list refreshes after successful upload

---

### 12. Open Questions / Decisions Needed

#### Mode Change After File Selection
**Question**: If user selects List Mode + adds files, then switches to Profile Mode, what happens to files?

**Options**:
1. **Clear files on mode change** (simpler, prevents confusion)
2. **Keep files if valid for new mode** (better UX, but more complex)
3. **Disable mode change after files selected** (simplest)

**Recommendation**: Option 1 (clear files) or Option 3 (disable mode change). Context doc doesn't specify, so planner should decide.

#### Profile Mode Implementation Status
**From CONTEXT.md**: "files: Array of binary files (Profile Mode - NOT YET IMPLEMENTED in Phase 13)"

**Question**: Is Profile Mode backend ready, or should we only implement List Mode UI?

**Recommendation**: Check with backend team or implement UI for both modes but test only List Mode first.

#### Progress Bar During Upload
**Context doc says**: "Modal stays open with a loading spinner on the submit button"

**Question**: Should we add a progress bar component, or is button spinner sufficient?

**Options**:
1. **Button spinner only** (matches existing ProjectFormDialog pattern)
2. **Add progress bar** (better for large file uploads, requires shadcn/ui progress component)

**Recommendation**: Start with button spinner (Option 1), add progress bar later if users request it.

---

### 13. Dependencies Summary

#### Must Install Before Implementation
```bash
# From monorepo root
npm install react-dropzone@^14.4.0 --legacy-peer-deps
```

#### Already Available (No Installation Needed)
- shadcn/ui Dialog, Card, Button components
- sonner toast library
- react-hook-form + zod (if using form validation)
- TanStack Query (useMutation pattern)
- lucide-react icons (Upload, File, X icons)

#### Optional (May Install Later)
```bash
cd apps/web
pnpm dlx shadcn@latest add progress  # For upload progress bar
pnpm dlx shadcn@latest add radio-group  # If using radio buttons instead of cards
```

---

### 14. Code References for Planning

#### Patterns to Follow
1. **Modal with form validation**: `/apps/web/components/projects/project-form-dialog.tsx`
   - Form state management, loading state, error handling
2. **Modal with destructive action**: `/apps/web/components/projects/delete-project-dialog.tsx`
   - Confirmation flow, disabled state during action
3. **Mutation with toast notifications**: `/apps/web/app/(platform)/projects/page.tsx`
   - `onSuccess` and `onError` callbacks with toast
4. **API client usage**: `/apps/web/lib/query/hooks/use-batches.ts`
   - useApiClient pattern, endpoint factory pattern

#### Files to Modify
1. `/apps/web/app/(platform)/projects/[id]/page.tsx` - Add upload button click handler
2. Create new file: `/apps/web/components/projects/upload-batch-modal.tsx` - Main modal component

#### Files to Reference (No Changes)
1. `/apps/web/lib/query/hooks/use-batches.ts` - useUploadBatch hook (already built)
2. `/apps/web/lib/api/client.ts` - FormData handling (already correct)
3. `/apps/web/components/ui/dialog.tsx` - Dialog component API
4. `/apps/web/components/ui/card.tsx` - Card component API

---

### 15. Performance Considerations

#### react-dropzone Performance
- **File validation**: Synchronous, <10ms for single file
- **Drag events**: Single state update per drag event (negligible)
- **File objects**: Browser creates File references instantly (no parsing)
- **Large files (50MB)**: No performance impact client-side (file only uploaded when submit clicked)

#### Modal Rendering
- **shadcn/ui Dialog**: Radix UI Portal-based, renders outside DOM tree (no layout shift)
- **Mode selector cards**: Static content, no performance concerns
- **File list**: Renders only selected files (typically 1-10), no virtualization needed

#### Upload Progress
- **No progress tracking in Phase 14**: Upload is single mutation, no progress events
- **Browser shows native upload indicator**: For large files, browser may show upload progress in DevTools
- **Future enhancement**: Add progress bar with upload progress events (requires backend chunked upload support)

---

### 16. Accessibility Notes

#### Keyboard Navigation
- **Dialog**: Radix Dialog handles focus trap automatically (Tab cycles through modal)
- **Mode selector cards**: Make cards keyboard-accessible with `onKeyDown` handler (Enter/Space to select)
- **Dropzone**: react-dropzone `getInputProps()` adds hidden `<input type="file">` with keyboard support
- **File removal**: Remove buttons must be keyboard-accessible (Button component already handles this)

#### Screen Readers
- **Dialog title**: DialogTitle is automatically announced when modal opens
- **Drag instructions**: "Arraste arquivos .xlsx ou clique para selecionar" is visible text (screen reader accessible)
- **File list**: Each file item should have accessible name (file.name is already text content)
- **Loading state**: Button with spinner should have `aria-label="Uploading..."` when `isPending` is true

---

## Summary: What the Planner Needs

### Critical Knowledge
1. **useUploadBatch hook exists** - No need to build API integration from scratch
2. **react-dropzone must be installed** - `npm install react-dropzone@^14.4.0 --legacy-peer-deps`
3. **FormData handling is automatic** - API client skips Content-Type for FormData bodies
4. **Modal close blocking pattern** - Check `isPending` in `onOpenChange` handler
5. **Toast notification pattern** - Use `toast.success()` and `toast.error()` from sonner

### Component Structure
1. **Single file approach recommended** - `upload-batch-modal.tsx` with all logic inline
2. **Two-step flow** - Mode selector first, then file upload area
3. **Visual feedback** - Use `isDragActive` to show drag overlay
4. **File list display** - Show selected files below drop zone with name, size, remove button

### Validation Strategy
1. **Client-side via react-dropzone** - File type, size, count validated before upload
2. **Submit button disabled** - Until mode + files selected
3. **Toast for rejections** - Show toast immediately when files rejected
4. **Server errors in mutation callback** - Show toast in `onError`, keep modal open for retry

### Integration Points
1. **Project detail page button** - Change from `disabled` to `onClick={() => setUploadModalOpen(true)}`
2. **Batch list refresh** - Automatic via query invalidation in useUploadBatch hook
3. **Toast notifications** - Already configured in root layout with sonner

### Open Decisions
1. **Profile Mode backend status** - Verify if ready for testing
2. **Mode change after file selection** - Clear files, keep files, or disable mode change?
3. **Progress bar** - Button spinner only, or add progress component?

---

**Ready for planning**: Yes
**Blockers**: None (all dependencies clear)
**Estimated complexity**: Medium (react-dropzone integration + modal state management)
