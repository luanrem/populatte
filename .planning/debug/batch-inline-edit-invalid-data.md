---
status: diagnosed
trigger: "When editing batch name inline on batch detail page, user gets error 'Invalid batch data received from server'"
created: 2026-02-04T12:00:00Z
updated: 2026-02-04T12:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - UpdateBatchUseCase returns Batch without totalRows, but frontend schema requires totalRows
test: Compared API response shape with batchResponseSchema
expecting: Found missing totalRows field
next_action: Return diagnosis

## Symptoms

expected: Batch name updates successfully when edited inline
actual: Error "Invalid batch data received from server" appears
errors: "Invalid batch data received from server"
reproduction: Edit batch name inline on batch detail page
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-02-04T12:01:00Z
  checked: apps/web/lib/api/endpoints/batches.ts - update() method
  found: Error thrown at line 190 when batchResponseSchema.safeParse(data) fails
  implication: The API response does not match the expected Zod schema

- timestamp: 2026-02-04T12:02:00Z
  checked: apps/web/lib/api/schemas/batch.schema.ts - batchResponseSchema
  found: Schema expects totalRows: z.number() as a required field
  implication: All batch responses MUST include totalRows

- timestamp: 2026-02-04T12:03:00Z
  checked: apps/api/src/core/use-cases/batch/update-batch.use-case.ts
  found: Returns Promise<Batch> (raw entity, no totalRows)
  implication: Update endpoint returns different shape than get/list endpoints

- timestamp: 2026-02-04T12:04:00Z
  checked: apps/api/src/core/use-cases/batch/get-batch.use-case.ts
  found: Returns GetBatchResult extends Batch { totalRows: number } - explicitly adds totalRows
  implication: GetBatch and ListBatches add totalRows, but UpdateBatch does not

- timestamp: 2026-02-04T12:05:00Z
  checked: apps/api/src/core/entities/batch.entity.ts
  found: Batch interface does NOT have totalRows field
  implication: totalRows is computed dynamically by counting rows, not stored on entity

## Resolution

root_cause: UpdateBatchUseCase returns raw Batch entity without totalRows field, but frontend batchResponseSchema requires totalRows. GetBatchUseCase and ListBatchesUseCase add totalRows by counting rows from RowRepository, but UpdateBatchUseCase skips this step.

fix:
verification:
files_changed: []
