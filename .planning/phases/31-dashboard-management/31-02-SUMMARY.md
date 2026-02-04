---
phase: 31
plan: 02
subsystem: dashboard-crud
tags: [inline-edit, delete, modal, react-query, shadcn]
dependency-graph:
  requires: [31-01]
  provides:
    - project-inline-edit
    - project-delete-flow
    - batch-settings-modal
    - batch-delete-flow
  affects: [31-03]
tech-stack:
  added: []
  patterns: [inline-edit-pattern, confirmation-dialog-pattern, settings-modal-pattern]
key-files:
  created:
    - apps/web/components/projects/batch-settings-modal.tsx
    - apps/web/components/projects/delete-batch-dialog.tsx
  modified:
    - apps/web/app/(platform)/projects/[id]/page.tsx
    - apps/web/components/layout/app-header.tsx
    - apps/web/components/projects/batch-card.tsx
    - apps/web/components/projects/batch-grid.tsx
decisions:
  - id: use-none-value-constant
    choice: "Use NONE_VALUE constant instead of empty string for Select 'Nenhum' option"
    why: "Radix UI Select doesn't handle empty string values properly"
metrics:
  duration: "3m 20s"
  completed: "2026-02-04"
---

# Phase 31 Plan 02: CRUD UI Wiring Summary

Inline edit wiring for project/batch names with delete confirmation dialogs and batch settings modal

## What Was Built

### Task 1: Project Detail Page CRUD
- Added InlineEditName component for editing project name directly in header
- Updated AppHeader to accept ReactNode for title (instead of just string)
- Added delete button (Trash2 icon) that opens DeleteProjectDialog
- Wired useUpdateProject and useDeleteProject hooks
- After delete confirmation, shows toast and redirects to /projects

### Task 2: Batch Settings Modal and Delete Dialog
- Fixed BatchSettingsModal to use `NONE_VALUE` constant for "Nenhum" option
- Select components now properly handle clearing identifier fields
- Preview text shows "Ex: {primaryValue} - {secondaryValue}" format
- DeleteBatchDialog follows same pattern as DeleteProjectDialog

### Task 3: BatchCard Actions (Previously Completed)
- BatchCard already had settings and delete buttons with hover reveal
- BatchGrid already wired up the modals with state management
- Task 3 was completed in a previous execution (commit 7f9b53c)

## Key Implementation Details

### AppHeader Flexibility
Changed `title` prop from `string` to `React.ReactNode`:
```typescript
interface AppHeaderProps {
  title: React.ReactNode;  // was: string
  children?: React.ReactNode;
}
```

### Select "None" Option Fix
Radix Select requires non-empty values:
```typescript
const NONE_VALUE = "__none__";
// Then map to null when saving
identifierFieldKey: primaryKey === NONE_VALUE ? null : primaryKey
```

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| NONE_VALUE constant | Use "__none__" instead of "" | Radix Select doesn't handle empty strings |
| AppHeader title type | ReactNode | Enables inline edit component in header |

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 970f881 | feat | Add inline edit and delete project to project detail page |
| c2afd7d | feat | Create batch settings modal and delete dialog |
| 7f9b53c | feat | Integrate modals into BatchGrid (from prior run) |

## Deviations from Plan

None - plan executed exactly as written.

Note: Task 3 (wire batch card with settings and delete actions) was found to be already completed from a prior execution run. The BatchCard and BatchGrid already had the necessary wiring.

## Verification Results

- [x] Project detail page uses InlineEditName for project name
- [x] Project detail page has delete button that opens DeleteProjectDialog
- [x] Confirming project delete removes project and redirects to /projects
- [x] BatchSettingsModal opens with identifier dropdowns and live preview
- [x] DeleteBatchDialog follows existing delete dialog pattern
- [x] BatchCard shows settings/delete icons on hover
- [x] TypeScript compilation passes

## Files Summary

| File | Change Type | Purpose |
|------|-------------|---------|
| `apps/web/app/(platform)/projects/[id]/page.tsx` | Modified | Added inline edit and delete functionality |
| `apps/web/components/layout/app-header.tsx` | Modified | Title prop now accepts ReactNode |
| `apps/web/components/projects/batch-settings-modal.tsx` | Modified | Fixed NONE_VALUE handling |
| `apps/web/components/projects/delete-batch-dialog.tsx` | Existing | Batch delete confirmation dialog |
| `apps/web/components/projects/batch-card.tsx` | Existing | Already had settings/delete buttons |
| `apps/web/components/projects/batch-grid.tsx` | Existing | Already had modal wiring |

## Next Phase Readiness

Plan 31-03 (Inline Edit Batch Name) can proceed - all dependencies met.
