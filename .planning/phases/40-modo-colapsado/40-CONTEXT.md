# Phase 40: Modo Colapsado - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Internal compact layout within the Side Panel that collapses the full UI into a minimal icon grid for rapid fill-and-advance workflows. Users toggle between expanded (full UI) and compact (icon strip) modes without losing context. This is a view mode toggle, not a panel resize.

</domain>

<decisions>
## Implementation Decisions

### Icon strip layout
- Grid layout with 2-3 icons per row (not a single vertical column)
- Step number shown as small circular overlay badge on top-right corner of each icon (notification-badge style)
- Invalid selector steps show a warning triangle overlay on the opposite corner from the number badge — always visible, not hover-only
- All step icons displayed in the grid; panel scrolls if they overflow (no row limit, consistent with expanded mode's no-max-height approach)

### Toggle & transition
- Toggle button is a small icon button in the Side Panel header bar, next to existing controls
- Transition uses slide/shrink animation (~200ms): content slides or shrinks away as icon grid slides in
- In compact mode: header remains visible (with toggle button), footer hides (fill controls and row navigator) — compact is view-only, expand to fill
- Expanding restores full state: same tab, same scroll position, everything exactly as before collapsing

### Tooltip content & behavior
- Tooltip shows full detail on hover: action type, CSS selector text, and source column name
- Reuse the same CSS group-hover tooltip pattern from Phase 37 (instant, no delay, consistent styling)
- Clicking a step icon in compact mode highlights the element on page (amber outline, auto-dismiss) AND shows a temporary success/fail badge on the icon itself
- Warning triangle for invalid selectors is always visible (not hover-only) — immediate visibility of broken steps

### Claude's Discretion
- Exact grid column count (2 vs 3) based on panel width and icon sizing
- Icon sizing and spacing within the grid cells
- Slide/shrink animation direction and easing curve
- Temporary fill result badge duration and styling
- Toggle button icon choice (e.g., PanelLeftClose, Columns2, etc.)
- How scroll position is preserved (CSS or JS-based approach)

</decisions>

<specifics>
## Specific Ideas

- Compact mode is view-only: users must expand to access fill controls and row navigation
- Click-to-highlight from compact mode provides quick element inspection without expanding
- Fill result badge on icon click gives immediate feedback in compact context
- The transition should feel spatial (slide/shrink), not just a swap

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-modo-colapsado*
*Context gathered: 2026-02-08*
