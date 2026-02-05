# Phase 33: Extension Capture Mode - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create mappings visually by clicking form fields in the browser extension. Enter capture mode, click elements to capture selectors with visual feedback, configure each step (action, source, options), reorder/delete steps, and save the mapping to API. Editing existing mappings in the dashboard is Phase 32 (done); identifier display is Phase 34.

</domain>

<decisions>
## Implementation Decisions

### Element Highlighting
- Outline + tooltip on hover (like browser DevTools but with label)
- High-contrast blue color scheme for visibility
- Tooltip shows element type + name/id hint (e.g., "Input: email")
- Captured elements show numbered badge (step number) at top-right corner
- Badges persist while in capture mode and follow elements on scroll/resize
- Quick fade animation (150ms) on hover
- Brief pulse/flash animation when element captured
- Clicking already-captured element shows prompt: "Este elemento já foi capturado (Step X). Deseja editar ou adicionar novo step?" with [Editar] and [+ Novo Step] buttons
- Main frame only — no iframe support in this phase
- All clickable elements highlightable (inputs, selects, buttons, links)
- Password fields show warning but allow capture
- Clicks outside interactive elements do nothing
- Basic keyboard shortcuts: Escape to cancel, Enter to confirm

### Step Configuration UX
- Config panel appears immediately in sidebar, replaces step list view
- Action type auto-detected from element with manual override
- Three actions: fill, click, wait (fill handles selects and checkboxes smartly)
- Config fields: action radio, source (column dropdown or fixed value toggle), 3 checkboxes (optional, clearBefore, pressEnter)
- Searchable dropdown for source columns
- Separate toggle between "Column" and "Fixed Value" modes
- Selector shown as read-only (not editable)
- "Highlight Target" button scrolls element into view and highlights it
- Explicit confirm button: "Add Step" for new, "Save Changes" for edit
- Cancel button to discard changes (no click-away behavior)
- Validation on submit only, not inline
- Wait action: duration only (no wait-for-element condition)
- Wait presets: quick buttons (500ms, 1s, 2s) plus custom input
- Smart fill for checkboxes: truthy values check, falsy values uncheck

### Capture List Management
- Numbered list display (not cards or table)
- Each step shows: action type, source column/fixed, truncated selector
- Drag-and-drop reordering with drop zone indicator
- Delete via trash icon button, instant delete (no confirmation)
- Edit via pencil icon button (single-click on row highlights element, doesn't edit)
- Clicking step in list highlights + scrolls element into view
- "Add Wait" button to add manual wait step at end
- Step count badge visible in header ("5 steps")
- Empty state shows instruction text: "Click elements on the page to capture steps"
- Warning indicator if element no longer found on page

### Entry/Exit Flow
- Enter via "🎯 Criar Mapping" button in popup
- Must select batch first (columns come from batch schema)
- Mapping name input field at top of capture panel
- Single "Save" button to finalize (disabled until name + 1 step)
- Cancel via Cancel button or Escape key; confirm if steps exist
- Post-save: success state with two action buttons — [Editar no Dashboard] and [Começar a Preencher]

### Claude's Discretion
- Exact animation easing curves
- Badge positioning edge cases (overlapping elements)
- Tooltip positioning and collision handling
- Scroll behavior timing
- Error indicator styling

</decisions>

<specifics>
## Specific Ideas

- Prompt text when clicking captured element already defined: "Este elemento já foi capturado (Step X). Deseja editar ou adicionar novo step?"
- Button label: "🎯 Criar Mapping" (Portuguese, with emoji)
- Post-save buttons: "Editar no Dashboard" and "Começar a Preencher"
- Step config fields already defined in spec: action radio (fill/click/wait), source dropdown or fixed value, 3 checkboxes (optional, clearBefore, pressEnter)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 33-extension-capture-mode*
*Context gathered: 2026-02-05*
