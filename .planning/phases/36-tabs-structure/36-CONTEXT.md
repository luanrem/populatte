# Phase 36: Tabs Structure - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Two-tab architecture (Captura / Preencher) within the Side Panel. Delivers the tab bar UI, state-aware enable/disable for Captura, active capture badge, and tab switching/memory behavior. The actual tab content (fill workflow, capture workflow) is delivered in Phases 37 and 39 respectively.

</domain>

<decisions>
## Implementation Decisions

### Tab bar design
- Shadcn-style tabs (follow shadcn/ui design patterns)
- Icon + text labels for both tabs (small icon before each label)
- Equal width — both tabs split the panel width 50/50
- Positioned below the connection status indicator, above per-tab content
- Instant swap on tab switch — no transition/animation
- Layout hierarchy: Connection status (global) → Tab bar → Per-tab content
- Per-tab header content — each tab can show its own selectors/controls below the tab bar

### Disabled tab behavior
- Captura tab is disabled when capture mode is not active
- Click on disabled tab shows tooltip: "Inicie a captura primeiro"
- Grayed out text (lower opacity / muted color) for disabled state
- Default cursor on hover (not not-allowed) — tooltip communicates the state
- Preencher tab is always accessible, never disabled

### Active badge & status
- Blue pulsing dot when capture mode is active
- Dot positioned to the right of the "Captura" text label
- When capture mode activates, Side Panel auto-switches to Captura tab

### Tab memory & defaults
- Default tab on fresh open: always Preencher
- On reopen: default to Preencher, BUT if capture mode is active, open on Captura
- When capture mode ends (finalize or cancel): stay on Captura tab (user manually switches)
- Tab state is global (not per-browser-tab) — same active tab across all browser tabs

### Claude's Discretion
- Tab separator (border between tab bar and content)
- Exact icon choices for Captura and Preencher tabs
- Pulsing dot animation timing and size
- Disabled tab opacity level

</decisions>

<specifics>
## Specific Ideas

- "Shadcn style" — tabs should follow shadcn/ui patterns and aesthetic, consistent with the web app's design system
- Connection status stays global above tabs; selectors and controls are per-tab content

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-tabs-structure*
*Context gathered: 2026-02-06*
