---
phase: quick-004
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/src/infrastructure/excel/helpers/cell-access.helper.ts
  - apps/api/src/infrastructure/excel/ingestion.service.ts
autonomous: true

must_haves:
  truths:
    - "Column headers in batch metadata display actual Excel header names (e.g., Name, Email) not column letters (A, B, C)"
    - "Row data keys match the normalizedKey in columnMetadata so table cells display correct values"
    - "Data table in the dashboard renders both headers and row values correctly"
  artifacts:
    - path: "apps/api/src/infrastructure/excel/helpers/cell-access.helper.ts"
      provides: "buildTypeMap that uses header names as keys in column mode"
      contains: "header names from first row used as keys"
    - path: "apps/api/src/infrastructure/excel/ingestion.service.ts"
      provides: "buildColumnMetadata that produces correct originalHeader and normalizedKey"
  key_links:
    - from: "cell-access.helper.ts buildTypeMap"
      to: "ingestion.service.ts buildColumnMetadata"
      via: "typeMap keys become columnMetadata originalHeader and normalizedKey"
      pattern: "typeMap.*key.*originalHeader"
    - from: "ingestion.service.ts columnMetadata normalizedKey"
      to: "list-mode.strategy.ts row.data keys"
      via: "both must use the same header string as key"
      pattern: "normalizedKey.*data\\["
---

<objective>
Fix the mismatch between columnMetadata keys and row data keys that causes the dashboard data table to show empty cells with generic column letters (A, B, C) instead of actual Excel header names and values.

Purpose: The batch data table is unusable because columnMetadata stores Excel column letters (A, B, C) as keys while row data stores actual header names (Name, Email) as keys from SheetJS sheet_to_json(). This key mismatch means the frontend cannot look up row values by normalizedKey.

Output: columnMetadata will contain actual header names as both originalHeader and normalizedKey, matching the keys in row.data produced by ListModeStrategy.
</objective>

<execution_context>
@/Users/luanmartins/.claude/get-shit-done/workflows/execute-plan.md
@/Users/luanmartins/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
## Root Cause Analysis

The bug is a key mismatch between two data structures that must agree:

1. **Row data keys** (produced by `ListModeStrategy.parse()`):
   - Uses `XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })` which by default treats the first row as headers
   - Produces rows like `{ "Name": "John", "Email": "john@example.com" }`
   - Keys are the actual header strings from row 1

2. **Column metadata keys** (produced by `CellAccessHelper.buildTypeMap()` in column mode):
   - Iterates ALL cells including the header row
   - Uses `XLSX.utils.encode_col(C)` to create keys like "A", "B", "C"
   - These column letters become `originalHeader` and `normalizedKey` in `IngestionService.buildColumnMetadata()`

3. **Frontend lookup** (`batch-data-table.tsx`):
   - Reads `col.normalizedKey` from columnMetadata (currently "A", "B", "C")
   - Uses `row.data[col.normalizedKey]` to get cell values
   - Since row.data has keys "Name", "Email" but metadata has "A", "B", the lookup returns undefined

**The fix:** Change `buildTypeMap` in column mode to use the actual header names from the first row as keys instead of column letters. This way the typeMap keys, which flow through to columnMetadata originalHeader/normalizedKey, will match the row data keys produced by sheet_to_json().

## Key Files

@apps/api/src/infrastructure/excel/helpers/cell-access.helper.ts
@apps/api/src/infrastructure/excel/ingestion.service.ts
@apps/api/src/infrastructure/excel/strategies/list-mode.strategy.ts
@apps/api/src/core/entities/batch.entity.ts
@apps/web/components/projects/batch-data-table.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix buildTypeMap to use header names as keys in column mode</name>
  <files>apps/api/src/infrastructure/excel/helpers/cell-access.helper.ts</files>
  <action>
Modify the `buildTypeMap` method in `CellAccessHelper` so that in `column` mode it uses the actual header names from the first row (row index `range.s.r`) as keys instead of Excel column letters.

The fix:
1. When `mode === 'column'`, first read the header row (row at `range.s.r`) to build a mapping from column index to header name. For each column C in the range, get the cell at `{r: range.s.r, c: C}`, read its string value (cell.v or cell.w), and store it as the header name for that column index.
2. When iterating data rows (skip the header row, start from `range.s.r + 1`), use the header name from step 1 as the key instead of `XLSX.utils.encode_col(C)`.
3. If a header cell is empty or missing, fall back to the column letter (`XLSX.utils.encode_col(C)`) to avoid crashes.
4. Keep the `cell` mode behavior unchanged (it uses cell addresses, not headers).

The updated column mode logic should look approximately like:

```typescript
if (mode === 'column') {
  // Build header map from first row
  const headerMap: Record<number, string> = {};
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
    const headerCell = (sheet as Record<string, XLSX.CellObject | undefined>)[headerAddress];
    const headerValue = headerCell?.v ?? headerCell?.w;
    headerMap[C] = headerValue !== undefined && headerValue !== null
      ? String(headerValue)
      : XLSX.utils.encode_col(C);
  }

  // Iterate data rows only (skip header)
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      const type = this.getCellType(sheet, address);
      const headerName = headerMap[C] ?? XLSX.utils.encode_col(C);
      if (!typeMap[headerName] && type !== CellType.Empty) {
        typeMap[headerName] = type;
      }
    }
  }
} else {
  // cell mode: iterate all cells as before
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      const type = this.getCellType(sheet, address);
      typeMap[address] = type;
    }
  }
}
```

Important: The `noUncheckedIndexedAccess` TypeScript strict mode is enabled. When accessing `headerMap[C]`, use the nullish coalescing operator (`??`) to provide a fallback. Cast `sheet` similarly to how `getCellValue` and `getCellType` already do it in this file.

Do NOT change the `getCellValue` or `getCellType` methods. Only modify `buildTypeMap`.
  </action>
  <verify>
Run `npm run build --filter=@populatte/api` to confirm TypeScript compilation succeeds. Run `npm run lint --filter=@populatte/api` to confirm no lint errors. Run `npm run test --filter=@populatte/api` to confirm existing tests pass.
  </verify>
  <done>
buildTypeMap in column mode returns a CellTypeMap whose keys are the actual header names from the first row of the spreadsheet (e.g., "Name", "Email") rather than column letters (A, B, C). The cell mode behavior remains unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify ingestion.service buildColumnMetadata produces correct metadata and validate end-to-end</name>
  <files>apps/api/src/infrastructure/excel/ingestion.service.ts</files>
  <action>
Review `buildColumnMetadata` in `IngestionService` (lines 137-146). With the Task 1 fix, the `typeMap` keys flowing into this method will now be header names like "Name", "Email" instead of "A", "B". The current implementation already uses the key as both `originalHeader` and `normalizedKey`:

```typescript
private buildColumnMetadata(typeMap: Record<string, CellType>): ColumnMetadata[] {
  return Object.entries(typeMap).map(([key, inferredType], index) => ({
    originalHeader: key,
    normalizedKey: key,
    position: index,
  }));
}
```

This should now work correctly because:
- `key` will be "Name" (the actual header) instead of "A"
- `originalHeader: "Name"` is what the frontend renders as the column header
- `normalizedKey: "Name"` is what the frontend uses to look up `row.data["Name"]`
- And the row data from ListModeStrategy already has keys like `{ "Name": "John" }`

However, there is a potential issue: if headers contain characters that could cause problems or if headers are duplicated. For robustness, update `buildColumnMetadata` to:

1. Trim whitespace from the key before using it as `originalHeader` and `normalizedKey` (headers with trailing spaces would silently break lookups).
2. Keep `normalizedKey` identical to the key as-is (after trim) because `sheet_to_json` also trims header values by default.

The updated method:

```typescript
private buildColumnMetadata(
  typeMap: Record<string, CellType>,
): ColumnMetadata[] {
  return Object.entries(typeMap).map(([key, inferredType], index) => ({
    originalHeader: key.trim(),
    normalizedKey: key.trim(),
    inferredType,
    position: index,
  }));
}
```

This is a minimal change. Do NOT refactor the method signature, add new parameters, or change any other methods in IngestionService.

After making the change, run the full test suite and build to confirm nothing is broken.
  </action>
  <verify>
Run `npm run build --filter=@populatte/api` to confirm TypeScript compilation succeeds. Run `npm run test --filter=@populatte/api` to confirm all tests pass. If the dev server is running, upload a test Excel file with known headers (e.g., "Name", "Email") and verify the API response for the batch shows columnMetadata with `originalHeader: "Name"` and `normalizedKey: "Name"` instead of "A" and "B".
  </verify>
  <done>
buildColumnMetadata produces ColumnMetadata entries where originalHeader and normalizedKey contain the actual header strings from the Excel file (trimmed). The frontend data table at batch-data-table.tsx will now correctly: (1) display "Name", "Email" as column headers via col.originalHeader, and (2) look up row values via row.data[col.normalizedKey] successfully because the keys match.
  </done>
</task>

</tasks>

<verification>
1. `npm run build --filter=@populatte/api` passes with no TypeScript errors
2. `npm run lint --filter=@populatte/api` passes with no lint errors
3. `npm run test --filter=@populatte/api` all existing tests pass
4. Upload an Excel file with headers "Name" and "Email" via the dashboard
5. The batch detail page shows "Name" and "Email" as table column headers (not "A" and "B")
6. The table rows display the actual data values under the correct columns (not empty cells)
</verification>

<success_criteria>
- Column metadata originalHeader and normalizedKey contain actual Excel header names
- Row data keys match columnMetadata normalizedKey values
- Dashboard data table renders headers and cell values correctly
- No regressions in existing tests or build
</success_criteria>

<output>
After completion, create `.planning/quick/004-fix-empty-data-table-and-column-metadata/004-SUMMARY.md`
</output>
