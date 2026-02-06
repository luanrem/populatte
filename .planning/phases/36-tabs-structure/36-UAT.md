---
status: diagnosed
phase: 36-tabs-structure
source: 36-01-SUMMARY.md, 36-02-SUMMARY.md
started: 2026-02-06T18:10:00Z
updated: 2026-02-06T18:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Tab Bar Visible with Two Tabs
expected: Side Panel shows a tab bar with two tabs: "Preencher" and "Captura", each with an icon. The tab bar sits below the connection status indicator and above the main content area.
result: pass

### 2. Default Tab is Preencher
expected: When opening the Side Panel fresh (click extension icon), it always opens on the "Preencher" tab, regardless of what tab was active before closing.
result: pass

### 3. Captura Tab Disabled When Not Capturing
expected: When capture mode is NOT active, clicking the "Captura" tab does nothing (tab does not switch). A tooltip saying "Inicie a captura primeiro" appears on hover or click.
result: issue
reported: "Está aparecendo a tooltip depois de muito tempo, demora um pouquinho para aparecer e só aparece quando eu dou hover, quando eu clico não aparece nada."
severity: minor

### 4. Capture Mode Activates Captura Tab
expected: Click "Criar Mapping" (or start capture mode). The Side Panel automatically switches to the "Captura" tab. A blue pulsing dot appears on the Captura tab label indicating capture is active.
result: issue
reported: "Tá tendo um delay pra mover pra tela de captura depois que eu clico, mas ele vai. sim aparece o círculo azul pulsando"
severity: minor

### 5. Blue Pulsing Badge on Active Capture
expected: While capture mode is running, the Captura tab shows a small blue pulsing dot badge next to the label. This badge is visible regardless of which tab is currently selected.
result: pass

### 6. Tab Switching Works
expected: When Captura tab is enabled (capture active), clicking between Preencher and Captura tabs switches the visible content area. Each tab shows its own content section.
result: pass

## Summary

total: 6
passed: 4
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Tooltip 'Inicie a captura primeiro' appears promptly on hover and on click of disabled Captura tab"
  status: failed
  reason: "User reported: Está aparecendo a tooltip depois de muito tempo, demora um pouquinho para aparecer e só aparece quando eu dou hover, quando eu clico não aparece nada."
  severity: minor
  test: 3
  root_cause: "Native HTML title attribute has browser-controlled 1-2s hover delay and never shows on click. Need custom tooltip component."
  artifacts:
    - path: "apps/extension/entrypoints/sidepanel/components/TabBar.tsx"
      issue: "Line 46 uses native title attribute instead of custom tooltip"
  missing:
    - "Replace native title with custom CSS tooltip that shows instantly on hover and on click"
  debug_session: ""

- truth: "Side Panel switches to Captura tab immediately when capture mode starts"
  status: failed
  reason: "User reported: Tá tendo um delay pra mover pra tela de captura depois que eu clico, mas ele vai. sim aparece o círculo azul pulsando"
  severity: minor
  test: 4
  root_cause: "setActiveTab('captura') is called AFTER sequential async operations (fetchBatchDetail, sendViaPort, chrome.storage.session.set) in handleEnterCaptureMode(), causing 100-500ms+ cumulative delay"
  artifacts:
    - path: "apps/extension/entrypoints/sidepanel/App.tsx"
      issue: "Lines 281-310: setActiveTab on line 307 only runs after all async operations complete"
  missing:
    - "Move setActiveTab('captura') to before async operations for optimistic UI update"
  debug_session: ""
