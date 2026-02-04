---
status: testing
phase: 23-step-crud
source: [23-01-SUMMARY.md, 23-02-SUMMARY.md]
started: 2026-02-03T13:45:00Z
updated: 2026-02-03T13:45:00Z
---

## Current Test

number: 1
name: Create Step with Auto-Assigned Order
expected: |
  POST /mappings/:mappingId/steps with action, selector creates step.
  Step is returned with auto-assigned stepOrder (starts at 1 for first step, increments for subsequent).
  Only works for mappings the user owns.
awaiting: user response

## Tests

### 1. Create Step with Auto-Assigned Order
expected: POST /mappings/:mappingId/steps with action, selector creates step. Step is returned with auto-assigned stepOrder (starts at 1 for first step, increments for subsequent). Only works for mappings the user owns.
result: [pending]

### 2. Update Step Fields
expected: PATCH /mappings/:mappingId/steps/:stepId updates any combination of action, selector, selectorFallbacks, sourceFieldKey, fixedValue, optional, clearBefore, pressEnter, waitMs. Returns updated step.
result: [pending]

### 3. Mutual Exclusion Validation
expected: API rejects (400 Bad Request) if BOTH sourceFieldKey AND fixedValue are provided in create or update request. Either one alone is fine, both empty is fine.
result: [pending]

### 4. Delete Step
expected: DELETE /mappings/:mappingId/steps/:stepId returns 204 No Content. Step is permanently removed (hard delete). Only works for steps in mappings the user owns.
result: [pending]

### 5. Reorder Steps
expected: PUT /mappings/:mappingId/steps/reorder with orderedStepIds array rearranges steps. Returns all steps with new stepOrder values matching array order.
result: [pending]

### 6. Reorder Validation - Exact Match
expected: API rejects (400 Bad Request) if orderedStepIds has duplicates, is missing any existing step IDs, or contains IDs that don't exist in the mapping.
result: [pending]

### 7. Defense-in-Depth Ownership
expected: All step operations (create/update/delete/reorder) return 403 Forbidden if user doesn't own the project that contains the mapping. Returns 404 if mapping doesn't exist or is soft-deleted.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
