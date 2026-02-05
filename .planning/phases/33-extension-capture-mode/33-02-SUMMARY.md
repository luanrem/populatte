---
phase: 33
plan: 02
subsystem: extension-api
tags: [messages, api, batches, mappings, capture]

dependency_graph:
  requires: []
  provides:
    - capture-message-types
    - mapping-creation-api
    - batch-detail-api
  affects:
    - 33-03-PLAN (capture mode UI)
    - 33-04-PLAN (background handler integration)

tech_stack:
  added: []
  patterns:
    - discriminated-union-messages
    - typed-api-functions

key_files:
  created: []
  modified:
    - apps/extension/src/types/messages.ts
    - apps/extension/src/api/mappings.ts
    - apps/extension/src/api/batches.ts

decisions: []

metrics:
  duration: 2m 28s
  completed: 2026-02-05
---

# Phase 33 Plan 02: Messages and API Summary

Capture mode message type definitions and API functions for mapping creation and batch detail fetching.

## What Was Built

### Message Types (messages.ts)

Added discriminated union messages for capture mode communication:

- **CaptureStartMessage**: Initiates capture mode with batch column list
- **CaptureStopMessage**: Stops capture mode
- **CaptureHighlightMessage**: Highlights specific step on page
- **CaptureRemoveStepMessage**: Removes captured step
- **ElementCapturedMessage**: Content script reports captured element
- **AlreadyCapturedMessage**: Duplicate element detection

All messages integrated into appropriate union types:
- `PopupToBackgroundMessage`: CaptureStart, CaptureStop, CaptureHighlight, CaptureRemoveStep
- `BackgroundToContentMessage`: CaptureStart, CaptureStop, CaptureHighlight, CaptureRemoveStep
- `ContentToBackgroundMessage`: ElementCaptured, AlreadyCaptured
- `BackgroundToPopupMessage`: ElementCaptured, AlreadyCaptured

### Mapping Creation API (mappings.ts)

- **CreateStepPayload**: Interface for step creation without id (backend generates)
- **CreateMappingPayload**: Interface with name, targetUrl, isActive, steps[]
- **createMappingWithSteps()**: POST to `/projects/:projectId/mappings`
  - Automatically assigns stepOrder based on array index
  - Returns full MappingWithSteps response

### Batch Detail API (batches.ts)

- **ColumnMetadata**: Interface with key, header, index
- **BatchDetail**: Interface with full batch info including columnMetadata[]
- **fetchBatchDetail()**: GET `/projects/:projectId/batches/:batchId`
  - Returns column metadata for source column dropdown

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add capture mode message types | 7412412 | messages.ts |
| 2 | Add mapping creation API function | 9bb0494 | mappings.ts |
| 3 | Add batch detail API with column metadata | 7db5985 | batches.ts |

## Commits

1. `7412412` - feat(33-02): add capture mode message types
2. `9bb0494` - feat(33-02): add mapping creation API function
3. `7db5985` - feat(33-02): add batch detail API with column metadata

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Prerequisites for 33-03 (Capture Mode UI):**
- Message types defined for popup-content communication
- API functions ready for saving mappings
- Batch detail API provides column metadata for source dropdown

**Ready to proceed with:**
- Capture mode popup UI implementation
- Step list component with source column assignment
- Save mapping button integration
