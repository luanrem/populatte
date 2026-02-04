# Phase 31: Dashboard Management - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manage projects, batches, and view mappings from the dashboard. This includes editing project/batch names, deleting projects/batches with confirmation, configuring batch identifiers, and viewing a list of mappings per project. Creating/editing mappings is Phase 32.

</domain>

<decisions>
## Implementation Decisions

### Edit interactions
- Inline editing for project/batch names (click to edit in place)
- Hover pencil icon appears next to name to trigger edit mode
- Save on blur (clicking outside saves current value)
- Escape key cancels editing and reverts to original
- Enter key saves the value
- All text auto-selected when entering edit mode (ready to replace)
- Validation on submit only (not while typing)
- Inline error message on save failure (keep edit mode active, show error below input)
- No explicit success feedback (just exit edit mode smoothly)

### Batch settings panel
- Settings icon (gear) on batch row opens settings
- Modal dialog for settings (centered overlay)
- Two dropdown selects for identifier configuration: Primary identifier, Secondary identifier
- Live preview showing example row with selected identifiers formatted

### Claude's Discretion
- Delete confirmation dialog design
- Mappings list display format (table vs cards, columns shown)
- Empty states for mappings list
- Loading states and skeletons
- Exact modal sizing and layout

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-dashboard-management*
*Context gathered: 2026-02-04*
