---
phase: 10-batch-dto-validation
plan: 01
subsystem: ingestion
tags: [validation, zod, dto, controller, error-handling]
dependency_graph:
  requires: [09-01]
  provides: [custom-enum-validation, safeParse-pattern]
  affects: [future-dto-schemas]
tech_stack:
  added: []
  patterns: [safeParse-validation, custom-error-messages]
key_files:
  created: []
  modified:
    - apps/api/src/presentation/dto/batch.dto.ts
    - apps/api/src/presentation/controllers/batch.controller.ts
decisions:
  - id: DECISION-10-01-001
    summary: Use Zod v4 message parameter for custom enum errors
    context: Zod v4 changed the API from errorMap to message parameter
    options:
      - errorMap function (Zod v3 pattern)
      - message parameter (Zod v4 pattern)
    chosen: message
    rationale: Simpler API, matches Zod v4 documentation
  - id: DECISION-10-01-002
    summary: Use safeParse instead of parse with try/catch
    context: Align manual validation with ZodValidationPipe pattern
    options:
      - Keep parse with try/catch
      - Refactor to safeParse
    chosen: safeParse
    rationale: Type-safe, consistent with project patterns, no unsafe type assertions
metrics:
  duration: 2m 18s
  completed: 2026-01-29
---

# Phase 10 Plan 01: Batch DTO Validation Summary

> **One-liner:** Custom enum error messages in createBatchSchema using Zod v4 message parameter with safeParse pattern for type-safe validation

## What Was Built

Enhanced the CreateBatchDto Zod schema with a custom error message that explicitly lists valid BatchMode values (LIST_MODE, PROFILE_MODE) and refactored the BatchController to use the safeParse pattern for consistency with the project's ZodValidationPipe approach.

**Validation improvements:**
- Users now see "Mode must be either LIST_MODE or PROFILE_MODE" on invalid mode values
- Eliminated unsafe type assertions (`error as { issues: ... }`)
- Changed `let validated` to `const validated = result.data` (better immutability)
- Removed unused CreateBatchDto type import (inferred from result.data)

**Controller remains thin:**
- Only validation, file presence check, file transformation, and use case delegation
- No business logic, no database access, no SheetJS calls

## Tasks Completed

| Task | Name                                                         | Commit  | Files                         |
| ---- | ------------------------------------------------------------ | ------- | ----------------------------- |
| 1    | Add custom error message and refactor controller to safeParse | a7dc2ea | batch.dto.ts, batch.controller.ts |

## Implementation Details

### batch.dto.ts changes

**Before:**
```typescript
export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode),
});
```

**After:**
```typescript
export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode, {
    message: 'Mode must be either LIST_MODE or PROFILE_MODE',
  }),
});
```

Used Zod v4's `message` parameter instead of v3's `errorMap` function for simpler API.

### batch.controller.ts changes

**Before (parse + try/catch):**
```typescript
let validated: CreateBatchDto;
try {
  validated = createBatchSchema.parse({ mode });
} catch (error) {
  if (error instanceof Error && 'issues' in error) {
    const zodError = error as {
      issues: Array<{ path: string[]; message: string }>;
    };
    const errors = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new BadRequestException({
      message: 'Validation failed',
      errors,
    });
  }
  throw error;
}
```

**After (safeParse):**
```typescript
const result = createBatchSchema.safeParse({ mode });
if (!result.success) {
  const errors = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  throw new BadRequestException({
    message: 'Validation failed',
    errors,
  });
}
const validated = result.data;
```

Benefits:
- Type-safe out of the box (no `instanceof Error && 'issues' in error` hack)
- No unsafe type assertion
- Consistent with ZodValidationPipe pattern used elsewhere in codebase
- Cleaner code (fewer lines, better readability)

## Verification Results

✅ **Build:** `pnpm run build` - TypeScript compilation passed
✅ **Lint:** `pnpm exec eslint` - No linting errors in modified files
✅ **Tests:** `pnpm run test` - All tests passed (2 suites, 3 tests)
✅ **Custom error message:** Contains "LIST_MODE or PROFILE_MODE"
✅ **safeParse usage:** Controller uses `createBatchSchema.safeParse()`
✅ **Thin controller:** No imports from infrastructure/database, no xlsx, no business logic

## Decisions Made

### DECISION-10-01-001: Zod v4 message parameter

**Context:** Plan specified using Zod v4 for custom enum error message. Initial implementation used `errorMap` function (Zod v3 pattern), which failed TypeScript compilation.

**Options:**
1. **errorMap function** (Zod v3): `errorMap: () => ({ message: '...' })`
2. **message parameter** (Zod v4): `message: '...'`

**Chosen:** Option 2 - message parameter

**Rationale:**
- Simpler API (no function wrapper)
- Matches Zod v4.3.6 documentation
- TypeScript compilation passes
- Less boilerplate

**Impact:** Future Zod schemas in the project should use `message` parameter for custom errors.

### DECISION-10-01-002: safeParse pattern

**Context:** Plan required refactoring manual Zod validation to use safeParse for consistency with ZodValidationPipe.

**Options:**
1. **Keep parse with try/catch**: Current approach (lines 40-58)
2. **Refactor to safeParse**: Match ZodValidationPipe pattern

**Chosen:** Option 2 - safeParse

**Rationale:**
- Eliminates unsafe type assertions (`error as { issues: ... }`)
- Eliminates type guard hack (`error instanceof Error && 'issues' in error`)
- Type-safe: `result.success` is boolean discriminator for type narrowing
- Consistent with ZodValidationPipe (see zod-validation.pipe.ts:8)
- Better code quality: `const` instead of `let`, cleaner control flow

**Impact:** Sets pattern for manual Zod validation in multipart form data controllers.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 10 Status:** COMPLETE ✅

**What's Ready:**
- Custom enum error messages improve API error clarity
- safeParse pattern establishes consistent validation approach
- Controller remains thin and maintainable

**Blockers:** None

**Concerns:** None

**Integration Points:**
- Future DTOs can use same pattern for custom error messages
- Manual validation pattern now documented for multipart form data scenarios

## Lessons Learned

### Technical Insights

1. **Zod v3 → v4 API changes:** The `errorMap` function was replaced with a simpler `message` parameter in Zod v4. Always check version-specific documentation.

2. **safeParse vs parse:** The `safeParse` approach is superior for manual validation:
   - Type-safe discriminated union (`success: true | false`)
   - No exception handling required
   - No type assertions
   - Cleaner code

3. **Controller patterns for multipart data:** Can't use ZodValidationPipe directly due to multipart form data, but can still use safeParse pattern manually.

### Process Observations

- **Incremental verification:** Checking TypeScript compilation immediately after changes caught API mismatch early
- **Existing lint errors:** Project has 9 pre-existing lint errors unrelated to this task - documented for awareness but not blocking

## Testing Notes

**Existing test coverage:**
- 2 test suites passed (app.controller.spec.ts, create-batch.use-case.spec.ts)
- 3 tests total

**Manual testing recommended:**
- Send POST request with invalid mode value → verify error message shows "LIST_MODE or PROFILE_MODE"
- Send POST request with missing mode field → verify structured error response
- Send POST request with valid mode → verify successful batch creation

**Integration test scenarios:**
```bash
# Invalid mode
curl -X POST /projects/123/batches \
  -F "mode=INVALID_MODE" \
  -F "documents=@test.xlsx"
# Expected: 400 with custom error message

# Missing mode
curl -X POST /projects/123/batches \
  -F "documents=@test.xlsx"
# Expected: 400 with structured error

# Valid mode
curl -X POST /projects/123/batches \
  -F "mode=LIST_MODE" \
  -F "documents=@test.xlsx"
# Expected: 200/201 with batch creation
```

## References

**Modified Files:**
- `apps/api/src/presentation/dto/batch.dto.ts` - Custom error message
- `apps/api/src/presentation/controllers/batch.controller.ts` - safeParse pattern

**Related Files:**
- `apps/api/src/presentation/pipes/zod-validation.pipe.ts` - Reference pattern
- `apps/api/src/core/entities/batch.entity.ts` - BatchMode enum definition

**Commits:**
- a7dc2ea: refactor(10-01): harden CreateBatchDto validation with custom error and safeParse
