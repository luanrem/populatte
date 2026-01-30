# Phase 2: Transaction Support and Excel Parsing Strategies - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

CLS-based atomic transaction infrastructure and two SheetJS-powered Excel parsing strategies (ListMode, ProfileMode) that transform file buffers into normalized ParsedRow arrays. No API endpoint, no frontend -- pure backend infrastructure consumed by the ingestion service in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Data normalization
- Empty cells become `null` in the JSONB data (key present with null value) -- consistent shape across all rows
- String values are stored as-is, no trimming -- preserving exact cell content to avoid losing information
- Dates stored in their original Excel display format (not ISO 8601) -- preserves what the user sees
- Numeric values stored as raw values from SheetJS -- no format mask application
- Native JSON types preserved (numbers as numbers, strings as strings, etc.) -- no universal string conversion
- Formulas resolved to their computed/cached value -- formula strings are not stored
- Header names in ListMode preserved exactly as they appear in the first row -- no normalization

### Error behavior
- Unparseable files fail the entire batch -- all-or-nothing, consistent with atomic transaction philosophy
- Empty sheets (header row but zero data rows) succeed with 0 rows -- technically valid, not treated as an error
- Ragged rows (fewer columns than header) fill missing columns with null -- tolerant of real-world messy spreadsheets
- Error messages are specific -- include file name, error type, and position when applicable to help users fix issues

### ParsedRow shape
- Row index included -- the original spreadsheet row number for traceability back to Excel
- Sheet name included -- which sheet the row came from
- Both `rowIndex` and `sheetName` stored as separate columns on the `rows` table (not inside JSONB data) -- queryable, typed, clean separation from user data
- Cell type map included -- tracks original Excel cell types for smart form filling
- Type map stored on the batch entity (not per-row) -- since column types are shared across rows in a batch
- All 6 SheetJS cell types tracked: string, number, boolean, date, error, empty
- ProfileMode uses the same type map approach with cell-address keys -- consistent across both modes

### Strategy boundaries
- All sheets in a workbook are parsed (not just the first sheet) -- handles workbooks where data spans sheets
- In ListMode, different sheets can have different column headers -- flexible, rows in the same batch may have different key sets
- Sheet name on each row enables differentiation when sheets have different structures

### Claude's Discretion
- Boolean storage format (JSON booleans vs strings) -- pick what works best for form population
- Header row detection in ListMode -- whether to always use row 1 or support configurable header position (MVP simplicity vs flexibility)
- ProfileMode multi-sheet handling -- whether each sheet becomes a separate row or sheets combine into one row with prefixed keys (e.g., "Sheet1!A1")

</decisions>

<specifics>
## Specific Ideas

- "I don't want to lose information" -- the guiding principle for data normalization decisions. Preserve raw values, original formats, exact headers.
- Type map on batch enables the browser extension to make smarter form-filling decisions (e.g., knowing a column contains dates vs numbers).
- All-or-nothing error behavior aligns with the atomic transaction design already in the roadmap.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 02-transaction-excel-parsing*
*Context gathered: 2026-01-29*
