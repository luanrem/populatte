# Phase 37: Aba Preencher - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the complete fill workflow (connection status, project/batch selectors, mapping info, row navigation, fill controls) into the Side Panel's Preencher tab. Add a new steps list with element highlighting and invalid selector detection. All content fits within ~320px Side Panel width. Capture mode, recent rows, and compact mode are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Steps list display
- Full detail per row: action icon + step number + selector text + source column name, one line per step, truncated with ellipsis
- No max height — entire panel scrolls if many steps exist (no internal scroll container)
- Show count header above list (e.g. "Passos (8)")
- Distinct icon per action type (fill, click, select, check, etc.) — visually scannable
- Steps are reorderable via drag-and-drop to change execution sequence
- Per-step status indicators after fill execution: check for success, cross for failure
- Steps list is collapsible with chevron toggle
- Collapsed by default on panel open — user expands to see steps

### Element highlighting
- Colored outline (border/outline) around the target element — non-intrusive
- Auto-dismiss after ~3 seconds
- Scroll element to center of viewport (not just nearest edge)
- When selector matches multiple elements, highlight ALL matches
- Multi-match: highlight all, no auto-focus on any
- Single match: highlight AND focus the element (user can immediately type)
- Search and highlight inside accessible iframes, not just top-level document
- If element not found: show toast notification "Elemento nao encontrado na pagina"

### Invalid selector feedback
- Validate on mapping load (badges appear immediately) AND re-validate on step click
- Summary indicator in header area: "3 de 8 passos com problema" plus per-step red dots
- Warning badge is a small red dot/circle — subtle, not alarming
- Hovering the red dot shows tooltip with selector info: "Seletor nao encontrado: #txtCnpj"

### Panel layout adaptation
- Compact grouping: related controls on the same row where possible (e.g. row nav + fill button)
- Fill button ("Preencher") sticky at bottom of panel — always visible
- Connection status as compact badge in header area — colored dot (green=connected, red=disconnected)
- Empty state (no mapping selected): guided prompt "Selecione um projeto e batch para comecar" with visual hint

### Claude's Discretion
- Exact icon choices per action type
- Drag-and-drop implementation approach
- Spacing, typography, and specific color values
- Transition animations for collapse/expand
- Exact toast notification duration and style
- How compact grouping distributes controls across rows

</decisions>

<specifics>
## Specific Ideas

- Steps list collapsed by default gives a cleaner initial view — user expands when they need to inspect individual steps
- Highlight + focus on single match enables immediate interaction with the target field
- Highlighting all matches when multi-match helps users see selector ambiguity
- Iframe support is important because many government forms use embedded iframes
- Red dot + tooltip with selector info gives diagnostic value without cluttering the UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-aba-preencher*
*Context gathered: 2026-02-06*
