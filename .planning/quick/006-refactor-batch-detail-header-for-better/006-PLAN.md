---
phase: quick-006
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/components/projects/batch-detail-header.tsx
autonomous: true

must_haves:
  truths:
    - "Batch filename is the most prominent visual element in the header"
    - "Status and Mode badges are grouped together as primary metadata"
    - "Created date and Row count are displayed separately as secondary metadata with icons"
    - "Status badge uses distinct color coding: green for Completed, amber for Processing, red for Failed"
    - "Layout has clear visual hierarchy with proper spacing between groups"
  artifacts:
    - path: "apps/web/components/projects/batch-detail-header.tsx"
      provides: "Redesigned batch detail header with visual hierarchy"
      contains: "BatchDetailHeader"
  key_links:
    - from: "apps/web/components/projects/batch-detail-header.tsx"
      to: "@/lib/api/schemas/batch.schema"
      via: "BatchResponse type import"
      pattern: "BatchResponse"
---

<objective>
Refactor the BatchDetailHeader component to transform the current flat "tag soup" layout into a professionally structured header with clear visual hierarchy.

Purpose: The current layout displays all metadata (mode, status, row count, date) as a flat series of elements without proper grouping or hierarchy. This makes it hard to scan and looks visually cluttered.

Output: A redesigned `batch-detail-header.tsx` with distinct title, primary metadata, and secondary metadata sections.
</objective>

<execution_context>
@/Users/luanmartins/.claude/get-shit-done/workflows/execute-plan.md
@/Users/luanmartins/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/components/projects/batch-detail-header.tsx
@apps/web/components/projects/batch-card.tsx
@apps/web/components/ui/badge.tsx
@apps/web/components/ui/separator.tsx
@apps/web/lib/api/schemas/batch.schema.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Redesign BatchDetailHeader layout with visual hierarchy</name>
  <files>apps/web/components/projects/batch-detail-header.tsx</files>
  <action>
Refactor the existing BatchDetailHeader component layout inside the Card. Keep all existing logic (modeConfig, statusConfig, date formatter, breadcrumb) unchanged. Only restructure the CardContent layout.

New layout structure inside CardContent:

1. **Title row** - Make the batch name the hero element:
   - FileSpreadsheet icon (h-5 w-5) + batch name as `text-xl font-semibold` (upgrade from text-lg)
   - This row stands alone at the top with `mb-4` spacing below it

2. **Primary metadata row** - Status and Mode badges grouped together:
   - Wrap Status badge and Mode badge in a `flex items-center gap-2` container
   - Status badge comes first (most important operational info)
   - Mode badge comes second
   - Keep existing color classes for both badges (they already use the correct green/amber/red/blue/purple scheme)

3. **Visual separator** - Use the shadcn Separator component (already available in the project) as a vertical divider between primary and secondary metadata. Use `orientation="vertical"` with `h-4` height class.

4. **Secondary metadata** - Date and Row count with icons:
   - Calendar icon (h-4 w-4 text-muted-foreground) + formatted date as `text-sm text-muted-foreground`
   - A small dot separator between date and row count: `<span className="text-muted-foreground">·</span>`
   - Rows icon (h-4 w-4 text-muted-foreground) + row count text as `text-sm text-muted-foreground`

5. **Overall metadata container** - Wrap items 2, 3, and 4 in a single flex row:
   ```
   <div className="flex items-center gap-3">
     {/* Primary: badges */}
     <div className="flex items-center gap-2">
       <Badge ...status />
       <Badge ...mode />
     </div>
     {/* Vertical separator */}
     <Separator orientation="vertical" className="h-4" />
     {/* Secondary: date and rows */}
     <div className="flex items-center gap-3 text-sm text-muted-foreground">
       <div className="flex items-center gap-1.5">
         <Calendar className="h-3.5 w-3.5" />
         <span>{formatted date}</span>
       </div>
       <span>·</span>
       <div className="flex items-center gap-1.5">
         <Rows className="h-3.5 w-3.5" />
         <span>{row count} registros</span>
       </div>
     </div>
   </div>
   ```

Import the Separator component from `@/components/ui/separator`.

Keep ALL existing imports, interfaces, configs, and breadcrumb logic exactly as they are. This is purely a layout restructure of what is inside CardContent.
  </action>
  <verify>
Run `npm run lint --filter=@populatte/web` and `npm run type-check --filter=@populatte/web` to confirm no TypeScript or lint errors.

Visually confirm the new structure by reviewing the component code:
- Title (batch name) is in its own row with text-xl font-semibold
- Badges (status + mode) are grouped together
- Separator divides badges from secondary info
- Date and row count appear with icons as secondary metadata
  </verify>
  <done>
The BatchDetailHeader renders with three distinct visual layers:
1. Prominent batch filename as the title (text-xl, font-semibold)
2. Primary metadata: Status and Mode badges grouped and visually prominent
3. Secondary metadata: Created date with Calendar icon and Row count with Rows icon, separated from badges by a vertical Separator
All existing functionality (breadcrumb navigation, date formatting, status/mode color coding) is preserved.
  </done>
</task>

</tasks>

<verification>
- `npm run lint --filter=@populatte/web` passes with no errors
- `npm run type-check --filter=@populatte/web` passes with no errors
- Component still exports BatchDetailHeader with the same props interface (BatchDetailHeaderProps)
- All three batch statuses (COMPLETED, PROCESSING, FAILED) retain their distinct color-coded badges
- Both modes (LIST_MODE, PROFILE_MODE) retain their distinct color-coded badges
- Breadcrumb navigation is unchanged
</verification>

<success_criteria>
- The batch filename is visually the most prominent element (largest text, own row)
- Status and Mode badges are visually grouped as primary metadata
- Date and Row count are displayed as secondary metadata with Lucide icons
- A vertical Separator cleanly divides primary from secondary metadata
- No functional regressions: all existing data, links, and color coding preserved
- Lint and type-check pass cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/006-refactor-batch-detail-header-for-better/006-SUMMARY.md`
</output>
