# Phase 13: API Foundation & Project Detail Page - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the frontend API plumbing (Zod schemas, endpoint factory, React Query hooks, FormData fix) and build the project detail page shell at /projects/[id]. The page hosts batch operations from later phases (upload modal in Phase 14, batch grid in Phase 15). API infrastructure is internal wiring; the page is what users see.

</domain>

<decisions>
## Implementation Decisions

### Project detail page layout
- Page uses the same sidebar layout as the rest of the dashboard (consistent frame)
- Header shows project name as title + metadata subtitle row (creation date, batch count, or status)
- Breadcrumb navigation at the top: "Projetos > [Project Name]"
- Content area is contained with a max-width container (centered, not full-width)

### "Nova Importacao" button
- Positioned above the content area (below header, above batch grid zone) in an action bar
- Primary filled button with an upload/plus icon — high prominence, clearly the main action
- Label: "Nova Importacao" (full label, not shortened)
- Button alignment in the action bar: Claude's discretion

### Empty state (no batches)
- Illustrative approach: Lucide icon (e.g. FileSpreadsheet or Upload) with decorative accents (dashed border, soft background circle) — polished but no custom illustration
- Friendly/casual tone: e.g. "Nenhuma importacao ainda. Que tal comecar agora?"
- CTA does NOT duplicate the upload action — instead, directs user's attention to the "Nova Importacao" button above
- No separate trigger button in the empty state

### Loading states
- Skeleton screen pattern for project detail page while data loads (gray placeholders mirroring final layout)

### Error states
- Project not found (invalid ID / deleted): Custom 404 in-page — "Projeto nao encontrado" with link back to projects list, stays within dashboard frame
- Generic API errors (network failure, server error): Toast notification
- Error toasts auto-dismiss after ~5 seconds

### Claude's Discretion
- "Nova Importacao" button alignment in the action bar (left vs right)
- Exact skeleton layout shapes and animation
- Specific Lucide icon choice for empty state illustration
- Metadata subtitle content (which fields to show)
- Toast component choice and positioning
- All API plumbing decisions (Zod schema structure, hook patterns, endpoint factory design)

</decisions>

<specifics>
## Specific Ideas

- Breadcrumb pattern: "Projetos > [Project Name]" — consistent with dashboard navigation
- Empty state should feel inviting, not clinical — friendly Brazilian Portuguese copy
- The page is a shell that later phases fill in (Phase 14 activates the button, Phase 15 fills the grid)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-api-foundation-project-detail-page*
*Context gathered: 2026-01-30*
