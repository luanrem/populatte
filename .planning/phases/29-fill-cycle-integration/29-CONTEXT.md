# Phase 29: Fill Cycle Integration - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete fill-to-confirm cycle where user fills form, verifies, and advances to next row. Orchestrates mapping detection, step execution, and success monitoring into working COPILOTO workflow. This phase integrates all components from phases 24-28.

</domain>

<decisions>
## Implementation Decisions

### Mapping Detection
- Green badge on extension icon when on a mapped page
- URL matching uses prefix match: `currentUrl.startsWith(mapping.targetUrl)` (defined in milestone 3)
- Check for mapping matches on tab activation (not continuous polling)
- Mappings are project-scoped, not batch-scoped
- If multiple mappings match current URL within selected project, show list in popup for user to choose
- Badge still shows when no batch is selected (popup prompts to select batch before filling)
- Badge clears immediately when navigating away from mapped URL
- Remember last selected mapping per project (auto-select on return)
- Re-evaluate mapping immediately when user changes project selection
- Only show badge when mapping has at least one step defined (no badge for empty mappings)

### Success Monitoring
- Per milestone 3: `successTrigger` is optional field on mapping
- If `successTrigger` is null: COPILOTO mode — user clicks Next manually after verifying success
- If `successTrigger` is configured: auto-detect via `url_change`, `text_appears`, or `element_disappears`
- MVP supports both modes

### Claude's Discretion
- Fill progress feedback UX (what user sees during step execution)
- Error handling flow (retry, skip, manual override behavior)
- Badge visual implementation details
- Mapping selector UI design when multiple match

</decisions>

<specifics>
## Specific Ideas

- COPILOTO is the primary workflow: user fills, verifies visually, clicks Next
- Extension should feel responsive — badge updates immediately on navigation
- Keep popup simple: the complexity is in orchestration, not in new UI elements

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-fill-cycle-integration*
*Context gathered: 2026-02-04*
