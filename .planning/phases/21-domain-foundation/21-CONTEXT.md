# Phase 21: Domain Foundation - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Mapping and Step domain models with database persistence and repository abstractions. Defines the Drizzle schemas, entity types, repository interfaces, and Drizzle implementations for both entities. No HTTP endpoints, no use cases, no UI — purely the data layer foundation that Phases 22 and 23 build on.

</domain>

<decisions>
## Implementation Decisions

### SuccessTrigger enum
- Two values: `url_change` and `element_appears`
- `url_change` — extension detects navigation to a different URL after submission
- `element_appears` — extension checks if a CSS selector matches a visible element (selector only, no text matching)
- successTrigger is **nullable** on the mapping — user can create mappings without defining a success trigger
- When null, extension runs steps without checking for success

### Step action types
- Three actions: `fill`, `click`, `wait` (verify dropped — not needed for v3.0)
- `fill` — populates a form field from sourceFieldKey (Excel column) OR fixedValue (hardcoded string), mutually exclusive
- `click` — standard left-click only, no variants (double-click, right-click)
- `wait` — fixed delay only (waitMs), no element-based waiting

### Selector strategy
- Support two selector formats: **CSS** and **XPath**
- Each selector entry is explicitly typed: `{ type: 'css' | 'xpath', value: '...' }` — no auto-detection
- Primary selector on the step + ordered fallbacks array
- Fallbacks tried in order: primary fails → fallback[0] → fallback[1] → etc.
- Maximum **5 fallback selectors** per step

### Soft-delete behavior
- **Mappings**: soft-delete with `deletedAt` timestamp
- **Steps**: hard-delete (permanent removal, no soft-delete)
- When mapping is soft-deleted, steps remain untouched in DB — inaccessible because parent mapping is filtered out
- Soft-deleted mappings are **not restorable** from user perspective (audit/data-preservation only)
- Soft-deleted mappings are **completely invisible** in all API responses — no admin view, no exports
- Repository default query filtering excludes soft-deleted mappings

### Step config options
- `optional` (boolean, default false) — skip step if selector not found
- `clearBefore` (boolean, default false) — clear field before filling
- `pressEnter` (boolean, default false) — press Enter after fill
- `waitMs` (number) — required for `wait` action, ignored for others

### Mapping defaults
- New mappings created with `isActive: true`

### sourceFieldKey validation
- Mapping does NOT validate if fieldKey exists in any batch
- Mapping is a template — batch data binding happens at runtime in the extension
- Extension handles missing field gracefully (skips or warns)

### Step ordering
- Steps have `stepOrder` integer for position
- Deleting a step does NOT auto-recompact order numbers (gaps are allowed)
- Explicit reorder endpoint accepts ordered list of step IDs to reassign positions

### Claude's Discretion
- Exact Drizzle column types and index strategy
- Repository method signatures and return types
- Entity class structure and mapper implementation
- Migration naming and organization

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following established Clean Architecture patterns from v2.x.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-domain-foundation*
*Context gathered: 2026-02-02*
