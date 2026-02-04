---
phase: 28-content-script
plan: 01
subsystem: extension-content
tags: [content-script, selector, dom, fill-action, xpath, css]
dependency-graph:
  requires: [24-messaging, 24-types]
  provides: [selector-engine, action-executors]
  affects: [28-02-step-executor]
tech-stack:
  added: []
  patterns: [native-property-setters, event-dispatch, polling]
files:
  key-files:
    created:
      - apps/extension/src/content/selector.ts
      - apps/extension/src/content/actions.ts
      - apps/extension/src/content/index.ts
    modified: []
decisions:
  - id: CS-01
    choice: "findElement uses querySelector for CSS and document.evaluate for XPath"
    rationale: "Standard DOM APIs with graceful error handling"
  - id: CS-02
    choice: "waitForElement polls at 100ms intervals with 2000ms default timeout"
    rationale: "Per CONTEXT.md: 1-2 second wait before declaring not found"
  - id: CS-03
    choice: "executeFill uses native property setters (HTMLInputElement.prototype.value)"
    rationale: "Required for React/Vue framework reactivity per research findings"
  - id: CS-04
    choice: "Select matching: value attribute first, then visible text fallback"
    rationale: "Per CONTEXT.md decision for select/dropdown handling"
metrics:
  duration: 1m 40s
  completed: 2026-02-04
---

# Phase 28 Plan 01: Selector Engine and Action Executors Summary

Selector engine finds DOM elements via CSS/XPath with fallback chains; action executors fill/click/wait with native property setters for framework compatibility.

## Execution Log

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create selector engine | 4cddc4b | selector.ts |
| 2 | Create action executors | 29bee8b | actions.ts |
| 3 | Create content module index | eb45d17 | index.ts |

## What Was Built

### Selector Engine (selector.ts)

**findElement function:**
- Accepts primary selector with type ('css' | 'xpath') and value
- Accepts optional fallback array for resilient element finding
- Returns { element, usedSelector, attempts } for debugging
- CSS uses document.querySelector (first match per CONTEXT.md)
- XPath uses document.evaluate with FIRST_ORDERED_NODE_TYPE

**waitForElement function:**
- Polls for element with configurable timeout (default 2000ms)
- Poll interval: 100ms
- Returns same FindResult structure as findElement

### Action Executors (actions.ts)

**executeFill function:**
- Uses native property setters for React/Vue compatibility
- Dispatches 'input' and 'change' events with bubbles: true
- Clears existing content before fill (default behavior)
- Select handling: value attribute first, visible text fallback
- Checkbox/radio: truthy values "yes", "true", "1", "sim"
- File inputs: skipped with manual action flag
- Hidden/disabled: returns error

**executeClick function:**
- Scrolls into view only if outside viewport
- Uses scrollIntoView({ behavior: 'instant', block: 'center' })
- 50ms delay after scroll for stability
- Uses element.click() for the click action

**executeWait function:**
- Simple Promise-based delay
- Returns success after wait completes

### Content Module Index (index.ts)

Re-exports all utilities:
- findElement, waitForElement, SelectorConfig, FindResult
- executeFill, executeClick, executeWait, ActionResult, FillOptions

## Technical Decisions

1. **Native property setters** - Using Object.getOwnPropertyDescriptor to get prototype setters ensures React/Vue controlled components update correctly

2. **Event dispatch** - Both 'input' and 'change' events dispatched for maximum framework compatibility

3. **XPath error handling** - Wrapped in try/catch since invalid XPath throws DOMException

4. **Viewport check** - Using getBoundingClientRect for accurate in-viewport detection

## Deviations from Plan

None - plan executed exactly as written.

## Files Created

```
apps/extension/src/content/
├── index.ts      # Module re-exports (24 lines)
├── selector.ts   # Element finding (180 lines)
└── actions.ts    # Action execution (334 lines)
```

## Verification Results

- TypeScript compilation: PASS
- Module structure: PASS (index.ts, selector.ts, actions.ts)
- Exports verification: PASS (all functions and types exported)
- Extension build: PASS (249.47 kB total)

## Next Plan Readiness

Plan 28-02 (Step Executor) can now:
- Import findElement, waitForElement from content module
- Import executeFill, executeClick, executeWait for step execution
- Use SelectorConfig type for step selector handling
- Use ActionResult type for step result processing
