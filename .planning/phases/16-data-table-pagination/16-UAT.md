---
status: testing
phase: 16-data-table-pagination
source: 16-01-SUMMARY.md
started: 2026-01-30T21:00:00Z
updated: 2026-01-30T21:00:00Z
---

## Current Test

number: 1
name: Navigate to Batch Detail Page
expected: |
  From the project detail page, clicking on a batch card navigates to /projects/[id]/batches/[batchId]. The page loads showing a header with batch metadata and a data table below.
awaiting: user response

## Tests

### 1. Navigate to Batch Detail Page
expected: From the project detail page, clicking on a batch card navigates to /projects/[id]/batches/[batchId]. The page loads showing a header with batch metadata and a data table below.
result: [pending]

### 2. Breadcrumb Navigation
expected: Top of page shows breadcrumb trail: Projetos > {projectName} > Importacao. Clicking "Projetos" navigates to projects list. Clicking the project name navigates back to project detail.
result: [pending]

### 3. Batch Metadata Header
expected: Card header shows: mode badge (blue for LIST_MODE, purple for PROFILE_MODE), status badge (green/COMPLETED, yellow/PROCESSING, red/FAILED), creation date formatted in Portuguese (pt-BR), and total row count.
result: [pending]

### 4. Dynamic Data Table Columns
expected: Table columns match the Excel file headers in original order. First column shows row numbers. All column headers from the uploaded Excel are visible.
result: [pending]

### 5. Cell Values and Tooltips
expected: Table cells display data values. Long values are truncated. Hovering over any cell shows a tooltip with the full value.
result: [pending]

### 6. Sticky Row Number Column
expected: When scrolling the table horizontally (if columns exceed viewport), the row number column stays fixed on the left side while other columns scroll.
result: [pending]

### 7. Pagination Controls
expected: Below the table: "Mostrando X-Y de Z registros" label, page number buttons with Previous/Next, and ellipsis for large page counts. Previous disabled on first page, Next disabled on last page.
result: [pending]

### 8. Page Size Selector
expected: Dropdown allows choosing between 25, 50, or 100 rows per page. Changing page size resets to the first page and reloads data.
result: [pending]

### 9. Smooth Page Transitions
expected: Clicking a different page number loads new data without a loading flash. Previous page data remains visible (slightly faded) while new data loads.
result: [pending]

### 10. Loading Skeleton
expected: On initial page load (before data arrives), a skeleton placeholder is shown matching the table structure — skeleton rows and headers.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
