# Phase 14: Upload Modal - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

File upload modal for creating batches from Excel files. Users open the modal from the project detail page, select List or Profile mode, add files via drag-and-drop or file picker, see client-side validation feedback, and submit to create a batch. The modal connects to the useUploadBatch hook and FormData-capable API client built in Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Mode selector
- Side-by-side card selector for List Mode vs Profile Mode
- No default selection — user must explicitly pick a mode before proceeding
- Use-case descriptions on the cards (e.g., "Upload a spreadsheet of clients" / "Upload individual client files") rather than technical explanations
- File upload area is hidden until a mode is selected — step-by-step flow, keeps the modal clean

### Drag-and-drop zone
- Solid subtle box style (background-colored, rounded corners, upload icon, helper text) — not dashed border
- Full overlay effect on dragover — colored background shift with prominent "drop here" message
- After file selection, file list appears below the drop zone (name, size, remove button) — drop zone stays visible for adding more files
- In List Mode (single file), dropping a second file replaces the first — simple and forgiving

### Validation & error feedback
- Only .xlsx files accepted — no .xls or .csv
- Invalid files are rejected via toast notification (not added to the file list)
- Toast messages suggest the accepted format (e.g., "Formato invalido. Use arquivos .xlsx")
- Submit button is disabled until a mode is selected and at least one valid file is present — prevents bad submissions entirely

### Upload flow & progress
- Modal stays open with a loading spinner on the submit button during upload — user sees the modal but cannot interact with the form
- On success: modal closes automatically, success toast appears, batch list refreshes to show the new batch
- On failure: error toast appears, modal stays open with form intact so user can retry without re-selecting files
- Modal closing is blocked during upload (Escape and close button disabled) — prevents accidental cancellation

### Claude's Discretion
- Exact upload icon and illustration choices
- Spinner style and animation
- Toast message exact wording (beyond the format guidance above)
- Mode card icon choices
- Exact spacing, sizing, and responsive behavior of the modal

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-upload-modal*
*Context gathered: 2026-01-30*
