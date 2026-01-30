# Phase 9: File Content Validation - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Magic-byte inspection validates that uploaded files are genuine Excel/ZIP archives before SheetJS processes them. Rejects non-Excel files with a 422 error after Multer buffers but before any parsing. No new file format support — validation gate only.

</domain>

<decisions>
## Implementation Decisions

### Rejection response
- Generic error message: "One or more files are not valid Excel files" — do NOT list individual filenames
- HTTP 422 Unprocessable Entity status code
- Include structured error code (e.g. `INVALID_FILE_TYPE`) for programmatic handling, consistent with Phase 8's error code pattern
- Log validation failures with userId, filenames, and detected bytes — consistent with Phase 8 upload violation logging

### Validation strictness
- Accept both .xlsx (ZIP-based, magic bytes `0x504B0304`) and .xls (OLE2, magic bytes `0xD0CF11E0`)
- Also accept .csv files — validate these with basic UTF-8 text validation (not binary garbage with .csv extension)
- Both extension AND content must match: file extension must be .xlsx/.xls/.csv AND content must pass the corresponding validation check
- A file named "data.pdf" with valid ZIP bytes is rejected — extension mismatch

### Multi-file rejection policy
- Reject entire batch if any file fails validation — consistent with atomic transaction pattern
- Fail-fast on first invalid file — stop checking remaining files once one fails

### Claude's Discretion
- Pipeline position: where in the NestJS pipeline to place validation (pipe, guard, or use case layer)
- Empty file handling: whether to catch 0-byte files here or rely on existing layers
- Exact magic-byte reading implementation details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Pattern should be consistent with Phase 8's MulterExceptionFilter and error code style.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-file-content-validation*
*Context gathered: 2026-01-29*
