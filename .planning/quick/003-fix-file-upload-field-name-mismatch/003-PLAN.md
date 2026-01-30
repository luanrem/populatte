---
phase: quick-003
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/components/projects/upload-batch-modal.tsx
autonomous: true

must_haves:
  truths:
    - "File upload from web dashboard reaches the backend without 'missing file' errors"
    - "Both LIST_MODE (single file) and PROFILE_MODE (multiple files) uploads work correctly"
  artifacts:
    - path: "apps/web/components/projects/upload-batch-modal.tsx"
      provides: "FormData with correct 'documents' field name"
      contains: "formData.append('documents'"
  key_links:
    - from: "apps/web/components/projects/upload-batch-modal.tsx"
      to: "apps/api/src/presentation/controllers/batch.controller.ts"
      via: "FormData field name must match FilesInterceptor field name"
      pattern: "documents"
---

<objective>
Fix file upload field name mismatch between frontend and backend.

Purpose: The frontend sends files under field names `'file'` (LIST_MODE) and `'files'` (PROFILE_MODE), but the backend `FilesInterceptor` expects the field name `'documents'`. This causes all file uploads to silently fail because Multer never receives the files.

Output: Working file upload for both LIST_MODE and PROFILE_MODE.
</objective>

<execution_context>
@/Users/luanmartins/.claude/get-shit-done/workflows/execute-plan.md
@/Users/luanmartins/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/components/projects/upload-batch-modal.tsx
@apps/api/src/presentation/controllers/batch.controller.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix FormData field names to match backend expectation</name>
  <files>apps/web/components/projects/upload-batch-modal.tsx</files>
  <action>
    In the `handleSubmit` function of `upload-batch-modal.tsx`, change both `formData.append` calls for file data to use the field name `'documents'` instead of `'file'` and `'files'`.

    Specifically:
    - Line 121: Change `formData.append('file', selectedFiles[0]!)` to `formData.append('documents', selectedFiles[0]!)`
    - Line 124: Change `formData.append('files', file)` to `formData.append('documents', file)`

    This aligns with the backend `FilesInterceptor('documents', 50, ...)` in `batch.controller.ts:42`.

    Both modes now use the same field name `'documents'` which is correct:
    - LIST_MODE appends a single file under `'documents'`
    - PROFILE_MODE appends multiple files under `'documents'` (Multer handles multiple files with the same field name)

    Do NOT change anything else in the file. Do NOT change the backend.
  </action>
  <verify>
    Run: `cd /Users/luanmartins/source/projects/populatte && npm run lint --filter=@populatte/web`
    Run: `cd /Users/luanmartins/source/projects/populatte && npm run type-check --filter=@populatte/web`
    Both must pass. Additionally, visually confirm the two `formData.append` calls now both use `'documents'` as the field name.
  </verify>
  <done>
    Both LIST_MODE and PROFILE_MODE file uploads use field name `'documents'`, matching the backend `FilesInterceptor('documents', ...)`. Lint and type-check pass.
  </done>
</task>

</tasks>

<verification>
1. Grep for old field names to confirm they are gone:
   `grep -n "formData.append('file'" apps/web/components/projects/upload-batch-modal.tsx` should return NO results
   `grep -n "formData.append('files'" apps/web/components/projects/upload-batch-modal.tsx` should return NO results
2. Grep for new field name to confirm it exists:
   `grep -n "formData.append('documents'" apps/web/components/projects/upload-batch-modal.tsx` should return exactly 2 results (one for LIST_MODE, one for PROFILE_MODE)
3. Lint and type-check pass for the web app
</verification>

<success_criteria>
- The string `'file'` and `'files'` no longer appear as FormData field names in upload-batch-modal.tsx
- The string `'documents'` is used as the FormData field name in both LIST_MODE and PROFILE_MODE branches
- `npm run lint --filter=@populatte/web` passes
- `npm run type-check --filter=@populatte/web` passes
</success_criteria>

<output>
After completion, create `.planning/quick/003-fix-file-upload-field-name-mismatch/003-SUMMARY.md`
</output>
