# Phase 20: Frontend View Values Side Sheet - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Non-modal side sheet for exploring all distinct values of a specific field. User clicks a field card (from Phase 19) to open the sheet, can search/filter values, and copy individual values to clipboard. Values are fetched on demand from the Phase 18 endpoint.

</domain>

<decisions>
## Implementation Decisions

### Sheet presentation
- Overlay from right with dimmed backdrop — page content stays in place
- Header shows field name + type badge + summary stats (presence count, unique count)
- Close via X button, backdrop click, or Escape key — all three dismiss methods
- Clicking a different field card swaps sheet content in place (no close/reopen animation)

### Value list display
- Each row shows the value text and occurrence count (e.g., "Sao Paulo — 42")
- Long values truncated to one line with ellipsis, full value on hover tooltip
- Infinite scroll within the sheet — load first page, fetch more as user scrolls
- Empty state: "No values found — all records have empty values for this field" with subtle icon

### Search & filter behavior
- Search input sits below the header, sticky as user scrolls the value list
- Backend search — each debounced query hits the API with search param for accuracy across all values
- No results: "No matches for [query]" with a prominent "Clear search" button
- Result count displayed below search: "Showing X of Y values"

### Copy interaction
- Clipboard icon appears on the right side of each row on hover
- Feedback: icon briefly changes to a checkmark inline (no separate toast notification)
- Individual copy only — no bulk copy option
- Copies value text only, not the occurrence count

### Claude's Discretion
- Sheet width and animation timing
- Exact debounce delay for search
- Loading skeleton/spinner design while values fetch
- Infinite scroll page size and threshold
- Typography and spacing within the sheet

</decisions>

<specifics>
## Specific Ideas

- Sheet should feel like a detail panel, not a full modal — the user is exploring, not committing to an action
- Swap-in-place behavior when clicking different field cards keeps the exploration flow fast
- Inline checkmark feedback (icon swap) is lighter weight than a toast — keeps attention on the data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-view-values-side-sheet*
*Context gathered: 2026-02-02*
