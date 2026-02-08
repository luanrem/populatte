# Phase 38: Secao Recentes - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Recent rows history section within the Preencher tab. Users can see and navigate to recently visited rows with fill status indicators and identifier values. Persistence is per-batch in chrome.storage.local. This phase does NOT add new batch settings or modify the fill workflow itself.

</domain>

<decisions>
## Implementation Decisions

### Visual presentation
- Section positioned below the steps list, scrolls with content (not part of sticky footer)
- "Recentes" section header with small expand link, then 3 compact row items below
- Each row item is single-line: status icon (success/fail/not filled) + row number badge + identifier value text
- Expand/collapse uses smooth accordion animation (~200ms transition) revealing up to 10 rows
- Expand link text toggles between "Ver mais" / "Ver menos" (or similar)

### Navigation behavior
- Clicking a recent row within the same batch: immediate optimistic navigation (update row navigator number instantly, load data in background)
- Clicking a recent row from a different batch: show confirmation before switching
- Scroll position in steps list is NOT reset on navigation — user manages their own scroll
- Currently active row is visually highlighted in the Recentes list (subtle background or border to show "you are here")

### History rules
- Rows are added to history on navigation (every row the user navigates to, not just filled rows)
- Deduplication: if navigating to a row already in history, bump it to the top (no duplicates)
- Max 10 entries per batch stored in chrome.storage.local
- Status icon reflects fill result: green check for success, red X for failed, gray dot if only navigated (not filled)
- Status updates in real-time when a fill is executed on a row already in history

### Identifier display
- Primary identifier comes from batch settings field (already exists in the codebase)
- Fallback when no identifier field configured: use first column value
- Truncation: ellipsis after ~20 characters for long identifier values
- Row number and identifier value on the same line: `[icon] #42  Maria da Silva dos San...`

### Claude's Discretion
- Clear history mechanism (manual button, auto-clear on batch change, or both)
- Row number bold vs identifier muted styling (visual hierarchy choice)
- Whether to show column name in tooltip on hover (e.g., "CNPJ: 12.345.678/0001-90")
- Whether to mask sensitive identifiers (CPF, CNPJ) — likely show full value since this is the user's own data in a local extension

</decisions>

<specifics>
## Specific Ideas

- History should feel lightweight — not a full audit log, just quick navigation shortcuts
- The 3-row collapsed state should be enough for the common "go back to previous row" use case
- Accordion expand to 10 rows covers power users who work through many rows in a session

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-secao-recentes*
*Context gathered: 2026-02-08*
