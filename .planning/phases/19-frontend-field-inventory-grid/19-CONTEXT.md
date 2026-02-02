# Phase 19: Frontend Field Inventory Grid - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Card-based field exploration UI with view toggle on the batch detail page. Users can switch between the existing data table view and a new field inventory view showing per-field metadata cards. PROFILE_MODE batches default to field inventory, LIST_MODE defaults to table. The side sheet for viewing field values is Phase 20.

</domain>

<decisions>
## Implementation Decisions

### Card layout & content
- Field name as headline (prominent), stats displayed below in smaller text
- Each card shows: field name, type badge, presence progress bar + percentage, unique value count
- Show 2-3 sample distinct values as muted text at the bottom of each card
- Cards are clickable with hover state (cursor pointer, hover elevation) — wired to side sheet in Phase 20
- Uniform card height across the grid; sample values truncated if needed to maintain alignment

### View toggle behavior
- Toggle placed above the content area in a toolbar row between header and data content
- Icon toggle group style (grid icon for field inventory, table icon for data table) — compact, like Notion's view switcher
- Per-batch default only: PROFILE_MODE opens to field inventory, LIST_MODE opens to table. No persistence of manual switches
- Instant swap when switching views — no animation or transition delay

### Card grid layout
- Auto-fill responsive grid: ~3-4 columns on desktop, 1-2 on mobile
- Cards appear in original column order from the uploaded Excel
- Simple search/filter input above the grid to filter cards by field name as user types
- Uniform card height — clean grid alignment, no masonry

### Visual indicators
- Type badges are color-coded: each inferred type (STRING, NUMBER, DATE, BOOLEAN) gets a distinct color for quick visual scanning
- Presence progress bar shifts color for low presence: amber/red when below threshold (e.g., <50%) to highlight sparse fields
- Unique count highlights when 100% unique (unique count equals row count) — indicates likely ID or key field
- Skeleton loading: grid of 6-8 placeholder cards matching exact card shape with pulsing content areas

### Claude's Discretion
- Exact type badge color assignments
- Presence threshold for color shift
- Skeleton card count and pulsing animation
- Exact spacing, typography, and card border radius
- Search/filter input debounce timing
- Empty state illustration and copy
- How sample values are selected (first N distinct, random, etc.)

</decisions>

<specifics>
## Specific Ideas

- Toggle style inspired by Notion's view switcher — compact icon buttons
- Cards should feel clickable even before Phase 20 wires the side sheet — prepare the interactive affordance
- The search/filter input is for filtering the card grid by field name, not for searching field values (that's Phase 20's side sheet)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-frontend-field-inventory-grid*
*Context gathered: 2026-02-02*
