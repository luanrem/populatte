# Phase 35: Side Panel Setup - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Chrome extension popup with a persistent Side Panel as the sole extension UI. Includes WXT entrypoint registration, manifest changes, icon-click behavior, per-tab state management, lifecycle detection, and popup removal. Tabs UI, fill workflow, and capture mode are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Opening behavior
- Icon click toggles the Side Panel (standard Chrome toggle behavior)
- No splash/branding screen — jump straight to content on open
- Chrome controls animation and panel position (always right side)
- Use Chrome's default resizable panel width behavior (user can drag to resize, Chrome remembers)

### Tab switching experience
- Per-tab context — each tab has its own independent panel state (project/batch/row)
- Switching to a tab with no prior extension usage shows fresh/default state
- Soft resume when returning to a previously active tab — restore project/batch/row selection but not scroll position or transient UI state

### Panel close & cleanup
- Show confirmation dialog only if there's an active fill or capture session when closing
- Background script keeps API connection alive after panel close — reopening is instant, no re-auth
- Immediate cleanup of all state when a browser tab is closed (tab ID gone = state gone)

### Migration from popup
- Remove popup entirely — clean break, Side Panel is the only UI
- Reuse existing React components — move them into the new Side Panel entrypoint, same code in new container
- Manifest and WXT config changes (side_panel permission, entrypoint registration) are part of this phase

### Claude's Discretion
- Initial panel state before connection (connection prompt vs full skeleton with banner)
- Tab switch transition behavior (instant swap vs brief skeleton)
- Page navigation detection (whether to show context-aware messages when URL changes)
- Message protocol choice (keep chrome.runtime.sendMessage or switch to long-lived ports for persistent panel)

</decisions>

<specifics>
## Specific Ideas

- "All Chrome-controlled" — animation is native, position is always right, no need to customize what Chrome handles
- Skip splash for faster UX — the panel should feel like an instant tool, not an app launch
- Background stays alive to make reopen feel seamless

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-side-panel-setup*
*Context gathered: 2026-02-05*
