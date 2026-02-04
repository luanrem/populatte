---
phase: 29
plan: 01
subsystem: extension-mapping
tags: [badge, mapping-detection, tab-listener, url-matching]
requires: [28-content-script]
provides: [mapping-detection, badge-indicator, mapping-selector]
affects: [29-02-fill-orchestration, 29-03-row-api]
tech-stack:
  added: []
  patterns: [tab-listener, badge-api, auto-select]
key-files:
  created:
    - apps/extension/src/api/mappings.ts
    - apps/extension/entrypoints/popup/components/MappingSelector.tsx
  modified:
    - apps/extension/src/api/index.ts
    - apps/extension/src/storage/types.ts
    - apps/extension/src/storage/preferences.ts
    - apps/extension/src/types/messages.ts
    - apps/extension/entrypoints/background.ts
    - apps/extension/src/api/client.ts
    - apps/extension/entrypoints/popup/App.tsx
    - apps/extension/entrypoints/popup/components/index.ts
decisions:
  - Badge shows count (not checkmark) to indicate multiple mapping matches
  - Auto-select single mapping or last used mapping for convenience
  - Green badge color (#22c55e) matches design system success color
metrics:
  duration: 4m 9s
  completed: 2026-02-04
---

# Phase 29 Plan 01: Mapping Detection and Badge Summary

**One-liner:** Tab-aware mapping detection with green badge indicator and multi-mapping selector dropdown

## What Was Built

This plan implements the mapping detection system that shows users when they're on a page that has an available fill mapping. The extension icon displays a green badge with the count of available mappings, and the popup shows a selector when multiple mappings match.

### Key Components

1. **Mapping API Client** (`apps/extension/src/api/mappings.ts`)
   - `fetchMappingsByUrl(projectId, currentUrl)` - Fetches mappings matching URL prefix
   - `fetchMappingWithSteps(projectId, mappingId)` - Fetches full mapping with step details
   - Types: `MappingListItem`, `MappingWithSteps`, `MappingStep`

2. **Storage Extensions** (`apps/extension/src/storage/`)
   - `lastMappingIdByProject` preference for remembering selection per project
   - `getLastMappingId`/`setLastMappingId` methods

3. **Message Types** (`apps/extension/src/types/messages.ts`)
   - `ExtensionState` extended with mapping fields
   - `GET_MAPPINGS` and `MAPPING_SELECT` message types

4. **Background Script** (`apps/extension/entrypoints/background.ts`)
   - Tab activation listener (`browser.tabs.onActivated`)
   - URL change listener (`browser.tabs.onUpdated`)
   - `checkMappingForTab()` function for URL-based mapping lookup
   - Badge management with green color (#22c55e)
   - Auto-select logic for single/last-used mappings

5. **MappingSelector Component** (`apps/extension/entrypoints/popup/components/MappingSelector.tsx`)
   - Single mapping: displays name in green box
   - Multiple mappings: dropdown selector

## Implementation Notes

### Badge Logic
- Badge shows count of valid mappings (with at least one step)
- Badge clears immediately when navigating away or to unmapped page
- Badge re-evaluates when project selection changes
- Green background color for visual consistency

### Auto-Select Behavior
- If only one mapping matches: auto-select it
- If last-used mapping for project matches: auto-select it
- Otherwise: show selector for user to choose

### URL Matching
- Backend handles inverted prefix matching: `currentUrl LIKE storedUrl%`
- API call includes `isActive=true` filter
- Client filters to mappings with `stepCount > 0`

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 188c15f | feat | Create mapping API client functions |
| 4f47a22 | feat | Add mapping state to storage and messages |
| 99bd4b6 | feat | Implement mapping detection and badge in background |
| 0a32b8f | feat | Add MappingSelector component for multiple matches |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles (pre-existing errors in messaging files unrelated to this plan)
- Extension builds successfully (259.1 kB total)
- Badge API calls integrated into background script
- All required exports present in index files

## Next Phase Readiness

### Available for Phase 29-02 (Fill Orchestration)
- `fetchMappingWithSteps` API function ready
- `currentMappingId` available in background state
- `ExtensionState.mappingId` available for fill trigger

### Dependencies Satisfied
- Tab listeners for URL-based mapping detection: DONE
- Badge indicator for mapping availability: DONE
- Multi-mapping selection UI: DONE
- Last mapping preference storage: DONE
