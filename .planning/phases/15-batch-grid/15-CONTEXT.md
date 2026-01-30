# Phase 15: Batch Grid - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Display batch history as a responsive card grid on the project detail page. Users can see batch metadata (date, mode, row count), navigate to individual batch data tables, and see an empty state when no batches exist. Loading skeletons shown while fetching. Batch creation and data table are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Card content & layout
- Stacked card layout (vertical) — date on top, mode badge, row count below
- Mode displayed as colored pill/badge with distinct color per mode (e.g., blue for List, purple for Profile)
- Creation date shown in relative time format ("2 horas atrás", "ontem", "3 dias atrás")
- Row count shown as number + label (e.g., "142 registros")

### Empty state experience
- Illustration + descriptive text + CTA button
- Illustration uses Lucide icon composition (large FileSpreadsheet or Upload icon with muted colors) — no custom SVG needed
- Text in Portuguese (pt-BR): e.g., "Nenhuma importação ainda. Comece enviando um arquivo Excel."
- CTA button opens the upload modal directly (same behavior as "Nova Importação" header button)

### Grid density & responsiveness
- 3 cards per row on desktop (large screens)
- 1 card per row on mobile (small screens)
- Fixed card height — uniform grid appearance
- Paginated grid — fixed number of cards per page with pagination controls (not infinite scroll or load-all)

### Interaction & navigation
- Hover effect: subtle lift + shadow increase (classic card hover)
- Small right-arrow/chevron icon on card as clickability affordance
- Click navigates to `/projects/[id]/batches/[batchId]` — nested route preserving project context
- Cards sorted newest-first

### Claude's Discretion
- Skeleton loading animation style (pulse vs static — whatever shadcn/ui Skeleton provides by default)
- Exact spacing, padding, and typography within cards
- Pagination strategy (number of cards per page, control style)
- Responsive breakpoint for tablet (intermediate between 1 and 3 columns)
- Exact Lucide icon choice and composition for empty state illustration

</decisions>

<specifics>
## Specific Ideas

- Mode badges should use distinct colors to make scanning the grid quick — user wants to visually differentiate List vs Profile batches at a glance
- Empty state should feel inviting, not empty — Lucide icon composition + Portuguese text + direct upload CTA
- Stacked card layout with fixed height gives a clean, uniform grid feel

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-batch-grid*
*Context gathered: 2026-01-30*
