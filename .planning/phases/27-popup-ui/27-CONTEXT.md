# Phase 27: Popup UI - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Selection interface for choosing project/batch and controlling row-by-row form filling. Users can select project, batch, navigate rows, and control the fill cycle. This phase builds the popup UI that orchestrates the COPILOTO workflow.

</domain>

<decisions>
## Implementation Decisions

### Selection flow
- Empty dropdowns on first open — user must choose project, no auto-selection
- If project has only one batch, auto-select it after project selection
- Persist everything (project, batch, current row position) across popup closes
- Batch dropdown shows "filename - X/Y done" format for progress visibility
- Changing project clears batch selection immediately (no confirmation needed)
- No row data preview in popup — user relies on web app for data details
- Hide completed batches from dropdown (only show batches with pending rows)
- When all batches complete, show empty state message with link to web app

### Fill controls
- Three buttons: Fill, Next, Mark Error
- "Next" button marks current row as VALID and advances to next pending row
- Fill shows step progress indicator ("Filling 3/5 fields...")
- After Fill completes, wait for user to click Next (COPILOTO mode, no auto-advance)
- No keyboard shortcuts for this phase
- Mark Error shows optional text input for error reason
- Fill errors show inline below controls (red text with which step failed)
- Fill button disabled with "No mapping for this site" when no mapping exists

### Claude's Discretion
- Row navigation UI (how to show current position, e.g., "Row 3 of 150")
- Loading states for API calls
- Exact button styling and layout
- Error retry behavior

</decisions>

<specifics>
## Specific Ideas

- COPILOTO mode is deliberate — user verifies each fill before advancing
- Progress format in batch dropdown similar to "clients.xlsx - 12/150 done"
- Step progress during fill helps user understand what's happening

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-popup-ui*
*Context gathered: 2026-02-04*
