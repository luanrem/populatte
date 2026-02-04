# Phase 28: Content Script - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Content script that finds DOM elements (CSS/XPath selectors) and executes fill/click/wait actions on any page. Handles framework reactivity (React/Vue) and reports per-step success/failure. Mapping detection and fill cycle orchestration belong to Phase 29.

</domain>

<decisions>
## Implementation Decisions

### Fill behavior
- Always clear existing content before filling text inputs/textareas
- Select/dropdown matching: try value attribute first, then fall back to visible text
- Checkboxes/radios: truthy strings ("yes", "true", "1", "sim") = check, otherwise uncheck
- Framework reactivity: use native property setters + dispatch input/change events
- Small delay (50-100ms) between fields for stability
- Date inputs: raw pass-through (user ensures format matches target field)
- File inputs: mark as manual (flag for user to fill manually)
- Hidden/disabled fields: respect step's optional flag — if optional=true skip silently, if optional=false fail the step

### Step execution
- Strictly sequential execution (one step at a time, in defined order)
- Failure behavior respects step config: optional steps skip on failure, required steps abort remaining
- Element wait: short polling (1-2 seconds) before declaring not found
- Supports wait steps: wait for element to appear, plus fixed time delays
- Click steps scroll element into view only if needed (outside viewport)
- Per-step status reporting (each step reports success/failure with reason)
- Three action types: fill, click, wait
- Multiple element matches: use first match

### Claude's Discretion
- Selector engine implementation details (CSS vs XPath parsing)
- Exact polling interval for element wait
- Specific events to dispatch for framework compatibility
- Error message formatting

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

*Phase: 28-content-script*
*Context gathered: 2026-02-04*
