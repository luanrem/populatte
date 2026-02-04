---
status: complete
phase: 31-dashboard-management
source: 31-01-SUMMARY.md, 31-02-SUMMARY.md, 31-03-SUMMARY.md, 31-04-SUMMARY.md, 31-05-SUMMARY.md, 31-06-SUMMARY.md, 31-07-SUMMARY.md
started: 2026-02-04T19:45:00Z
updated: 2026-02-04T20:30:00Z
---

## Current Test

[re-verification complete]

## Re-verification Tests

### R1. Batch Inline Edit (Blocker Fix)
expected: Edit batch name on detail page - should save without "Invalid batch data" error
result: pass

### R2. Batch Settings Toast (Major Fix)
expected: Save batch settings - should show "Configurações salvas com sucesso" toast
result: issue
reported: "Toast works but hydration error: <p> cannot contain nested <div>. Skeleton inside <p> tag at batch-settings-modal.tsx:146"
severity: minor

### R3. Batch Card Button Positioning (Cosmetic Fix)
expected: Hover batch card - buttons should be visible in top-right corner, appropriately sized (no chevron)
result: pass

### R4. Section Visual Separation (Cosmetic Fix)
expected: Project detail page - sections should have larger titles, subtitles, and a separator line between them
result: pass

## Re-verification Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0

## Tests

### 1. Edit Project Name Inline
expected: On project detail page, hover over project name in header. A pencil icon appears. Click to enter edit mode with text selected. Type new name, press Enter or click away to save. Name updates immediately with success feedback.
result: pass

### 2. Delete Project
expected: On project detail page, click trash icon next to project name. Confirmation dialog appears with warning. Confirm deletion. Project is removed and you are redirected to /projects with success toast.
result: pass
note: Hydration warning appeared in sidebar component (pre-existing, unrelated to delete functionality)

### 3. Batch Settings Modal (Identifier Configuration)
expected: On batch card, hover to reveal settings icon (gear). Click to open settings modal. Modal shows two dropdowns for primary and secondary identifier fields. Select a column as primary identifier. Live preview shows example format. Save changes.
result: issue
reported: "Duas coisas: 1) Quando clico salvar dá spinner mas não tenho feedback visual se salvou ou não - deveria ter toast. 2) Os botões no hover do card estão muito pequenos, mal posicionados um do lado do outro, quase não dá pra ver. Deveria remover a seta (não entendi pra que serve) e colocar os botões no canto superior direito ou inferior direito do card."
severity: major

### 4. Delete Batch
expected: On batch card, hover to reveal delete icon (trash). Click to open confirmation dialog. Confirm deletion. Batch is removed from the grid with success toast.
result: pass
note: User feedback - seções Mappings e Importações na página de projeto não estão bem separadas visualmente (título maior, subtítulo, borda divisória)

### 5. Edit Batch Name Inline
expected: Navigate to batch detail page. Hover over batch name to reveal pencil icon. Click to edit. Type new name and press Enter. Name updates immediately.
result: issue
reported: "Deu um erro: Invalid batch data received from server"
severity: blocker

### 6. View Mappings List
expected: On project detail page, scroll to Mappings section. Table displays all mappings with columns: Nome, URL, Passos (step count), Status (Ativo/Inativo), and Ações (actions).
result: pass

### 7. Delete Mapping
expected: In mappings table, click delete button (trash icon) in actions column. Confirmation dialog appears. Confirm deletion. Mapping is removed from the list with success toast.
result: pass

### 8. New Mapping Modal
expected: In mappings section, click "Novo Mapping" button. Modal opens explaining that mappings are created via the browser extension with step-by-step instructions.
result: pass

### 9. Mappings Empty State
expected: On a project with no mappings, the mappings section shows an empty state with Layers icon, title, description, and optional action button.
result: pass

## Summary

total: 9
passed: 7
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Batch settings modal shows success feedback after saving"
  status: failed
  reason: "User reported: Quando clico salvar dá spinner mas não tenho feedback visual se salvou ou não - deveria ter toast"
  severity: major
  test: 3
  root_cause: "batch-settings-modal.tsx missing toast import and toast.success() call after save"
  artifacts:
    - path: "apps/web/components/projects/batch-settings-modal.tsx"
      issue: "No toast import, handleSave doesn't call toast.success()"
  missing:
    - "Add import { toast } from 'sonner'"
    - "Add toast.success('Configuracoes salvas com sucesso') after mutateAsync"
  debug_session: ".planning/debug/batch-settings-no-success-toast.md"

- truth: "Batch card action buttons are well-positioned and visible"
  status: failed
  reason: "User reported: Os botões no hover do card estão muito pequenos, mal posicionados, quase não dá pra ver. Deveria remover a seta e colocar os botões no canto superior/inferior direito do card"
  severity: cosmetic
  test: 3
  root_cause: "Buttons use icon-xs (24px with 12px icons) positioned inline with confusing chevron"
  artifacts:
    - path: "apps/web/components/projects/batch-card.tsx"
      issue: "size='icon-xs' too small, ChevronRight confuses purpose, buttons not in standard position"
  missing:
    - "Change from size='icon-xs' to size='icon-sm' (32px)"
    - "Remove ChevronRight icon or move to different position"
    - "Move buttons to top-right corner with absolute positioning"
  debug_session: ".planning/debug/batch-card-buttons-cosmetic.md"

- truth: "Project detail page sections (Mappings/Importações) are visually well-separated"
  status: failed
  reason: "User reported: As seções não estão bem separadas. Deveria ter título maior, subtítulo, e borda/divisória entre as seções"
  severity: cosmetic
  test: 4
  root_cause: "Sections use only space-y-8 with text-lg titles, no dividers or visual containers"
  artifacts:
    - path: "apps/web/app/(platform)/projects/[id]/page.tsx"
      issue: "Minimal visual hierarchy, no Separator between sections, inconsistent subtitles"
  missing:
    - "Add <Separator /> from shadcn/ui between sections"
    - "Change titles from text-lg to text-xl"
    - "Add consistent subtitle to Importacoes section"
  debug_session: "N/A"

- truth: "Batch name can be edited inline on batch detail page"
  status: failed
  reason: "User reported: Deu um erro - Invalid batch data received from server"
  severity: blocker
  test: 5
  root_cause: "UpdateBatchUseCase returns raw Batch without totalRows, but frontend schema requires totalRows"
  artifacts:
    - path: "apps/api/src/core/use-cases/batch/update-batch.use-case.ts"
      issue: "Returns Promise<Batch> without totalRows field"
    - path: "apps/web/lib/api/schemas/batch.schema.ts"
      issue: "batchResponseSchema requires totalRows: z.number()"
  missing:
    - "Inject RowRepository in UpdateBatchUseCase"
    - "Count rows with rowRepository.countByBatchId(batchId) after update"
    - "Return { ...updated, totalRows } instead of just updated"
  debug_session: ".planning/debug/batch-inline-edit-invalid-data.md"

- truth: "Batch settings modal renders without hydration errors"
  status: failed
  reason: "User reported: Hydration error - <p> cannot contain nested <div>. Skeleton inside <p> tag at batch-settings-modal.tsx:146"
  severity: minor
  test: R2
  root_cause: "Skeleton component renders <div> but is placed inside <p> tag in preview section"
  artifacts:
    - path: "apps/web/components/projects/batch-settings-modal.tsx"
      issue: "Line 146: <p> contains <Skeleton> which renders <div>"
  missing:
    - "Change <p> to <div> or <span> wrapper around the preview content"
  debug_session: "N/A"
