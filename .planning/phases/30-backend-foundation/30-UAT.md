---
status: complete
phase: 30-backend-foundation
source: 30-01-SUMMARY.md, 30-02-SUMMARY.md, 30-03-SUMMARY.md
started: 2026-02-04T19:00:00Z
updated: 2026-02-04T19:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Update batch name via PUT endpoint
expected: PUT /projects/:projectId/batches/:batchId with { "name": "new name" } returns 200 and batch name is updated.
result: pass

### 2. Update batch identifier fields via PATCH endpoint
expected: PATCH /projects/:projectId/batches/:batchId with { "identifierFieldKey": "column_name", "secondaryFieldKey": "another_column" } returns 200. Only columns from batch's columnMetadata are accepted.
result: pass

### 3. Invalid identifier key rejected
expected: PATCH with identifierFieldKey set to a column name that doesn't exist in batch's columnMetadata returns 400 error with validation message.
result: pass

### 4. Soft-delete batch via DELETE endpoint
expected: DELETE /projects/:projectId/batches/:batchId returns 204 No Content. Batch is soft-deleted (deletedAt set). All rows belonging to that batch are also soft-deleted.
result: pass

### 5. Soft-delete project cascades to batches and rows
expected: DELETE /projects/:projectId soft-deletes the project AND all its batches AND all rows in those batches. No orphan records remain visible.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
