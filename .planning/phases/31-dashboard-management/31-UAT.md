---
status: complete
phase: 31-dashboard-management
source: 31-01-SUMMARY.md, 31-02-SUMMARY.md, 31-03-SUMMARY.md, 31-04-SUMMARY.md, 31-05-SUMMARY.md, 31-06-SUMMARY.md
started: 2026-02-04T19:45:00Z
updated: 2026-02-04T19:46:00Z
---

## Current Test

[testing complete]

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
  artifacts: []
  missing: []

- truth: "Batch card action buttons are well-positioned and visible"
  status: failed
  reason: "User reported: Os botões no hover do card estão muito pequenos, mal posicionados, quase não dá pra ver. Deveria remover a seta e colocar os botões no canto superior/inferior direito do card"
  severity: cosmetic
  test: 3
  artifacts: []
  missing: []

- truth: "Project detail page sections (Mappings/Importações) are visually well-separated"
  status: failed
  reason: "User reported: As seções não estão bem separadas. Deveria ter título maior, subtítulo, e borda/divisória entre as seções"
  severity: cosmetic
  test: 4
  artifacts: []
  missing: []

- truth: "Batch name can be edited inline on batch detail page"
  status: failed
  reason: "User reported: Deu um erro - Invalid batch data received from server"
  severity: blocker
  test: 5
  artifacts: []
  missing: []
