# Research Summary: Dashboard Upload & Listing UI

**Project:** Populatte v2.2
**Domain:** B2B SaaS File Upload & Data Management Interface
**Researched:** 2026-01-30
**Overall confidence:** HIGH

## Executive Summary

This research investigated UI patterns for three interconnected features in the Populatte dashboard: **file upload interfaces**, **batch listing dashboards**, and **data table views**. The goal was to understand what B2B SaaS users expect from these interfaces and identify table stakes, differentiators, and anti-features.

**Key discoveries:**
1. **File upload UIs are highly standardized** in 2026 — users expect drag-and-drop with manual fallback, progress indicators, and clear error feedback. Accessibility requires supporting non-drag interactions.

2. **Batch listing follows card-grid patterns** established in Populatte's ProjectGrid — newest-first sorting, skeleton loading, empty states with CTAs, and click-to-detail navigation are table stakes.

3. **Data tables require server-side pagination** for scalability, deterministic sorting for consistency, and dynamic column generation from batch metadata. Populatte's API already provides the necessary pagination primitives.

4. **Anti-features are critical** — inline editing, row reordering, and real-time progress streaming would violate Populatte's architectural constraints (immutable data, atomic batch operations, small file sizes).

The research drew heavily from **shadcn/ui documentation** (Populatte's UI library), **TanStack Query patterns** (Populatte's data fetching solution), and **enterprise SaaS design systems** (Carbon, Cloudscape, PatternFly). Confidence is HIGH because findings align with established patterns in Populatte's existing codebase (ProjectGrid, ProjectFormDialog) and official library documentation.

## Key Findings

**Upload Interface:** Drag-and-drop + manual selection, mode selector (List vs Profile), file validation with inline errors, determinate progress bar, and upload cancellation are table stakes. Smart mode suggestion ("You selected 1 file, List Mode recommended") is a differentiator.

**Batch Dashboard:** Card grid showing date/mode/row count, newest-first sorting, empty state with "Upload First Batch" CTA, skeleton loading (6 cards), and click-to-navigate pattern. Client-side search/filter is a nice-to-have differentiator. Batch deletion requires new API endpoint (deferred).

**Data Table:** Dynamic columns from `batch.columnMetadata`, server-side pagination (limit/offset), "Showing X-Y of Z rows" label, skeleton rows during loading. Column sorting/filtering are differentiators but require API changes (deferred to future milestone). Virtual scrolling is unnecessary (pagination sufficient).

**Critical Anti-Features:** Do NOT build inline editing (data is immutable), drag-and-drop row reordering (breaks traceability), auto-save during upload (violates atomicity), or real-time WebSocket progress (files are small, overkill).

## Implications for Roadmap

Based on research, the v2.2 milestone should be structured around **three sequential UI components**, each with clear dependencies:

### Phase 1: Upload Modal Foundation
**Goal:** Enable users to select files and trigger batch creation
**Rationale:** Upload is the entry point; must be built first for user testing
**Deliverables:**
- Upload modal component (Dialog wrapper)
- Mode selector UI (List vs Profile visual cards)
- File input with drag-and-drop + manual selection
- File validation logic (size, count, mode rules)
- Basic error display (validation failures)

**Why this order:** Mode selection must happen before file selection (determines validation rules). File input needs validation to prevent invalid uploads.

**Avoids pitfall:** Building file input without validation leads to confusing backend errors.

### Phase 2: Batch Grid & Navigation
**Goal:** Display batch history and enable navigation to data view
**Rationale:** Users need to see results of upload before viewing row details
**Deliverables:**
- Batch grid component (card layout)
- Batch card component (date, mode, row count display)
- Batch empty state component
- Batch loading skeletons (6 cards)
- Navigation to batch detail page

**Why this order:** Grid comes after upload because users see it post-upload. Must be functional before data table (provides navigation context).

**Avoids pitfall:** Building data table before batch grid breaks user flow (no way to navigate to table).

### Phase 3: Data Table with Pagination
**Goal:** Display batch rows with server-side pagination
**Rationale:** Final piece of workflow; requires batch selection from Phase 2
**Deliverables:**
- Data table component (shadcn/ui Table + TanStack Table)
- Dynamic column generation from `batch.columnMetadata`
- Pagination controls (Previous/Next, page indicator)
- Row count display ("Showing X-Y of Z rows")
- Loading skeletons (preserve table structure)

**Why this order:** Table is the deepest detail view; requires batch context from Phase 2. Pagination depends on dynamic columns being functional.

**Avoids pitfall:** Building table before pagination leads to poor performance with large batches.

### Optional Enhancements (P1 — Build if Time Permits)
- Upload progress indicator (determinate progress bar)
- File list display with remove button
- Success toast after upload completes
- Batch search (client-side filtering)

**Why optional:** Core workflow works without these; they improve UX but aren't blockers.

### Deferred to Future Milestones (P2)
- Column sorting/filtering (requires API changes)
- Batch deletion (requires new use case)
- Export to Excel (separate feature)
- Row selection (foundation for bulk actions)

**Why deferred:** Require backend work or are complex features outside v2.2 scope.

---

## Phase Ordering Rationale

**Sequential dependencies:**
```
Upload Modal → Batch Grid → Data Table
     ↓              ↓             ↓
  Creates       Displays      Shows
   Batch        Batches        Rows
```

1. **Upload Modal first** because it's the only way to create batches. Users can't see batch grid without data.
2. **Batch Grid second** because it provides navigation to data table. Also validates upload flow works end-to-end.
3. **Data Table last** because it's the deepest detail view and depends on batch selection.

**Why NOT parallel development:**
- Upload Modal and Batch Grid *could* be built in parallel (no direct dependency)
- BUT they share React Query cache invalidation patterns (upload mutation must invalidate batch list query)
- Building sequentially allows testing integration points incrementally

**Why NOT batch-first:**
- Starting with Batch Grid would require mocking batch data or manual database seeding
- Upload Modal provides natural way to generate test data for grid development

**Integration points:**
- Upload Modal → Batch Grid: `useUploadBatch` mutation invalidates `useBatches` query
- Batch Grid → Data Table: Click handler navigates to `/projects/:pid/batches/:bid` with batch ID
- Data Table → API: `useBatchRows` query with pagination state (limit, offset)

---

## Research Flags for Phases

### Phase 1: Upload Modal — Standard Patterns, Low Risk
**Confidence:** HIGH
**Research needs:** NONE (patterns well-established)
**Why low risk:** shadcn/ui Dialog component handles modal behavior. HTML file input handles drag-and-drop with basic event handlers. File validation is client-side logic matching backend constraints (already documented).

### Phase 2: Batch Grid — Mirrors ProjectGrid, Low Risk
**Confidence:** HIGH
**Research needs:** NONE (copy existing ProjectGrid pattern)
**Why low risk:** Populatte already implements card grid, empty state, and skeleton loading for projects. Batch grid is nearly identical (different data shape, same UI patterns).

### Phase 3: Data Table — Requires Documentation Review, Medium Risk
**Confidence:** MEDIUM (upgraded to HIGH after research)
**Research needs:** COMPLETED (shadcn/ui Data Table guide + TanStack Table docs)
**Why medium risk initially:** Dynamic column generation from JSONB data is new territory for Populatte. Server-side pagination requires careful state management.
**Why HIGH confidence now:** Research found shadcn/ui provides complete guide for building data tables with TanStack Table. Pattern matches Populatte's tech stack (React, Next.js, TypeScript). Pagination state is simple (limit/offset in query params).

### Optional Enhancements — Standard Patterns, Low Risk
**Confidence:** HIGH for progress indicator, MEDIUM for file list
**Research needs:** NONE for progress indicator (determinate progress bar is standard HTML/CSS)
**Research needs:** MINIMAL for file list (iterate over FileList array, render with remove button)

### Deferred Features — Would Require Deep Research
**Confidence:** LOW (not investigated in depth)
**Research needs:** HIGH for column sorting/filtering (requires API design), HIGH for batch deletion (requires soft-delete patterns), HIGH for export (requires server-side Excel generation)

---

## Confidence Assessment

| Area | Confidence | Notes | Sources |
|------|------------|-------|---------|
| Upload UI patterns | HIGH | Validated by multiple authoritative sources + existing ProjectFormDialog pattern | Uploadcare, Smart Interface Design, shadcn/ui Dialog docs |
| Batch grid patterns | HIGH | Direct copy of existing ProjectGrid pattern | Populatte codebase (ProjectGrid.tsx, ProjectCard.tsx) |
| Data table patterns | HIGH | Official shadcn/ui guide + TanStack Table docs | shadcn/ui Data Table docs, TanStack Query v4/v5 docs |
| Pagination patterns | HIGH | API already implements limit/offset, standard REST pagination | Populatte API (BatchController, RowsController) + REST best practices |
| Loading states | HIGH | Existing skeleton pattern in ProjectGrid | Populatte codebase + Pencil & Paper UX patterns |
| Empty states | HIGH | Existing empty state in ProjectEmptyState | Populatte codebase + NN/G guidelines |
| Progress indicators | HIGH | Standard HTML/CSS determinate progress bar | UX Collective, Pencil & Paper loading patterns |
| Anti-features | HIGH | Validated against Populatte's architecture constraints | PROJECT.md (atomic transactions, immutable data) |

**Why overall confidence is HIGH:**
- Core patterns already exist in Populatte codebase (ProjectGrid, ProjectFormDialog)
- Technical stack (shadcn/ui, TanStack Query) has official documentation for all required patterns
- API already provides necessary endpoints (batch list, batch detail, row list with pagination)
- Multiple authoritative sources agree on best practices (NN/G, design systems, UI libraries)

**Remaining uncertainties:**
- Dynamic column generation from JSONB is new (but TanStack Table supports dynamic columns)
- File upload progress tracking details (but standard HTML `<progress>` element is sufficient)

---

## Gaps to Address

### Minor Gaps (Addressed in This Research)
1. ✅ **Data table pagination patterns** — Resolved: shadcn/ui + TanStack Table docs provide complete guide
2. ✅ **File upload progress indicators** — Resolved: Determinate progress bar with `<progress>` element is standard
3. ✅ **Empty state best practices** — Resolved: NN/G guidelines + existing ProjectEmptyState pattern

### Open Questions (Require Phase-Specific Decisions)
1. **Batch card layout details** — How to display mode (badge vs icon vs text)? Date format (relative vs absolute)? Row count prominence?
   - **Resolution:** Design review during Phase 2; defer to existing ProjectCard visual patterns
2. **Data table column widths** — Fixed width vs auto vs user-resizable?
   - **Resolution:** Start with auto-width, add user resize if needed (TanStack Table supports column resizing)
3. **Pagination control placement** — Top, bottom, or both?
   - **Resolution:** Bottom only (standard pattern); add top if user feedback indicates need

### Deferred Research (Out of v2.2 Scope)
1. **Column sorting API design** — Requires backend research for dynamic ORDER BY clauses
2. **Batch soft-delete patterns** — Requires use case design + consistency with existing project deletion
3. **Server-side Excel export** — Requires SheetJS server-side usage patterns + streaming large files

---

## Actionable Recommendations

### For Phase 1: Upload Modal
1. Use **shadcn/ui Dialog** component (already in project)
2. Create **mode selector as two visual cards** (not dropdown) for clarity
3. Implement **drag-and-drop with `onDragOver`, `onDragLeave`, `onDrop` handlers**
4. Show **visual feedback on drag** (border color change, background overlay)
5. Validate **files client-side before upload** (size, count, mode rules)
6. Display **inline error messages** below file input (not toast/alert)
7. Use **Zod schema for validation** (consistent with existing patterns)

### For Phase 2: Batch Grid
1. Copy **ProjectGrid layout** (responsive grid: 1 col mobile, 2 tablet, 3 desktop)
2. Copy **ProjectCardSkeleton pattern** (6 skeletons during loading)
3. Copy **ProjectEmptyState pattern** (illustration + text + CTA button)
4. Use **Card component** with header (date), content (mode badge + row count)
5. Add **click handler for entire card** (not just button) for better UX
6. Sort **newest-first** (API already does this)
7. Use **React Query `useBatches` hook** with cache invalidation after upload

### For Phase 3: Data Table
1. Follow **shadcn/ui Data Table guide** exactly (well-documented pattern)
2. Use **TanStack Table's `getCoreRowModel` + `getPaginationRowModel`**
3. Generate **columns dynamically** from `batch.columnMetadata` array
4. Implement **server-side pagination** with limit=50, offset state in URL query params
5. Use **`keepPreviousData: true`** in React Query for smooth page transitions
6. Show **skeleton rows during loading** (10 rows × N columns)
7. Display **"Showing X-Y of Z rows"** label (calculate from offset + limit + total)

### For Optional Enhancements
1. **Progress indicator:** Use `<progress>` element with `value` attribute updated during upload
2. **File list display:** Map over FileList array, show filename + size (format bytes to KB/MB)
3. **Success toast:** Use existing Sonner toast (already in project) after upload completes
4. **Batch search:** Filter batches client-side by date or auto-generated name (no API needed)

---

## Success Criteria

v2.2 milestone is complete when:

- [ ] User can upload Excel file via drag-and-drop or manual selection
- [ ] User can select List Mode or Profile Mode before upload
- [ ] User sees validation errors if file is invalid (size, count, mode rules)
- [ ] User sees batch appear in grid immediately after upload completes
- [ ] User can click batch card to navigate to data table
- [ ] User sees batch rows in paginated table with correct columns
- [ ] User can navigate between pages of data
- [ ] Empty states appear when no batches exist or batch has no rows
- [ ] Loading skeletons appear during data fetches
- [ ] All patterns are consistent with existing ProjectGrid patterns

**Quality indicators:**
- Zero backend API changes needed (all endpoints already exist)
- Reuses existing patterns (ProjectGrid, ProjectFormDialog, ProjectEmptyState)
- Uses standard shadcn/ui components (Dialog, Card, Table, Button, Skeleton)
- Follows TanStack Query best practices (cache invalidation, keepPreviousData)
- Matches accessibility standards (keyboard navigation, ARIA labels, screen reader support)

---

## Conclusion

This research provides **high-confidence, actionable guidance** for implementing v2.2 Dashboard Upload & Listing UI. The three-phase structure (Upload Modal → Batch Grid → Data Table) follows natural user flow and technical dependencies. All required patterns exist in either Populatte's codebase or official documentation for shadcn/ui and TanStack Query.

**Critical insight:** Populatte's existing ProjectGrid implementation is a blueprint for BatchGrid. Developers can copy-paste-adapt ProjectCard → BatchCard, ProjectEmptyState → BatchEmptyState, and ProjectGrid layout. This dramatically reduces implementation risk and ensures UI consistency.

**Risk mitigation:** By deferring column sorting/filtering and batch deletion to future milestones, v2.2 stays focused on core workflow (upload → list → view) without backend API changes or complex state management. Optional enhancements (progress indicator, file list display) can be added incrementally without blocking milestone completion.

**Ready for roadmap creation.** Proceed to defining phase plans with task breakdowns.
