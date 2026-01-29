---
phase: 02-transaction-excel-parsing
plan: 01
subsystem: infrastructure/transaction-excel
tags: [nestjs-cls, transactional, drizzle-adapter, sheetjs, excel-parsing, type-system]
requires:
  - 01-01: Batch and Row entities
  - 01-02: DrizzleService and repository layer
provides:
  - CLS-based transaction infrastructure with Drizzle adapter
  - TransactionModule with @Transactional() decorator support
  - SheetJS 0.20.3 from CDN for Excel parsing
  - ParsedRow/ParseResult type system
  - CellAccessHelper for type-safe SheetJS access
  - ExcelParsingStrategy interface
  - Symbol-based DI tokens for ListMode and ProfileMode strategies
affects:
  - 02-02: Strategies will implement ExcelParsingStrategy interface
  - 03-XX: Use cases will use @Transactional() for atomic batch operations
tech-stack:
  added:
    - nestjs-cls@6.2.0
    - "@nestjs-cls/transactional@3.2.0"
    - "@nestjs-cls/transactional-adapter-drizzle-orm@1.2.3"
    - xlsx@0.20.3 (from CDN)
  patterns:
    - CLS AsyncLocalStorage for transaction propagation
    - Symbol-based DI tokens for strategy pattern
    - Factory provider pattern for Drizzle client token
key-files:
  created:
    - apps/api/src/infrastructure/transaction/transaction.module.ts
    - apps/api/src/infrastructure/excel/types/parsed-row.ts
    - apps/api/src/infrastructure/excel/types/cell-type-map.ts
    - apps/api/src/infrastructure/excel/helpers/cell-access.helper.ts
    - apps/api/src/infrastructure/excel/strategies/excel-parsing.strategy.ts
    - apps/api/src/infrastructure/excel/excel.constants.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/package.json
    - apps/api/pnpm-lock.yaml
key-decisions:
  - decision: Use Symbol token DRIZZLE_CLIENT via factory provider for transaction adapter
    rationale: Existing DrizzleService is class-based provider; factory extracts raw client for adapter
    alternatives: [Modify DrizzleService to expose Symbol token directly]
    outcome: Clean separation - TransactionModule doesn't modify existing infrastructure
  - decision: SheetJS installed from CDN URL (https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz)
    rationale: npm registry version 0.18.5 has Prototype Pollution CVE; CDN is authoritative source
    alternatives: [npm registry version with known vulnerability]
    outcome: pnpm --frozen-lockfile works reliably; Pitfall 2 validated as non-issue
  - decision: ParsedRow includes sourceFileName as top-level field
    rationale: Strategies need original filename for traceability; ProfileMode handles multiple files
    alternatives: [Embed filename in data JSONB]
    outcome: Clean typed field, queryable, consistent with rowIndex/sheetName pattern
  - decision: CellAccessHelper uses type assertions for strict TypeScript compatibility
    rationale: SheetJS WorkSheet type lacks index signature; noUncheckedIndexedAccess safety
    alternatives: [Modify SheetJS types, disable strict mode]
    outcome: Works in strict mode without modifying external types
  - decision: ExcelFileInput interface for strategy contract
    rationale: Strategies need both buffer and originalName; matches Multer file shape
    alternatives: [Pass separate arrays of buffers and names]
    outcome: Type-safe, prevents buffer/name mismatch bugs
metrics:
  duration: 3m 26s
  completed: 2026-01-29
---

# Phase 2 Plan 1: Transaction and Excel Parsing Foundation Summary

**One-liner:** CLS-based atomic transactions with Drizzle adapter and SheetJS 0.20.3 from CDN, plus complete Excel parsing type system (ParsedRow, CellTypeMap, CellAccessHelper) and strategy interface ready for ListMode/ProfileMode implementations.

## Performance

**Execution time:** 3 minutes 26 seconds
**Tasks completed:** 2/2 (100%)
**Commits:** 2 atomic commits

**Velocity:**
- Task 1 (Dependencies + TransactionModule): ~1m 45s
- Task 2 (Excel types + helpers + interfaces): ~1m 41s

## What We Accomplished

### Transaction Infrastructure
- Installed `nestjs-cls`, `@nestjs-cls/transactional`, and Drizzle adapter
- Created `TransactionModule` with `ClsModule.forRoot()` configuration
- Registered `DRIZZLE_CLIENT` Symbol token via factory provider pattern
- Imported `TransactionModule` in `AppModule` (after DrizzleModule)
- `@Transactional()` decorator now ready for use case methods
- Supports 7 propagation modes (Required, RequiresNew, Mandatory, Never, NotSupported, Supports, Nested)

### SheetJS Installation
- Installed SheetJS 0.20.3 from CDN (https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz)
- Validated pnpm --frozen-lockfile stability with CDN packages (Pitfall 2 - confirmed stable)
- Avoided npm registry version 0.18.5 with Prototype Pollution CVE

### Excel Parsing Type System
- **ParsedRow interface:** rowIndex, sheetName, sourceFileName, data fields
- **ParseResult interface:** rows array + typeMap for batch entity
- **CellType enum:** String, Number, Boolean, Date, Error, Empty (6 SheetJS types)
- **CellTypeMap type alias:** Record<string, CellType> for column/cell type tracking

### Type-Safe Helper Infrastructure
- **CellAccessHelper class:**
  - `getCellValue()`: Type-safe cell access with null handling for strict mode
  - `getCellType()`: Maps SheetJS cell.t to CellType enum (handles date format detection)
  - `buildTypeMap()`: Builds column or cell type maps for batch metadata
- Uses `import * as XLSX from 'xlsx'` pattern (ESM/CJS compatibility)
- Type assertions for WorkSheet index access (noUncheckedIndexedAccess safety)

### Strategy Pattern Foundation
- **ExcelParsingStrategy interface:** parse() and validateFileCount() contracts
- **ExcelFileInput interface:** buffer + originalName for filename traceability
- **Symbol-based DI tokens:** LIST_MODE_STRATEGY and PROFILE_MODE_STRATEGY
- Prevents naming collisions and silent provider overwrites (Pitfall 12 avoided)

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 07f0682 | Install dependencies, create TransactionModule, register in AppModule |
| 2 | aed4c96 | Create ParsedRow/CellType types, CellAccessHelper, ExcelParsingStrategy interface, DI tokens |

## Files Created

**Transaction infrastructure (1 file):**
- `apps/api/src/infrastructure/transaction/transaction.module.ts` - CLS + Drizzle adapter config

**Excel parsing types (3 files):**
- `apps/api/src/infrastructure/excel/types/parsed-row.ts` - ParsedRow and ParseResult interfaces
- `apps/api/src/infrastructure/excel/types/cell-type-map.ts` - CellType enum and CellTypeMap alias
- `apps/api/src/infrastructure/excel/types/index.ts` - Barrel export

**Excel parsing helpers (1 file):**
- `apps/api/src/infrastructure/excel/helpers/cell-access.helper.ts` - Type-safe SheetJS access

**Strategy infrastructure (2 files):**
- `apps/api/src/infrastructure/excel/strategies/excel-parsing.strategy.ts` - Strategy interface
- `apps/api/src/infrastructure/excel/excel.constants.ts` - Symbol DI tokens

## Files Modified

- `apps/api/src/app.module.ts` - Import TransactionModule after DrizzleModule
- `apps/api/package.json` - Add nestjs-cls, transactional packages, xlsx from CDN
- `apps/api/pnpm-lock.yaml` - Lock CDN package versions

## Decisions Made

**1. DRIZZLE_CLIENT Symbol token via factory provider**
- Existing DrizzleService is class-based; adapter needs raw Drizzle client
- Factory provider extracts client: `useFactory: (drizzle) => drizzle.getClient()`
- Clean separation - no modifications to existing DrizzleModule
- Alternative: Modify DrizzleService to expose Symbol token directly (rejected - violates Open/Closed)

**2. SheetJS from CDN only**
- npm registry 0.18.5 has Prototype Pollution CVE
- CDN is authoritative source per SheetJS documentation
- pnpm --frozen-lockfile validated as stable (Pitfall 2 confirmed non-issue)
- Alternative: npm registry with vulnerability scanner exception (rejected - unnecessary risk)

**3. ParsedRow includes sourceFileName as top-level field**
- Strategies need filename for traceability (especially ProfileMode with multiple files)
- Consistent with rowIndex and sheetName as typed fields (not in JSONB)
- Queryable, typed, clean separation from user data
- Alternative: Embed in data JSONB (rejected - loses type safety and queryability)

**4. CellAccessHelper with type assertions**
- SheetJS WorkSheet type lacks index signature
- Type assertion `(sheet as Record<string, XLSX.CellObject | undefined>)[address]` for strict mode
- Handles undefined gracefully, returns null for empty cells
- Alternative: Modify SheetJS types (rejected - external dependency), disable strict mode (rejected - codebase standard)

**5. ExcelFileInput interface for strategy contract**
- Strategies receive `{ buffer, originalName }[]` instead of just `Buffer[]`
- Matches Multer file shape, prevents buffer/name array mismatch bugs
- Type-safe contract enforced by interface
- Alternative: Separate arrays (rejected - parallel array anti-pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready for Phase 2 Plan 2 (Strategy Implementations):**
- ParsedRow/ParseResult interfaces ready for ListMode and ProfileMode strategies
- ExcelParsingStrategy interface defines parse() and validateFileCount() contracts
- Symbol DI tokens ready for NestJS module registration
- CellAccessHelper ready for strategies to use in sheet parsing
- SheetJS 0.20.3 available for `XLSX.read(buffer)` and `sheet_to_json()`

**Ready for Phase 3 (Use Cases):**
- @Transactional() decorator ready for IngestBatchUseCase
- Automatic commit/rollback on success/error
- Transaction propagation modes available (default: Required)
- TypeScript compilation passes
- NestJS build succeeds

**Blockers/Concerns:**
- None - all success criteria met
- Pitfall 2 (pnpm lockfile stability) validated as stable
- Pitfall 8 (Drizzle token mismatch) avoided via Symbol token + factory provider

**Test coverage:**
- Not applicable for this plan (infrastructure setup)
- Strategy implementations in 02-02 will include parsing tests
- Transaction behavior will be tested in Phase 3 use cases

## Lessons Learned

**What worked well:**
1. Factory provider pattern cleanly integrated transaction adapter without modifying existing DrizzleService
2. Symbol tokens prevent DI naming collisions - explicit and type-safe
3. Type assertions in CellAccessHelper provide strict mode safety without external type modifications
4. pnpm CDN package installation is stable - Pitfall 2 concern was unfounded

**What to apply next:**
1. Use ExcelFileInput interface consistently in strategy implementations (02-02)
2. CellAccessHelper methods should be tested with real Excel files (dates, formats, merged cells)
3. Transaction decorator usage pattern should be documented with propagation mode examples

**Technical insights:**
- ClsPluginTransactional uses AsyncLocalStorage (Node.js native) - no polyfill needed
- SheetJS SSF.is_date() detects dates from number format codes - essential for CellType.Date accuracy
- ParseResult pattern (rows + typeMap) enables batch entity to store metadata separately from row data

---

**Phase:** 02-transaction-excel-parsing
**Plan:** 01 of 2
**Status:** Complete
**Next:** Implement ListModeStrategy and ProfileModeStrategy (02-02)
