# Phase 16: Data Table with Pagination - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Display batch row data in a paginated table with dynamically generated columns from Excel metadata. Users can navigate to a batch detail page from the batch grid (Phase 15), see batch metadata, and inspect their ingested data in a table that mirrors the Excel column structure. Editing, filtering, searching, and exporting are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Batch header layout
- Card-style header panel at the top with labeled metadata fields (mode, creation date, total row count)
- Show batch processing status as a colored badge (e.g., green for complete, yellow for processing)
- Breadcrumb navigation: Project Name > Batch identifier — clickable path back to project detail page
- Batch identification approach: Claude's discretion based on available data model fields

### Table column behavior
- Dynamic columns generated from batch columnMetadata, preserving Excel column order
- Row number column shown as the first column (sequential: 1, 2, 3...)
- First column (row numbers) frozen/sticky when scrolling horizontally
- Column widths auto-fit based on content, with horizontal scroll when columns overflow the viewport
- Long cell values truncated with ellipsis, full value shown on hover via tooltip

### Pagination controls
- Default page size: 50 rows
- User can change page size via dropdown (25 / 50 / 100 options)
- Pagination bar at the bottom of the table only
- Page numbers with previous/next arrows — allows jumping to specific pages
- "Showing X-Y of Z rows" text included
- Server-side pagination using limit/offset
- Smooth page transitions: keep previous data visible while next page loads (keepPreviousData)

### Empty & edge states
- Zero-row batch: illustration + message ("No data found in this batch" or similar)
- Loading state: full table skeleton (skeleton header row + multiple skeleton data rows mimicking table structure)
- Few rows: table shrinks to fit — no empty visual space below
- Error state: inline error message inside the table area with a "Try again" retry button

### Claude's Discretion
- Exact batch identifier format in the header (date-based vs number-based)
- Skeleton row count and animation style
- Illustration choice for empty state
- Tooltip implementation for truncated cells
- Exact column min/max width constraints
- Page number display strategy (ellipsis for many pages)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The table should feel like a natural data inspection view for Excel data.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-data-table-pagination*
*Context gathered: 2026-01-30*
