# Feature Landscape: Dashboard Upload & Listing UI

**Domain:** B2B SaaS File Upload & Data Table Interfaces
**Researched:** 2026-01-30
**Confidence:** HIGH

## Executive Summary

This research covers three interconnected UI patterns for the Populatte dashboard: **file upload interfaces**, **batch listing dashboards**, and **data table views**. These patterns are well-established in enterprise SaaS with clear user expectations.

**Key findings:**
1. File upload UIs require drag-and-drop + manual selection, progress indicators, and clear error messaging
2. Batch listing dashboards prioritize newest-first sorting, status visibility, and quick access to details
3. Data tables must support server-side pagination, deterministic sorting, and skeleton loading states
4. Empty states are critical UX moments for user onboarding and orientation

Research drew from shadcn/ui patterns (already used in project), TanStack Query v5 patterns (project's data fetching library), and enterprise SaaS best practices documented in 2026.

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

### File Upload Interface

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Drag-and-drop zone** | Standard in 2026 SaaS; users attempt it without thinking | Medium | shadcn/ui primitives, file validation | Must show visual feedback on dragover (border color change) |
| **Manual file selection fallback** | Accessibility requirement; drag-and-drop not usable on mobile or for users with disabilities | Low | HTML input[type=file] | Required by WCAG 2.1 standards |
| **File validation feedback** | Prevents frustration from silent failures | Medium | Existing backend validation (5MB, 50 files, mode rules) | Show errors before upload attempt when possible |
| **Progress indicator** | Required for uploads >1s; users abandon without feedback | Medium | Upload state management | Determinate progress bar (0-100%) with time estimate |
| **Upload cancellation** | Users expect control over ongoing operations | Medium | AbortController API | Cancel button visible during upload |
| **Mode selection UI** | Critical business requirement (List vs Profile mode) | Medium | Existing mode enum from API | Must prevent upload if mode not selected |
| **Multi-file display** | Profile mode allows up to 50 files; users need visibility | Medium | File list component | Show filename, size, remove button per file |
| **Error recovery** | Failed uploads must allow retry without losing selected files | Medium | Upload state management | "Retry" button + error message display |

### Batch Listing Dashboard

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Newest-first sorting** | Users care about recent activity first | Low | Existing API (DESC sorting) | Already implemented backend-side |
| **Batch metadata display** | Users need quick identification (date, mode, row count) | Low | Existing batch schema | Show createdAt, mode, totalRows |
| **Status visibility** | Users need to know processing state at-a-glance | Medium | Future: async processing state | MVP: all batches are "completed" (synchronous upload) |
| **Click-to-detail navigation** | Standard card interaction pattern | Low | Next.js routing | Navigate to /projects/:projectId/batches/:batchId |
| **Empty state with CTA** | First-time users need guidance to first action | Low | Existing ProjectEmptyState pattern | "Upload your first batch" message + button |
| **Loading skeletons** | Users expect immediate UI feedback during data fetch | Low | shadcn/ui Skeleton | Match batch card layout (similar to ProjectGrid pattern) |
| **"New Import" button** | Primary action must be prominent | Low | Button component | Fixed position (header) or floating action button |

### Data Table View (Batch Rows)

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Server-side pagination** | Required for scalability (batches can have 1000s of rows) | Medium | Existing pagination API, TanStack Query | API already supports limit/offset |
| **Column headers from data** | Users need to see Excel column names (list mode) or cell addresses (profile mode) | Medium | Batch columnMetadata field | Dynamic column generation based on batch mode |
| **Deterministic row order** | Consistent pagination requires stable sorting | Low | Existing sourceRowIndex + id tiebreaker | Already implemented backend-side |
| **Loading states** | Users expect skeleton UI during fetch | Low | shadcn/ui Skeleton | Show skeleton rows during initial load and pagination |
| **Empty state** | Handle zero-row batches gracefully | Low | Existing empty state pattern | Unlikely edge case but required for completeness |
| **Row count display** | Users need to know dataset size | Low | Existing totalRows field | "Showing X-Y of Z rows" label |
| **Responsive layout** | Tables must work on smaller screens | Medium | shadcn/ui responsive patterns | Horizontal scroll or card layout on mobile |

---

## Differentiators

Features that set Populatte apart. Not expected, but valued.

### Upload Experience

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Inline mode explanation** | Reduces support burden by explaining List vs Profile mode visually | Low | Tooltip or InfoCard component | "List Mode: One Excel file with rows" vs "Profile Mode: Multiple files" |
| **File preview thumbnails** | Increases user confidence before upload | High | File reading API, icon library | MVP: File icon + name sufficient |
| **Smart mode suggestion** | "You selected 1 file, List Mode is recommended" | Medium | File count logic | Guides users to correct mode |
| **Batch naming** | Users can label batches for easier identification | Low | Add name field to batch schema | Optional field, defaults to "Import {date}" |
| **Duplicate upload warning** | "You uploaded this file 2 days ago, continue?" | High | File hash comparison | Deferred: complex, low ROI for MVP |

### Batch Dashboard

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Search/filter batches** | Helps users find specific imports in long history | Medium | Client-side filtering or API endpoint | Start client-side, migrate to server-side when pagination added |
| **Batch deletion** | Users can clean up test/error imports | Medium | Soft-delete batch endpoint | Requires batch deletion use case (not implemented) |
| **Export batch to Excel** | Allows users to extract processed data | High | Server-side Excel generation | Future milestone: useful for data verification |
| **Batch comparison** | "Compare this batch to previous import" | Very High | Diff algorithm, UI design | Advanced feature, significant engineering effort |

### Data Table

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Column sorting** | Users can reorder data by any column | High | Server-side sorting API + UI state | Requires dynamic ORDER BY in repository |
| **Column filtering** | Users can narrow visible rows by column value | High | Server-side filtering API + UI state | Requires dynamic WHERE clauses |
| **Row selection** | Enables bulk actions (future: bulk delete, export selected) | Medium | Checkbox column + selection state | Foundation for future bulk operations |
| **Virtual scrolling** | Smooth performance for huge datasets | Very High | @tanstack/react-virtual, complex state | Alternative to pagination for power users |
| **Copy cell value** | Quick copy for pasting into forms | Low | Clipboard API, click handler | Small UX improvement, high ROI |
| **Column visibility toggle** | Users can hide irrelevant columns | Medium | TanStack Table visibility API | Useful for wide tables (profile mode with many cell addresses) |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead | Confidence |
|--------------|-----------|-------------------|------------|
| **Inline editing in data table** | Data is immutable (sourced from Excel); editing creates inconsistency | Show read-only table; if editing needed, re-upload corrected file | HIGH |
| **Drag-and-drop row reordering** | sourceRowIndex reflects Excel order; manual reordering breaks traceability | Keep rows in Excel order; explain sourceRowIndex semantics | HIGH |
| **Auto-save during upload** | Batch operations are atomic (all-or-nothing); partial saves break this guarantee | Complete upload before database write; show progress only | HIGH |
| **Infinite scroll for batches** | Batch history is finite, bounded; infinite scroll is performance theater | Use standard pagination if/when needed; card grid sufficient for MVP | MEDIUM |
| **Complex column mapping UI** | Column mapping happens in browser extension (next milestone), not dashboard | Dashboard shows raw data as-imported; mapping comes later | HIGH |
| **Real-time upload progress streaming** | Files are small (<5MB), uploads complete in seconds; WebSocket overhead not justified | Simple determinate progress bar with client-side polling | HIGH |
| **Batch merging UI** | Batches represent distinct imports with different timestamps; merging loses traceability | Keep batches separate; if consolidation needed, create new batch | MEDIUM |
| **Row-level error display** | MVP batch operations are atomic (entire batch succeeds or fails); partial success not implemented | Show batch-level errors only; defer row-level error handling | HIGH |
| **Custom CSV export format** | Users uploaded Excel, they expect Excel back (if export added) | Export as .xlsx using SheetJS, matching input format | MEDIUM |

---

## Feature Dependencies

Understanding how features build on each other:

```
Foundation Layer (Must Build First):
├─ Upload Modal Component
│  ├─ Mode Selector (List vs Profile)
│  └─ File Input (drag-and-drop + manual)
├─ Batch Grid Component
│  ├─ Batch Card Component
│  ├─ Batch Empty State Component
│  └─ Batch Loading Skeletons
└─ Data Table Component (shadcn/ui + TanStack Table)
   ├─ Dynamic Column Generation
   ├─ Pagination Controls
   └─ Loading Skeletons

Enhancement Layer (Build After Foundation):
├─ Progress Indicator (depends on Upload Modal)
├─ Upload Cancellation (depends on Progress Indicator)
├─ File Validation UI (depends on File Input)
├─ Batch Search (depends on Batch Grid)
└─ Column Visibility Toggle (depends on Data Table)

Advanced Layer (Deferred):
├─ Column Sorting (requires server-side API changes)
├─ Column Filtering (requires server-side API changes)
└─ Row Selection (foundation for future bulk actions)
```

**Critical Path for MVP:**
1. Upload Modal with mode selection and file input
2. Batch Grid with cards and empty state
3. Data Table with pagination and dynamic columns

**Optional Enhancements (Nice-to-Have):**
- Progress indicator during upload
- File validation feedback before submit
- Batch search/filter (client-side)

**Explicitly Deferred:**
- Column sorting/filtering (requires API changes)
- Batch deletion (requires new use case)
- Export to Excel (separate milestone)

---

## MVP Recommendation

For MVP (v2.2), prioritize **core workflows** over polish:

### Must Have (P0)
1. **Upload Modal**
   - Mode selector (visual cards: "List Mode" vs "Profile Mode")
   - File input with drag-and-drop + manual selection
   - File validation (size, count, mode rules) with error display
   - Submit button triggers upload mutation
2. **Batch Grid**
   - Card layout showing batch metadata (date, mode, row count)
   - Click card → navigate to data table
   - Empty state with "Upload First Batch" CTA
   - Loading skeletons (6 cards, mimic ProjectGrid pattern)
3. **Data Table**
   - Dynamic columns from batch.columnMetadata
   - Server-side pagination (limit=50, offset controls)
   - "Showing X-Y of Z rows" label
   - Loading skeletons during fetch

### Should Have (P1)
4. **Upload Progress**
   - Determinate progress bar during upload
   - Disable modal close during upload
   - Success message → close modal → refresh batch list
5. **File List Display**
   - Show selected files with name + size
   - Remove file button (before upload)
   - Visual distinction for invalid files

### Could Have (P2)
6. **Batch Search** (client-side filtering on batch name/date)
7. **Column Visibility Toggle** (hide/show columns in data table)
8. **Copy Cell Value** (click to copy cell content)

### Won't Have (Deferred)
- Inline editing in data table
- Column sorting/filtering (requires API work)
- Batch deletion
- Export to Excel
- Real-time upload progress streaming

---

## Implementation Notes

### Upload Flow
```
User clicks "New Import" → Modal opens
User selects mode → Mode state updates
User drops files → File validation runs
  ├─ Valid: Show file list with green checkmarks
  └─ Invalid: Show error messages, disable submit
User clicks "Upload" → Progress bar appears
Upload completes → Modal closes, batch grid refetches
```

### Batch Grid Flow
```
Page loads → React Query fetches batches → Loading skeletons
Data arrives → Render batch cards (newest first)
Empty state: No batches → Show empty state component
User clicks batch card → Navigate to /projects/:pid/batches/:bid
```

### Data Table Flow
```
Page loads → React Query fetches rows (limit=50, offset=0)
Columns generated from batch.columnMetadata → Render table
User clicks "Next Page" → offset += 50, refetch
Loading → Show skeleton rows (preserve table structure)
```

### React Query Integration
- **Queries**: `useProject`, `useBatches`, `useBatch`, `useBatchRows`
- **Mutations**: `useUploadBatch`
- **Cache invalidation**: After upload, invalidate `useBatches` query for project
- **Pagination**: Use `keepPreviousData: true` for smooth page transitions

### shadcn/ui Components to Use
- **Dialog** (upload modal)
- **Card** (batch cards)
- **Table** + **TanStack Table** (data table)
- **Button** (primary actions)
- **Skeleton** (loading states)
- **Badge** (mode display: "List Mode", "Profile Mode")
- **Input** (file input hidden, styled drop zone)

---

## Validation Against Existing Patterns

Populatte already has strong patterns established in ProjectGrid (v1.0):

| Pattern | Existing Implementation | Apply to Batches |
|---------|------------------------|------------------|
| **Card-based grid layout** | `ProjectCard` with name, description, badges | `BatchCard` with date, mode, row count |
| **Empty state component** | `ProjectEmptyState` with CTA | `BatchEmptyState` with upload CTA |
| **Loading skeletons** | `ProjectCardSkeleton` (6 cards) | `BatchCardSkeleton` (match layout) |
| **Form dialog pattern** | `ProjectFormDialog` with Zod validation | `UploadBatchDialog` with file input |
| **React Query mutations** | `useCreateProject`, `useUpdateProject` | `useUploadBatch` |
| **Optimistic updates** | Not used (immediate refetch) | Not needed (upload is slow, show progress) |

**Key differences:**
- Batches are read-only (no edit dialog needed)
- Batches have binary file upload (not just form fields)
- Batches require progress indication (file upload takes time)

---

## Research Sources

This research synthesized patterns from multiple authoritative sources:

### File Upload UX
- [UX best practices for designing a file uploader | Uploadcare](https://uploadcare.com/blog/file-uploader-ux-best-practices/)
- [Drag-and-Drop UX: Guidelines and Best Practices — Smart Interface Design Patterns](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [Building a Modern Drag-and-Drop Upload UI in 2025](https://blog.filestack.com/building-modern-drag-and-drop-upload-ui/)
- [Design and Implementation of CSV/Excel Upload for SaaS | Kalzumeus Software](https://www.kalzumeus.com/2015/01/28/design-and-implementation-of-csvexcel-upload-for-saas/)

### Data Tables & Pagination
- [Data Table Design UX Patterns & Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [REST API Design: Filtering, Sorting, and Pagination | Moesif Blog](https://www.moesif.com/blog/technical/api-design/REST-API-Design-Filtering-Sorting-and-Pagination/)
- [Data Table - shadcn/ui](https://ui.shadcn.com/docs/components/data-table)
- [Pagination and infinite scroll with React Query v3 - LogRocket Blog](https://blog.logrocket.com/pagination-infinite-scroll-react-query-v3/)

### Loading States & Progress
- [UX Design Patterns for Loading - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback)
- [Loading & progress indicators — UI Components series | UX Collective](https://uxdesign.cc/loading-progress-indicators-ui-components-series-f4b1fc35339a)

### Empty States
- [Empty State UX Examples & Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/empty-states)
- [Designing Empty States in Complex Applications: 3 Guidelines - NN/G](https://www.nngroup.com/articles/empty-state-interface-design/)

### Enterprise Dashboard Patterns
- [Enterprise UI Guide for 2026: Principles & Best Practices](https://www.superblocks.com/blog/enterprise-ui)
- [Dashboard Design UX Patterns Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)

### Technical Implementation
- [Infinite Queries | TanStack Query React Docs](https://tanstack.com/query/v4/docs/react/guides/infinite-queries)
- [Building Interactive Data Tables with shadcn UI and TanStack Table | Medium](https://medium.com/@enayetflweb/building-interactive-data-tables-with-shadcn-ui-and-tanstack-table-f2154c2f3b85)

**Confidence levels:**
- **HIGH**: Features validated by official documentation (shadcn/ui, TanStack Query) and multiple authoritative sources
- **MEDIUM**: Features validated by community best practices and design system guidelines
- **LOW**: Features mentioned in single sources or based on inference from similar patterns

All patterns researched are current as of 2026 and align with modern React, Next.js 16, and TanStack Query v5 conventions used in the Populatte codebase.
