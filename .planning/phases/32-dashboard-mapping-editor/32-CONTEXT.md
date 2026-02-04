# Phase 32: Dashboard Mapping Editor - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can edit mapping details and manage steps with full CRUD operations from the dashboard. This includes editing mapping properties (name, URL, active status, success trigger), viewing steps list, reordering steps via drag-and-drop, and adding/editing/deleting steps through a modal.

</domain>

<decisions>
## Implementation Decisions

### Page Layout
- Single page layout with fixed properties section at top
- Steps list scrolls independently with max height (handles 5 or 50 steps)
- Sticky header with back arrow, mapping name as title, and Save button
- Explicit save required (not auto-save) with unsaved changes warning on leave
- Skeleton loader while fetching mapping data

### Properties Section
- Always-editable form fields (no view/edit mode toggle)
- Grouped into collapsible cards:
  - "Basic Info" card: name, URL
  - "Behavior" card: active toggle, success trigger
- All cards expanded by default
- Active status uses toggle switch
- URL field with hint text: "A extensao ativara em qualquer URL que comece com este endereco." (prefix match)
- Success trigger field with helper text explaining the selector purpose
- Inline validation errors with red border and message below field

### Steps Section
- Header shows "Steps (N)" count badge with Add Step button
- Each step displayed as a card with:
  - Colored left border stripe by action type (different color per action)
  - Drag handle on left edge
  - Step number (auto-renumbers on reorder)
  - Action type icon
  - Selector in monospace code style, truncated with ellipsis
  - Source column name
  - Edit and delete icons always visible
- Simple "No steps configured" message with Add Step button for empty state
- No search/filter - scroll only

### Step Editor Modal
- Three action types: Fill, Click, Wait
  - Fill adapts to element type at execution time (text, select, checkbox, radio)
- Searchable combobox for source column selection
- Toggle between "From column" and "Fixed value" with text input
- Option checkboxes: optional (skip if not found), clearBefore (clear before fill), pressEnter (Enter after fill)

### Drag-and-Drop
- Card lifts with shadow during drag
- Placeholder shows original position
- Auto-scroll when dragging near top/bottom edges
- Touch support with long-press to initiate
- Reorder is part of unsaved changes (requires Save)
- Step numbers update immediately on drag
- No keyboard reordering
- No undo - user drags again to adjust
- No tooltip on drag handle

### Delete Behavior
- No mapping delete on this page - delete only from mappings list
- No clone/duplicate feature

### Claude's Discretion
- Exact card styling and spacing
- Drag animation timing
- Collapsible card animation
- Color palette for action type borders
- Modal size and padding
- Exact max-height for steps scroll area

</decisions>

<specifics>
## Specific Ideas

- Action type color indicator as a small bar/stripe on left edge of step cards ("como se fosse bem no cantinho")
- Prefix-match URL behavior already defined in milestone 3 - extension checks currentUrl.startsWith(targetUrl)

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 32-dashboard-mapping-editor*
*Context gathered: 2026-02-04*
