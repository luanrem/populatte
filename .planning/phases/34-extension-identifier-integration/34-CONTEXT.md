# Phase 34: Extension Identifier Integration - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Display meaningful row identifiers in the extension popup while users fill forms. Users see the primary/secondary identifier values (configured in batch settings) alongside the row number, helping them confirm they're filling the correct record. No editing, no configuration changes from extension - display only.

</domain>

<decisions>
## Implementation Decisions

### Display layout
- Identifiers appear stacked below the row number (row number on top, identifiers underneath)
- Primary and secondary identifiers both stacked (primary on one line, secondary below)
- Row info area has subtle background to visually group row number + identifiers
- Entire block is clickable - clicking copies the primary identifier value
- Inline feedback when copied (text briefly changes to "Copied" or checkmark appears)
- Row number and identifiers share the same click behavior (unified block)
- Position: within the row navigation area (near prev/next controls)
- Show values only, field labels appear in tooltip on hover

### Truncation & overflow
- Truncate with ellipsis when text exceeds ~250px / 25-30 characters
- Full value shown in tooltip on hover (hover, not click)
- Same truncation limit for both primary and secondary identifiers
- Numbers truncate same as text - no special handling

### Empty/missing values
- When primary identifier field has no value: fall back to row number only
- When batch has no identifier fields configured: show row number without identifier section
- When primary has value but secondary is empty: show primary only (hide secondary line)
- Claude's discretion: whether copy works when showing just row number

### Visual hierarchy
- Identifiers are dominant (primary focus), row number is secondary
- Primary identifier bolder/larger than secondary (regular weight vs lighter/smaller)
- Minimal/no hover effects on the row info block

### Claude's Discretion
- Cursor style indicating clickability (pointer vs copy cursor)
- Copy behavior when only row number is displayed
- Exact sizing and spacing within popup constraints

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches that fit the existing popup layout.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 34-extension-identifier-integration*
*Context gathered: 2026-02-05*
