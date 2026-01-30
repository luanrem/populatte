---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/components/projects/project-card.tsx
autonomous: true

must_haves:
  truths:
    - "Clicking a project card navigates to /projects/[id]"
    - "Dropdown menu actions (Edit, Delete, Archive) still work without triggering navigation"
    - "Card hover styling and group effects remain unchanged"
  artifacts:
    - path: "apps/web/components/projects/project-card.tsx"
      provides: "Clickable project card with navigation"
      contains: "Link"
  key_links:
    - from: "apps/web/components/projects/project-card.tsx"
      to: "/projects/[id]"
      via: "Next.js Link component"
      pattern: "href=.*projects/.*project\\.id"
---

<objective>
Fix ProjectCard navigation so clicking a card navigates to /projects/[id].

Purpose: The project list page is currently non-functional for navigation - clicking a project card does nothing. Users need to reach the project detail page.
Output: A working ProjectCard that navigates on click while preserving dropdown menu functionality.
</objective>

<execution_context>
@/Users/luanmartins/.claude/get-shit-done/workflows/execute-plan.md
@/Users/luanmartins/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/components/projects/project-card.tsx
@apps/web/components/projects/batch-card.tsx (reference pattern: Link wrapping a Card)
@apps/web/components/projects/project-grid.tsx (consumer of ProjectCard)
@apps/web/app/(platform)/projects/[id]/page.tsx (navigation target)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wrap ProjectCard in Next.js Link with dropdown event isolation</name>
  <files>apps/web/components/projects/project-card.tsx</files>
  <action>
    Modify ProjectCard to make the entire card navigable while keeping the dropdown menu functional:

    1. Import `Link` from `next/link`.

    2. Wrap the `<Card>` component inside a `<Link href={/projects/${project.id}}>` element. Follow the existing pattern in `batch-card.tsx` where `Link` wraps the entire `Card`.

    3. Prevent dropdown menu clicks from triggering navigation: Add an `onClick` handler with `e.stopPropagation()` and `e.preventDefault()` on the `<DropdownMenu>` wrapper div. Wrap the entire `<DropdownMenu>` in a `<div>` that captures click events to stop propagation:
       ```tsx
       <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
         <DropdownMenu>
           ...
         </DropdownMenu>
       </div>
       ```

    4. Add `cursor-pointer` to the Card className to match the batch-card pattern, keeping the existing `group relative transition-shadow hover:shadow-md` classes.

    5. Do NOT change the component's props interface or any of the existing callback handlers (onEdit, onDelete, onToggleArchive).

    6. Do NOT remove the "use client" directive - it is needed for the interactive dropdown handlers.
  </action>
  <verify>
    Run `npm run lint --filter=@populatte/web` and `npm run type-check --filter=@populatte/web` to confirm no lint or type errors.
    Run `npm run build --filter=@populatte/web` to confirm the build succeeds.
  </verify>
  <done>
    - ProjectCard renders a Next.js Link to `/projects/${project.id}`
    - Card has cursor-pointer styling
    - DropdownMenu click events are isolated from the Link (stopPropagation + preventDefault on wrapper div)
    - All existing props and callbacks remain unchanged
    - Build and lint pass cleanly
  </done>
</task>

</tasks>

<verification>
1. `npm run lint --filter=@populatte/web` passes
2. `npm run type-check --filter=@populatte/web` passes
3. `npm run build --filter=@populatte/web` succeeds
4. Visual inspection: Card renders with Link wrapping, dropdown still functional
</verification>

<success_criteria>
- Clicking a project card navigates to /projects/[project.id]
- Clicking the dropdown trigger (three-dot menu) opens the menu without navigating
- Clicking Edit/Delete/Archive menu items fires the respective callbacks without navigating
- Existing hover effects and styling are preserved
- No TypeScript, ESLint, or build errors
</success_criteria>

<output>
After completion, create `.planning/quick/001-fix-navigation-in-projectcard/001-SUMMARY.md`
</output>
