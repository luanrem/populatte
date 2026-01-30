---
phase: 02-transaction-excel-parsing
plan: 02
subsystem: infrastructure/excel-parsing
tags: [sheetjs, excel, list-mode, profile-mode, strategy-pattern, nestjs-module]
requires:
  - 02-01: ParsedRow/ParseResult types, ExcelParsingStrategy interface, CellAccessHelper
  - 02-01: Symbol DI tokens (LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY)
provides:
  - ListModeStrategy: Header-based Excel parsing for single files
  - ProfileModeStrategy: Cell-address Excel parsing for multiple files
  - ExcelModule: NestJS module registering both strategies with Symbol tokens
affects:
  - 03-XX: IngestionModule will import ExcelModule and inject strategies
  - 03-XX: Use cases will select strategy based on BatchMode enum
tech-stack:
  added: []
  patterns:
    - Strategy Pattern with Symbol-based DI for Excel parsing modes
    - sheet_to_json for ListMode (automatic header extraction)
    - Manual cell iteration for ProfileMode (lossless cell-address keys)
key-files:
  created:
    - apps/api/src/infrastructure/excel/strategies/list-mode.strategy.ts
    - apps/api/src/infrastructure/excel/strategies/profile-mode.strategy.ts
    - apps/api/src/infrastructure/excel/excel.module.ts
  modified: []
key-decisions:
  - decision: ListModeStrategy uses sheet_to_json with defval null and raw false
    rationale: Automatic header extraction, null normalization, preserves date display format
    alternatives: [Manual iteration like ProfileMode]
    outcome: Simple, leverages SheetJS built-in functionality, consistent null handling
  - decision: ProfileModeStrategy iterates all cells manually with cell-address keys
    rationale: Lossless flattening per CONTEXT.md; Key-Value heuristic deferred
    alternatives: [Smart key inference from A1/B1 pattern]
    outcome: Simple, predictable, enables extension to support key prefixes later
  - decision: Each sheet becomes separate ParsedRow in ProfileMode
    rationale: Simplest approach per 02-RESEARCH.md Open Question 1
    alternatives: [Combine sheets with Sheet1!A1 prefixed keys]
    outcome: Clean separation, supports multi-sheet workbooks naturally
  - decision: Both strategies skip empty sheets and continue processing
    rationale: Tolerant of real-world Excel files with blank sheets
    alternatives: [Throw error on empty sheet]
    outcome: Flexible, logs warning if needed, doesn't block valid data
  - decision: ExcelModule not registered in AppModule yet
    rationale: Strategies consumed by IngestionModule in Phase 3
    alternatives: [Register globally in AppModule now]
    outcome: Clean dependency - Phase 3 controls when parsing is available
metrics:
  duration: 2m 46s
  completed: 2026-01-29
---

# Phase 2 Plan 2: Excel Parsing Strategies Implementation Summary

**One-liner:** ListModeStrategy (header-based) and ProfileModeStrategy (cell-address) complete with SheetJS integration, null normalization, date handling, and ExcelModule registration via Symbol tokens ready for Phase 3 ingestion service.

## Performance

**Execution time:** 2 minutes 46 seconds
**Tasks completed:** 2/2 (100%)
**Commits:** 2 atomic commits

**Velocity:**
- Task 1 (Strategy implementations): ~2m 0s
- Task 2 (ExcelModule): ~46s

## What We Accomplished

### ListModeStrategy (Header-based parsing)

- **Single file validation:** Throws error if file count is not exactly 1
- **Header extraction:** Uses `XLSX.utils.sheet_to_json()` with first row as headers
- **Null normalization:** `defval: null` ensures empty cells become null (key present)
- **Date preservation:** `raw: false` keeps original Excel display format
- **Multi-sheet support:** Processes all sheets, merges type maps
- **Row indexing:** Maps JSON index to Excel row number (i + 2 for header skip)
- **Empty sheet handling:** Skips sheets with no data rows (header-only sheets)
- **Type map:** Column-based type map using `CellAccessHelper.buildTypeMap(sheet, 'column')`
- **Validation:** Throws error if zero data rows across all sheets

### ProfileModeStrategy (Cell-address parsing)

- **Multi-file validation:** Throws error if file count is less than 1
- **Cell-address keys:** Manual iteration builds `{ A1: value, B2: value }` objects
- **Null normalization:** Explicit check for undefined values, converts to null
- **Date handling:** `cellDates: true` ensures dates are Date objects
- **Multi-sheet per file:** Each sheet becomes separate ParsedRow
- **Row indexing:** Always 1 (single logical row per sheet in profile mode)
- **Type map:** Cell-based type map using `CellAccessHelper.buildTypeMap(sheet, 'cell')`
- **Filename traceability:** Sets `sourceFileName` from `ExcelFileInput.originalName`

### ExcelModule (DI Registration)

- **Symbol-based providers:** LIST_MODE_STRATEGY and PROFILE_MODE_STRATEGY tokens
- **Strategy registration:** `provide: <Symbol>, useClass: <Strategy>` pattern
- **Exports:** Both strategies available for injection in other modules
- **No @Global():** Explicit imports required (controlled scope)
- **No AppModule registration:** Deferred to Phase 3 IngestionModule consumption

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | fdf69ec | Implement ListModeStrategy and ProfileModeStrategy with SheetJS parsing |
| 2 | cc84a1b | Create ExcelModule with Symbol-based DI registration |

## Files Created

**Strategy implementations (2 files):**
- `apps/api/src/infrastructure/excel/strategies/list-mode.strategy.ts` - Header-based parsing
- `apps/api/src/infrastructure/excel/strategies/profile-mode.strategy.ts` - Cell-address parsing

**NestJS module (1 file):**
- `apps/api/src/infrastructure/excel/excel.module.ts` - Symbol-based strategy registration

## Files Modified

None - all new files.

## Decisions Made

**1. ListModeStrategy uses sheet_to_json with defval: null and raw: false**
- Automatic header extraction from first row
- `defval: null` ensures empty cells are keys with null value (consistent shape)
- `raw: false` preserves Excel date display format (per CONTEXT.md decision)
- Alternative: Manual cell iteration (rejected - sheet_to_json is simpler and sufficient)

**2. ProfileModeStrategy iterates cells manually with cell-address keys**
- Lossless flattening per CONTEXT.md design
- Cell-address keys (A1, B2) enable exact reconstruction
- Key-Value heuristic (detecting A1=key, B1=value pattern) deferred per CONTEXT.md
- Alternative: Smart key inference (rejected - CONTEXT.md explicitly deferred this)

**3. Each sheet becomes separate ParsedRow in ProfileMode**
- Simplest approach per 02-RESEARCH.md Open Question 1
- Supports multi-sheet workbooks naturally
- Alternative: Combine sheets with Sheet1!A1 prefixed keys (rejected - more complex, no current requirement)

**4. Both strategies skip empty sheets and continue processing**
- Tolerant of real-world Excel files with blank sheets
- Continues processing other sheets instead of failing entire file
- Alternative: Throw error on empty sheet (rejected - too strict for MVP)

**5. ExcelModule not registered in AppModule yet**
- Strategies consumed by IngestionModule in Phase 3
- Clean dependency: Phase 3 controls when parsing is available
- Alternative: Register globally now (rejected - unnecessary until Phase 3)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Issue 1: TypeScript error on mergedTypeMap type**
- **Problem:** Initially declared `mergedTypeMap` as `Record<string, string>` instead of `CellTypeMap`
- **Detection:** TypeScript compilation failed with type mismatch on return statement
- **Fix:** Changed declaration to `CellTypeMap` (which is `Record<string, CellType>`)
- **Resolution time:** ~30 seconds (caught immediately by strict TypeScript)
- **Rule applied:** Rule 1 (Auto-fix bug) - type error preventing compilation

## Next Phase Readiness

**Ready for Phase 3 (Ingestion Use Case):**
- ExcelModule exports both strategies via Symbol tokens
- IngestionModule can import ExcelModule and inject strategies
- Use cases can select strategy based on `batch.mode` field:
  ```typescript
  @Inject(LIST_MODE_STRATEGY) private listStrategy: ExcelParsingStrategy
  @Inject(PROFILE_MODE_STRATEGY) private profileStrategy: ExcelParsingStrategy

  const strategy = batch.mode === BatchMode.ListMode ? this.listStrategy : this.profileStrategy;
  const result = strategy.parse(files);
  ```
- ParseResult provides normalized rows for `RowRepository.createMany()`
- TypeMap ready for storing in `batch.columnMetadata` field

**Validation coverage:**
- ListModeStrategy file count validation: throws "List mode requires exactly 1 file"
- ProfileModeStrategy file count validation: throws "Profile mode requires at least 1 file"
- ListModeStrategy empty data validation: throws "No data rows found in any sheet"

**Type safety:**
- Both strategies implement ExcelParsingStrategy interface
- Return type is ParseResult (rows + typeMap)
- TypeScript strict mode compatibility verified
- NestJS build succeeds

**Blockers/Concerns:**
- None - all success criteria met

**Testing notes:**
- Strategies not tested with real Excel files yet (unit tests in Phase 3)
- Date format handling should be tested with various Excel date formats
- Multi-sheet handling should be tested with workbooks containing mixed headers

## Lessons Learned

**What worked well:**
1. sheet_to_json dramatically simplified ListModeStrategy - automatic header extraction
2. CellAccessHelper reuse prevented duplicate type-safe cell access logic
3. Symbol-based DI tokens prevent provider naming collisions (Pitfall 12 avoided)
4. Separate strategies for each mode enforces Single Responsibility Principle

**What to apply next:**
1. Strategy selection logic in IngestionModule should use factory pattern or strategy resolver
2. Type map merging across sheets may need conflict resolution (e.g., column A is string in sheet1, number in sheet2)
3. Real Excel files with edge cases (merged cells, formulas, errors) should be tested

**Technical insights:**
- SheetJS `raw: false` is critical for date display preservation (02-CONTEXT.md decision)
- ProfileMode manual iteration gives full control over key naming (enables future Sheet1!A1 prefix support)
- TypeScript caught type mismatch immediately - strict mode enforces correctness
- Each sheet as separate row in ProfileMode simplifies logic (no need to detect/merge sheets)

---

**Phase:** 02-transaction-excel-parsing
**Plan:** 02 of 2
**Status:** Complete
**Next:** Phase 3 - Ingestion Use Case and Batch Operations
