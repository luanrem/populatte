# Domain Pitfalls: v2.0 Data Ingestion Engine

**Domain:** Excel file upload, parsing, normalization, and batch storage
**Researched:** 2026-01-29
**Confidence:** HIGH (verified against SheetJS docs, Drizzle ORM docs, Multer CVEs, PostgreSQL documentation, NestJS official docs)

---

## Critical Pitfalls

Mistakes that cause data corruption, security vulnerabilities, or require rewrites.

---

### Pitfall 1: SheetJS npm Registry Installs Vulnerable, Outdated Version

**What goes wrong:** Running `npm install xlsx` or `pnpm add xlsx` installs version 0.18.5 from the public npm registry, which contains known CVEs including Prototype Pollution (CVE-2023-30533) and Denial of Service vulnerabilities. The current version (0.20.3) is only available from the SheetJS CDN.

**Why it happens:** SheetJS stopped publishing to npm after version 0.18.5. The authoritative source is `https://cdn.sheetjs.com/`. Developers who install via standard package manager commands get a version that is years behind with unpatched security vulnerabilities.

**Consequences:**
- Prototype Pollution: Malicious `.xlsx` files can inject properties like `__proto__` into parsed objects, potentially leading to Remote Code Execution
- DoS: Specially crafted files can exhaust memory or CPU, crashing the server
- Security audit failures: npm audit will flag the outdated version

**Prevention:**
1. Install exclusively from the SheetJS CDN:
   ```bash
   pnpm add xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
   ```
2. Do NOT install `@types/xlsx` -- type definitions are bundled at `types/index.d.ts` in the CDN package
3. Consider vendoring the tarball locally for build stability (SheetJS recommends this)
4. If a transitive dependency pulls `xlsx` from npm, use `overrides` in `package.json`:
   ```json
   "pnpm": {
     "overrides": {
       "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
     }
   }
   ```

**Detection:**
- `pnpm list xlsx` shows version 0.18.5 instead of 0.20.3
- `npm audit` or `pnpm audit` reports Prototype Pollution vulnerability
- Runtime: parsed objects have unexpected `__proto__` or `constructor` properties

**Confidence:** HIGH -- verified against [SheetJS CDN migration page](https://cdn.sheetjs.com/xlsx/) and [SheetJS NodeJS installation docs](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)

---

### Pitfall 2: pnpm Lockfile Corruption with CDN Tarball URLs

**What goes wrong:** After installing SheetJS from the CDN tarball URL, running `pnpm install --fix-lockfile` throws "Cannot read properties of undefined (reading '0')". The lockfile becomes corrupted or inconsistent, breaking CI/CD builds.

**Why it happens:** pnpm's lockfile system expects standard registry-based resolution. When a package is installed from a direct tarball URL (like `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), the integrity hash calculation and resolution tracking work differently. This is a known pnpm bug ([pnpm#7368](https://github.com/pnpm/pnpm/issues/7368)).

**Consequences:**
- CI builds fail intermittently with cryptic lockfile errors
- Team members get different dependency resolutions
- `pnpm install` works locally but fails in Docker builds

**Prevention:**
1. After adding SheetJS, commit the lockfile immediately and test `pnpm install --frozen-lockfile` in a clean environment
2. Avoid running `pnpm install --fix-lockfile` after adding CDN-sourced packages
3. If lockfile corruption occurs, delete `pnpm-lock.yaml` and `node_modules`, then reinstall
4. Consider vendoring the tarball into the repo (e.g., `vendor/xlsx-0.20.3.tgz`) and installing from the local path instead:
   ```bash
   pnpm add xlsx@file:../../vendor/xlsx-0.20.3.tgz
   ```

**Detection:**
- CI pipeline fails with lockfile-related errors
- `pnpm install --frozen-lockfile` fails despite no dependency changes
- Different team members report different installed versions

**Confidence:** MEDIUM -- confirmed via [pnpm issue #7368](https://github.com/pnpm/pnpm/issues/7368), but may be resolved in newer pnpm versions

---

### Pitfall 3: Multer MIME Type Validation is Completely Bypassable

**What goes wrong:** Using Multer's `fileFilter` to check `file.mimetype` against an allowlist (e.g., `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) provides zero actual security. Attackers rename malicious files to `.xlsx` and set the MIME type header to match -- Multer accepts them without inspecting file content.

**Why it happens:** Multer explicitly does NOT validate actual file content. The `file.mimetype` field is provided by the client's `Content-Type` header, which is trivially spoofable. SheetJS maintainers and the Multer maintainers both defer content validation responsibility to the application developer.

**Consequences:**
- Malicious files (scripts, executables, polyglot files) pass upload validation
- If files are stored and served back to users, Stored XSS or arbitrary code execution is possible
- A crafted ZIP archive disguised as `.xlsx` can trigger path traversal during parsing

**Prevention:**
1. Validate file content by inspecting magic bytes AFTER upload, BEFORE parsing:
   ```typescript
   // XLSX files are ZIP archives starting with PK signature (0x504B)
   private validateExcelMagicBytes(buffer: Buffer): boolean {
     if (buffer.length < 4) return false;
     // ZIP magic number: PK\x03\x04
     return buffer[0] === 0x50 && buffer[1] === 0x4B
       && buffer[2] === 0x03 && buffer[3] === 0x04;
   }
   ```
2. Use the `file-type` npm package for more robust content detection (reads magic bytes from buffer)
3. Wrap SheetJS `read()` in try-catch -- if it fails to parse, the file is not valid Excel
4. Use Multer's `fileFilter` as a FIRST line of defense (reject obviously wrong extensions), but never as the ONLY defense
5. Never store uploaded files with user-provided filenames -- generate UUIDs

**Detection:**
- Penetration testing reveals file upload bypass
- SheetJS throws parse errors on uploaded files that passed validation
- Unexpected file types appear in storage

**Confidence:** HIGH -- verified against [Multer file-type validation analysis](https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l) and [file upload security research paper](https://openreview.net/pdf?id=thJGSQcS5y)

---

### Pitfall 4: Memory Exhaustion from Concurrent File Uploads with memoryStorage

**What goes wrong:** Using `multer.memoryStorage()` with 50 files per request (each up to 5MB) means a single request can consume up to 250MB of RAM. Three concurrent requests = 750MB. Under load, Node.js runs out of memory and crashes.

**Why it happens:** Memory storage loads the ENTIRE file into a `Buffer` in RAM before any processing begins. The buffer stays allocated until the request handler completes and garbage collection runs. With multiple concurrent uploads, memory consumption multiplies rapidly.

**Consequences:**
- Node.js process crashes with `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`
- Server becomes unresponsive under moderate load
- No graceful degradation -- OOM kills the entire process

**Prevention:**
1. Calculate worst-case memory: `maxFiles * maxFileSize * maxConcurrentRequests` = 50 * 5MB * N. Set Node.js `--max-old-space-size` accordingly
2. Implement global concurrency limiting with a semaphore or queue:
   ```typescript
   // Limit concurrent upload processing to N requests
   private readonly uploadSemaphore = new Semaphore(3);
   ```
3. Process files sequentially within a request (parse one, free buffer, parse next) rather than holding all 50 buffers simultaneously
4. Set Multer `limits` defensively:
   ```typescript
   {
     storage: multer.memoryStorage(),
     limits: {
       fileSize: 5 * 1024 * 1024,  // 5MB per file
       files: 50,                    // max 50 files
       fieldSize: 1024,              // max field value size
     }
   }
   ```
5. Consider processing files in streaming fashion or switching to `diskStorage` if memory remains a concern
6. Explicitly null out buffer references after parsing to enable earlier GC:
   ```typescript
   const data = XLSX.read(file.buffer, { type: 'buffer' });
   (file as { buffer: null }).buffer = null; // Release buffer reference
   ```

**Detection:**
- Node.js process crashes under load testing
- Memory usage graphs show sawtooth pattern with increasing baseline
- Kubernetes/Docker OOMKilled events in production

**Confidence:** HIGH -- verified against [Multer memoryStorage documentation](https://www.npmjs.com/package/multer) and [NestJS file upload best practices](https://docs.nestjs.com/techniques/file-upload)

---

### Pitfall 5: Drizzle Batch Insert Exceeds PostgreSQL Parameter Limit

**What goes wrong:** Inserting a large number of rows in a single `.insert().values([...])` call generates SQL with bound parameters. PostgreSQL's protocol limits bound parameters to 65,534 per prepared statement. With a `rows` table having ~10 columns, the maximum is ~6,553 rows per INSERT. Exceeding this crashes the query.

**Why it happens:** Drizzle ORM maps each column value to a `$N` parameter placeholder. For an array of N rows with M columns, the total parameter count is N * M. The JSONB `normalizedData` column counts as one parameter per row (the entire JSON object is one parameter), but with additional columns like `id`, `batchId`, `rowIndex`, `sourceFilename`, `createdAt`, etc., the parameter count adds up fast.

**Consequences:**
- PostgreSQL throws: `MAX_PARAMETERS_EXCEEDED: Max number of parameters (65534) exceeded`
- Entire transaction fails, no rows inserted
- Error is only triggered with large batches, may not surface in development testing

**Prevention:**
1. Calculate the maximum safe batch size: `Math.floor(65534 / numberOfColumns)`
2. Chunk inserts within the transaction:
   ```typescript
   await db.transaction(async (tx) => {
     const CHUNK_SIZE = 5000; // Safe for ~10 columns
     for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
       const chunk = rows.slice(i, i + CHUNK_SIZE);
       await tx.insert(rowsTable).values(chunk);
     }
   });
   ```
3. Be conservative with chunk size -- account for JSONB data serialization overhead
4. Log the total row count before insert to catch unexpectedly large batches early

**Detection:**
- Queries fail only with large Excel files (500+ rows)
- Error message contains `MAX_PARAMETERS_EXCEEDED`
- Works in development with small test files, fails in production with real data

**Confidence:** HIGH -- verified against [Drizzle ORM community discussion](https://www.answeroverflow.com/m/1148695514821435443) and [Drizzle ORM insert documentation](https://orm.drizzle.team/docs/insert)

---

### Pitfall 6: Excel Date Values Parsed as Numbers, Not Dates

**What goes wrong:** Excel stores dates as numeric serial numbers (e.g., 45658 = January 29, 2025). Without the `cellDates: true` option, SheetJS returns these as raw numbers. The application stores `45658` in JSONB instead of `"2025-01-29"`, and downstream consumers have no idea it represents a date.

**Why it happens:** By default, SheetJS preserves Excel's internal representation where dates are type `n` (number) with a date number format. The 1900 date epoch and the infamous Lotus 1-2-3 leap year bug (February 29, 1900 -- a date that does not exist) further complicate date handling. Additionally, some files use the 1904 epoch (Mac Excel) instead of 1900 (Windows Excel).

**Consequences:**
- Date columns contain meaningless numbers in the database
- Form-filling writes "45658" instead of "01/29/2025" into date fields
- Different date epochs between files cause inconsistent date offsets
- The fake date "February 29, 1900" causes off-by-one errors in date calculations

**Prevention:**
1. Always use `cellDates: true` when parsing for date-aware applications:
   ```typescript
   const workbook = XLSX.read(buffer, {
     type: 'buffer',
     cellDates: true,  // Convert date serial numbers to JS Date objects
     cellNF: true,     // Preserve number format strings for detection
   });
   ```
2. For the normalization pipeline, store dates as ISO 8601 strings in JSONB:
   ```typescript
   if (cell.t === 'd' && cell.v instanceof Date) {
     return cell.v.toISOString();
   }
   ```
3. Alternatively, use `raw: true` to preserve all values as strings exactly as displayed, avoiding all numeric interpretation
4. Document the chosen date handling strategy and test with files from both Windows and Mac Excel

**Detection:**
- Date columns in JSONB contain large integers (40000-50000 range)
- Form population shows numbers in date fields
- Dates are off by one day (1900 leap year bug)
- Dates are off by ~4 years (1904 vs 1900 epoch mismatch)

**Confidence:** HIGH -- verified against [SheetJS Cell Objects documentation](https://docs.sheetjs.com/docs/csf/cell/), [SheetJS date issue #126](https://git.sheetjs.com/sheetjs/sheetjs/issues/126), and [SheetJS date format issue #3035](https://git.sheetjs.com/sheetjs/sheetjs/issues/3035)

---

### Pitfall 7: Malicious XLSX Files as ZIP Bombs or Path Traversal Vectors

**What goes wrong:** XLSX files are ZIP archives. A crafted ZIP archive can decompress to an enormous size (ZIP bomb), exhausting memory and crashing the server. Alternatively, the archive can contain entries with path traversal filenames (e.g., `../../etc/passwd`) that exploit vulnerable extraction logic.

**Why it happens:** SheetJS decompresses the ZIP archive in memory during `XLSX.read()`. There is no built-in protection against:
- ZIP bombs: A 1KB compressed file that expands to 10GB
- Nested ZIP bombs: Archives containing archives containing archives
- Path traversal: Filenames with `../` sequences (though SheetJS reads in memory, not to disk, so path traversal is less of a direct risk)
- Excessive entry count: ZIP with millions of entries exhausting parsing time

**Consequences:**
- ZIP bomb: Memory exhaustion crashes the Node.js process (similar to Pitfall 4 but worse -- a single 5MB file can decompress to gigabytes)
- CPU exhaustion: Deeply nested or adversarial ZIP structures consume 100% CPU during parsing
- Process crash with no recovery possible

**Prevention:**
1. The 5MB file size limit on uploads is the primary defense -- it significantly constrains the decompression ratio a ZIP bomb can achieve
2. Set a parsing timeout to kill long-running parse operations:
   ```typescript
   async parseWithTimeout(buffer: Buffer, timeoutMs: number = 10000): Promise<XLSX.WorkBook> {
     return Promise.race([
       new Promise<XLSX.WorkBook>((resolve) => {
         resolve(XLSX.read(buffer, { type: 'buffer', cellDates: true }));
       }),
       new Promise<never>((_, reject) => {
         setTimeout(() => reject(new Error('Excel parse timeout exceeded')), timeoutMs);
       }),
     ]);
   }
   ```
   **Note:** This timeout approach has a limitation -- `XLSX.read()` is synchronous and blocks the event loop. A true timeout requires running the parse in a worker thread.
3. Consider running SheetJS parsing in a Worker Thread to isolate memory and prevent main thread blocking:
   ```typescript
   // worker-parse.ts
   import { parentPort, workerData } from 'worker_threads';
   import * as XLSX from 'xlsx';
   const wb = XLSX.read(workerData.buffer, { type: 'buffer', cellDates: true });
   parentPort?.postMessage(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!));
   ```
4. Monitor memory usage during parsing and abort if it exceeds a threshold
5. After parsing, validate that the resulting data volume is reasonable (e.g., max 100,000 cells)

**Detection:**
- Node.js process OOMKilled despite small uploaded file sizes
- Parse operations take unusually long (minutes for a small file)
- Monitoring shows sudden memory spikes uncorrelated with file size

**Confidence:** MEDIUM -- zip bomb risk is real but constrained by the 5MB upload limit; [SheetJS vulnerability history](https://snyk.io/test/github/SheetJS/js-xlsx/c86472d281be4858e671fa92ad9bdf8e61dfed6c) confirms historical DoS vectors

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded functionality.

---

### Pitfall 8: Merged Cells Cause Silent Data Loss

**What goes wrong:** In Excel, merged cells only store the value in the top-left cell of the merge range. All other cells in the range are empty (or stub cells). When parsing row-by-row, rows covered by a merge appear to have null/undefined values for the merged columns.

**Why it happens:** SheetJS stores merged cell metadata in `ws['!merges']` as an array of range objects. By default, cells covered by a merge are skipped entirely. Even with `sheetStubs: true`, they appear as blank cells with no value.

**Consequences:**
- Merged header cells: Only the first row of a multi-row header has the column name; subsequent rows show null
- Merged data cells: Data that appears to span multiple rows in Excel is only present in the first row
- Silent data loss -- no error is thrown, rows just have missing fields

**Prevention:**
1. After parsing, check `worksheet['!merges']` and propagate values from the top-left cell to all cells in the merge range:
   ```typescript
   function expandMerges(worksheet: XLSX.WorkSheet): void {
     const merges = worksheet['!merges'];
     if (!merges) return;
     for (const merge of merges) {
       const topLeftAddr = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
       const topLeftCell = worksheet[topLeftAddr];
       if (!topLeftCell) continue;
       for (let r = merge.s.r; r <= merge.e.r; r++) {
         for (let c = merge.s.c; c <= merge.e.c; c++) {
           if (r === merge.s.r && c === merge.s.c) continue;
           const addr = XLSX.utils.encode_cell({ r, c });
           worksheet[addr] = { ...topLeftCell };
         }
       }
     }
   }
   ```
2. Alternatively, warn users that merged cells are not supported and instruct them to unmerge before uploading
3. For ProfileMode (cell-address keys), document that merged cell addresses resolve to the top-left cell only

**Detection:**
- Columns that have values in some rows but are null in others, inconsistent with the source Excel
- Users report "missing data" after upload
- JSONB rows have null values where Excel shows data

**Confidence:** HIGH -- verified against [SheetJS Merged Cells documentation](https://docs.sheetjs.com/docs/csf/features/merges/)

---

### Pitfall 9: Formula Cells Return Cached Values or undefined

**What goes wrong:** SheetJS does NOT compute formulas. It returns either the cached result (the last computed value stored in the file) or nothing at all. If the Excel file was saved without recalculating (common with macros or large files), the cached value may be stale or missing entirely.

**Why it happens:** `cellFormula` is false by default, so formula text is not even preserved. The cell's `.v` (value) field contains whatever was cached at save time. If the file was created by a tool that doesn't compute formulas (like some export utilities), the `.v` field is undefined.

**Consequences:**
- Formula cells have null/undefined values, silently dropping data
- Cached values may be outdated (file was modified but not recalculated)
- Users expect computed values but get raw formula text or stale numbers

**Prevention:**
1. Parse with `cellFormula: false` (default) and rely on cached values via `.v`:
   ```typescript
   const workbook = XLSX.read(buffer, {
     type: 'buffer',
     cellDates: true,
     // cellFormula: false is default -- we want cached values, not formula text
   });
   ```
2. Check for undefined `.v` on cells that have `.f` (formula):
   ```typescript
   if (cell.f && cell.v === undefined) {
     // Formula cell with no cached value
     normalizedValue = null; // or a sentinel value indicating "formula not computed"
   }
   ```
3. Document this limitation for users: "Formula results are based on the last time the file was saved in Excel. Re-open and save the file in Excel before uploading to ensure computed values are current."

**Detection:**
- Columns that should have computed values show null in the database
- Values in JSONB don't match what the user sees in Excel
- `.f` property exists on cell but `.v` is undefined

**Confidence:** HIGH -- verified against [SheetJS Formulae documentation](https://docs.sheetjs.com/docs/csf/features/formulae/)

---

### Pitfall 10: Drizzle Transaction Isolation Does Not Prevent Application-Level Race Conditions

**What goes wrong:** Using `db.transaction()` with default isolation (`read committed`) does not prevent two concurrent requests from creating duplicate batches for the same project. The transaction provides atomicity (all-or-nothing) but not serialization (one-at-a-time).

**Why it happens:** `read committed` is PostgreSQL's default. It only guarantees that reads within the transaction see committed data. Two transactions can both read that no batch exists for project X, then both create one. For `serializable` isolation, Drizzle supports it but does NOT provide automatic retry on serialization failures -- you must implement retry logic yourself.

**Consequences:**
- Duplicate batches created for the same upload (if retried)
- Data inconsistency between concurrent uploads to the same project
- If using `serializable` isolation without retry, transactions fail silently or throw unhandled errors

**Prevention:**
1. For batch creation, use a unique constraint (e.g., on `projectId + uploadHash`) and upsert:
   ```typescript
   await tx.insert(batches).values(batchData)
     .onConflictDoNothing({ target: [batches.projectId, batches.uploadHash] });
   ```
2. If using `serializable` isolation, implement retry with backoff:
   ```typescript
   async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
     for (let attempt = 0; attempt < maxRetries; attempt++) {
       try {
         return await fn();
       } catch (error) {
         if (isSerializationError(error) && attempt < maxRetries - 1) {
           await delay(Math.pow(2, attempt) * 100); // exponential backoff
           continue;
         }
         throw error;
       }
     }
     throw new Error('Max retries exceeded');
   }
   ```
3. For most data ingestion scenarios, `read committed` + unique constraints is sufficient and simpler than `serializable` + retry

**Detection:**
- Duplicate batch records for the same upload
- Serialization errors in logs: "could not serialize access due to concurrent update"
- Intermittent 500 errors under concurrent load

**Confidence:** HIGH -- verified against [Drizzle ORM Transactions documentation](https://orm.drizzle.team/docs/transactions) and [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

---

### Pitfall 11: JSONB null vs Missing Key Semantic Mismatch

**What goes wrong:** JavaScript `undefined` does not exist in JSON. When normalizing Excel data to JSONB, empty cells become `undefined` in JavaScript, which `JSON.stringify()` silently drops -- the key disappears entirely from the JSON object. This means querying `WHERE data->>'column' IS NULL` does not match rows where the key is absent; you need `WHERE data->>'column' IS NULL OR NOT (data ? 'column')`.

**Why it happens:** Three distinct states exist but map to two or one:
- Excel cell is empty -> JavaScript `undefined` -> key omitted from JSON
- Excel cell contains the text "null" -> JavaScript `"null"` (string) -> stored as string
- Excel cell has a formula that returns nothing -> JavaScript `undefined` -> key omitted

PostgreSQL JSONB distinguishes between `{"name": null}` (key present, value null) and `{}` (key absent). But JavaScript's `JSON.stringify({ name: undefined })` produces `{}`, making them indistinguishable.

**Consequences:**
- Inconsistent query results depending on whether cells were empty or explicitly null
- Some rows have keys that other rows lack, making column discovery unreliable
- GIN indexes behave differently for null values vs missing keys
- Downstream form-filling cannot distinguish "field should be empty" from "field data is missing"

**Prevention:**
1. Normalize `undefined` to `null` explicitly before storing:
   ```typescript
   function normalizeForJsonb(value: unknown): unknown {
     if (value === undefined) return null;
     return value;
   }
   ```
2. Ensure every row has the same set of keys (derived from headers), with `null` for empty cells:
   ```typescript
   const normalizedRow: Record<string, unknown> = {};
   for (const header of headers) {
     normalizedRow[header] = rawRow[header] ?? null;
   }
   ```
3. This ensures consistent JSONB structure: every row has every column, empty values are `null`

**Detection:**
- JSONB documents have different key counts across rows
- Queries with `->>'column' IS NULL` miss some empty-cell rows
- `jsonb_object_keys()` returns different results for different rows in the same batch

**Confidence:** HIGH -- verified against [PostgreSQL JSONB documentation](https://www.postgresql.org/docs/current/datatype-json.html) and JavaScript JSON serialization behavior

---

### Pitfall 12: Strategy Pattern DI -- Same Token Overwrites Instead of Coexisting

**What goes wrong:** Registering both `ListModeStrategy` and `ProfileModeStrategy` under the same injection token (e.g., `'IngestionStrategy'`) causes NestJS to only inject the LAST registered provider. The first strategy silently disappears.

**Why it happens:** NestJS DI uses a token-to-provider map. When multiple providers share the same token, the last registration wins. Unlike Angular, NestJS does not have a native `multi: true` option to collect all providers with the same token into an array.

**Consequences:**
- Only one strategy is available at runtime
- No error is thrown -- the wrong strategy is silently injected
- Tests may pass because they register strategies individually

**Prevention:**
1. Use distinct tokens for each strategy:
   ```typescript
   @Module({
     providers: [
       { provide: 'ListModeStrategy', useClass: ListModeStrategy },
       { provide: 'ProfileModeStrategy', useClass: ProfileModeStrategy },
       IngestionService, // Uses @Inject for each strategy
     ],
   })
   ```
2. Or use a factory to create a strategy registry:
   ```typescript
   {
     provide: 'StrategyRegistry',
     useFactory: (list: ListModeStrategy, profile: ProfileModeStrategy) => {
       return new Map<string, IngestionStrategy>([
         ['list', list],
         ['profile', profile],
       ]);
     },
     inject: [ListModeStrategy, ProfileModeStrategy],
   }
   ```
3. Or use NestJS `ModuleRef` to dynamically resolve strategies by class:
   ```typescript
   @Injectable()
   export class IngestionService {
     constructor(private moduleRef: ModuleRef) {}

     getStrategy(mode: 'list' | 'profile'): IngestionStrategy {
       const strategyClass = mode === 'list' ? ListModeStrategy : ProfileModeStrategy;
       return this.moduleRef.get(strategyClass, { strict: false });
     }
   }
   ```

**Detection:**
- Only one mode works (the other silently uses the wrong strategy)
- Unit tests that register strategies individually pass, but integration tests fail
- Debugging shows the wrong class instance being injected

**Confidence:** HIGH -- verified against [NestJS custom providers documentation](https://docs.nestjs.com/fundamentals/custom-providers) and [NestJS Strategy Pattern discussion](https://github.com/nestjs/nest/issues/5573)

---

### Pitfall 13: SheetJS TypeScript Strict Mode and Cell Access

**What goes wrong:** With `strictNullChecks: true` (which this project uses), every cell access on a SheetJS `WorkSheet` returns `CellObject | undefined` because worksheets use an index signature (`Record<string, CellObject>`). Code like `worksheet['A1'].v` fails TypeScript compilation because `worksheet['A1']` might be `undefined`.

**Why it happens:** SheetJS's `WorkSheet` type uses a string index signature. Under strict null checks, indexing into any `Record` or array returns `T | undefined`. While the project's `tsconfig.json` currently has `noImplicitAny: false` and does not enable `noUncheckedIndexedAccess`, the CLAUDE.md states these strict options should be enforced. Either way, `strictNullChecks` alone requires handling the `undefined` case for sheet name access.

**Consequences:**
- Compilation errors on every cell access, worksheet access, and sheet name access
- Developers resort to non-null assertions (`!`) everywhere, defeating the purpose of strict mode
- Hidden runtime errors when accessing cells that don't exist

**Prevention:**
1. Create type-safe helper functions that handle the undefined checks:
   ```typescript
   function getCell(ws: XLSX.WorkSheet, address: string): XLSX.CellObject | null {
     const cell = ws[address];
     // SheetJS stores cells and metadata (like '!ref') in the same object
     // Only return actual cell objects
     if (!cell || typeof cell !== 'object' || !('t' in cell)) return null;
     return cell;
   }

   function getSheet(wb: XLSX.WorkBook, index: number): XLSX.WorkSheet | null {
     const name = wb.SheetNames[index];
     if (name === undefined) return null;
     const sheet = wb.Sheets[name];
     return sheet ?? null;
   }
   ```
2. Use `XLSX.utils.sheet_to_json()` to avoid manual cell access entirely when possible -- it returns properly typed arrays
3. Avoid `!` non-null assertions; prefer explicit null checks with early returns

**Detection:**
- TypeScript compilation errors on SheetJS cell access
- Excessive use of `!` operator in parsing code
- Runtime `TypeError: Cannot read property 'v' of undefined` errors

**Confidence:** HIGH -- verified against [SheetJS TypeScript issues](https://git.sheetjs.com/sheetjs/sheetjs/issues/2828) and [TypeScript noUncheckedIndexedAccess documentation](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)

---

### Pitfall 14: Empty Sheets and Missing Headers Cause Silent Failures

**What goes wrong:** An uploaded Excel file contains empty sheets (no data), sheets with only headers (no data rows), or sheets where the header row is not the first row. The parser processes these without error but produces zero rows or garbage data.

**Why it happens:** SheetJS does not validate that a worksheet contains useful data. `sheet_to_json()` on an empty sheet returns `[]` -- no error. If headers are in row 3 instead of row 1, `sheet_to_json()` treats rows 1-2 as data rows with the wrong column assignments.

**Consequences:**
- Batch created with zero rows (no error, but useless)
- Wrong data mapped to wrong columns if header row is misidentified
- Users upload multi-sheet workbooks expecting all sheets to be processed, but only the first (or wrong) sheet is read

**Prevention:**
1. Validate that the parsed sheet has data before creating a batch:
   ```typescript
   const rows = XLSX.utils.sheet_to_json(worksheet);
   if (rows.length === 0) {
     throw new BadRequestException('Sheet contains no data rows');
   }
   ```
2. Validate that headers are present and non-empty:
   ```typescript
   const headers = Object.keys(rows[0] ?? {});
   if (headers.length === 0) {
     throw new BadRequestException('No column headers detected');
   }
   ```
3. Document which sheet is processed (first sheet only, or all sheets) and communicate this to users
4. Consider allowing users to specify the header row index if needed

**Detection:**
- Batches with zero rows in the database
- Data columns have names like `__EMPTY`, `__EMPTY_1` (SheetJS auto-generated names for missing headers)
- Column values don't match expected data types

**Confidence:** HIGH -- verified against [SheetJS parse options documentation](https://docs.sheetjs.com/docs/api/parse-options/)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

---

### Pitfall 15: Multer File Size Rejection Consumes Full Upload Before Failing

**What goes wrong:** When a user uploads a file exceeding the `limits.fileSize` setting, Multer still receives ALL bytes of the file before returning the `LIMIT_FILE_SIZE` error. On a slow connection, a 100MB file takes minutes to upload before being rejected.

**Why it happens:** This is a known Multer behavior ([issue #344](https://github.com/expressjs/multer/issues/344)). Multer reads the multipart stream until completion before checking size limits. The file size limit does prevent the file from being stored in the buffer (in memoryStorage), but the HTTP upload itself is not interrupted.

**Consequences:**
- Poor user experience (long upload, then rejection)
- Server still processes the incoming stream, consuming bandwidth
- Client-side validation becomes essential for usability

**Prevention:**
1. Implement client-side file size validation in the web dashboard before upload begins
2. Consider adding an Express middleware that checks `Content-Length` header early:
   ```typescript
   app.use('/api/batches/upload', (req, res, next) => {
     const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
     const maxSize = 50 * 5 * 1024 * 1024; // 50 files * 5MB
     if (contentLength > maxSize) {
       return res.status(413).json({ message: 'Request entity too large' });
     }
     next();
   });
   ```
3. Note that `Content-Length` can be spoofed, so this is a usability optimization, not a security measure

**Detection:**
- Users complain about long upload times followed by rejection
- Network logs show large incoming transfers being fully received before error response

**Confidence:** HIGH -- verified against [Multer issue #344](https://github.com/expressjs/multer/issues/344)

---

### Pitfall 16: `.returning()` on Large Batch Inserts Increases Memory Pressure

**What goes wrong:** Using `.returning()` on a bulk insert of thousands of rows with JSONB data returns the entire result set to the Node.js process. If each row has a large JSONB payload, this can consume significant memory for data that may not be needed.

**Why it happens:** `.returning()` instructs PostgreSQL to send back all inserted rows. With JSONB columns containing normalized Excel data, each returned row includes the full JSON document. For 10,000 rows with 50 columns each, the returned payload can be substantial.

**Consequences:**
- Increased memory usage during insert operations
- Slower insert performance (PostgreSQL must serialize and transmit results)
- Network overhead between application and database

**Prevention:**
1. Only use `.returning()` when you need the inserted data (e.g., for returning batch summary to client)
2. For large bulk inserts where you only need the count, omit `.returning()`:
   ```typescript
   // Don't need returned rows:
   await tx.insert(rowsTable).values(chunk);

   // Only need count or specific fields:
   const result = await tx.insert(rowsTable).values(chunk).returning({ id: rowsTable.id });
   ```
3. If you need batch metadata but not row data, insert rows without `.returning()` and query the batch summary separately

**Detection:**
- Memory spikes during batch insert operations
- Insert operations slower than expected for the row count
- Increased network traffic between app and database during ingestion

**Confidence:** HIGH -- verified against [Drizzle ORM Insert documentation](https://orm.drizzle.team/docs/insert)

---

### Pitfall 17: Zod v4 Breaking Changes Affect Validation Schemas

**What goes wrong:** The project uses `zod@^4.3.6`. Zod v4 has several breaking changes from v3 that may cause subtle bugs if copy-pasting patterns from v3-era documentation or tutorials.

**Why it happens:** Zod v4 changed `error.errors` to `error.issues`, dropped `invalid_type_error`/`required_error` params in favor of a unified `error` param, changed `.record()` to require two arguments, and made UUID validation stricter (RFC 4122 compliance). Optional properties with `.catch()` or `.default()` also behave differently.

**Consequences:**
- Error response formatting breaks if code references `error.errors` instead of `error.issues`
- UUID validation rejects valid-looking UUIDs that don't have proper version/variant bits
- Custom error messages configured with `invalid_type_error` stop working

**Prevention:**
1. Reference Zod v4 documentation exclusively: https://zod.dev/v4
2. For upload validation schemas, use the v4 API:
   ```typescript
   import { z } from 'zod';
   const uploadSchema = z.object({
     mode: z.enum(['list', 'profile']),
     projectId: z.uuid(), // v4: top-level, not z.string().uuid()
   });
   ```
3. Update the existing `ZodValidationPipe` to use `error.issues` not `error.errors`
4. Test UUID validation with actual Drizzle-generated UUIDs to ensure compatibility

**Detection:**
- Validation error responses missing error details
- UUIDs that work in the database are rejected by Zod validation
- TypeScript errors when accessing Zod error properties

**Confidence:** HIGH -- verified against [Zod v4 migration guide](https://zod.dev/v4/changelog) and [Zod v4 breaking changes](https://github.com/colinhacks/zod/issues/4883)

---

### Pitfall 18: SheetJS CommonJS vs ESM Import Confusion

**What goes wrong:** Using ESM-style `import { read } from 'xlsx'` in NestJS without setting up `set_fs()` causes file system operations (if any) to fail silently. Alternatively, using the wrong import syntax causes bundle errors.

**Why it happens:** SheetJS recommends CommonJS for Node.js. The ESM build requires manual setup of `fs` and `stream` modules via `set_fs()` and `set_readable()`. NestJS uses CommonJS by default but the project's `tsconfig.json` uses `"module": "nodenext"` and `"moduleResolution": "nodenext"`, which may resolve to the ESM entry point depending on the package's `exports` field.

**Consequences:**
- `XLSX.readFile()` throws cryptic errors about missing `fs` module
- Bundle size increases if both CJS and ESM versions are included
- TypeScript compilation works but runtime fails

**Prevention:**
1. Since memoryStorage is used (buffers, not files), the fs issue is avoided -- use `XLSX.read(buffer, { type: 'buffer' })` exclusively, never `XLSX.readFile()`
2. Import using the namespace pattern recommended by SheetJS:
   ```typescript
   import * as XLSX from 'xlsx';
   ```
3. If ESM resolution is used, explicitly set up fs:
   ```typescript
   import * as XLSX from 'xlsx';
   import * as fs from 'fs';
   XLSX.set_fs(fs);
   ```
4. Test that the import resolves correctly by verifying `typeof XLSX.read === 'function'` at startup

**Detection:**
- Runtime error: "XLSX.read is not a function" or "fs not available"
- Bundle warnings about missing modules
- Different behavior between `nest start` (ts-node) and `nest build && node dist/main`

**Confidence:** MEDIUM -- depends on exact `module`/`moduleResolution` settings and SheetJS package.json `exports` field

---

### Pitfall 19: JSONB Documents Without Consistent Schema Break Querying

**What goes wrong:** Different Excel files produce JSONB documents with different key sets. Querying across batches becomes difficult because you cannot assume any key exists in all rows.

**Why it happens:** Each Excel file has different column headers. In ListMode, each file produces rows with keys matching that file's headers. Across batches (or even within a batch if files have different headers), the JSONB structure varies.

**Consequences:**
- Queries like `SELECT data->>'email' FROM rows` return null for rows from files without an "email" column
- Aggregation queries across batches are unreliable
- The extension must discover available columns per batch, not assume a universal schema

**Prevention:**
1. Store the column schema as metadata on the `batches` table:
   ```typescript
   // batches table
   columns: jsonb('columns'), // e.g., ["name", "email", "cpf", "phone"]
   ```
2. This allows the frontend and extension to know which columns exist without scanning all rows
3. Validate that all rows within a single batch have the same key set (which they should, since they come from the same header row)
4. For cross-batch queries, always check key existence: `WHERE data ? 'email'`

**Detection:**
- Frontend displays empty columns for some batches
- Extension mapping UI shows inconsistent column lists
- Queries return unexpected nulls across batches

**Confidence:** HIGH -- architectural certainty based on the product domain (multiple Excel files with different schemas)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| SheetJS Installation | Pitfall 1: npm installs vulnerable version | Critical | Install from CDN only: `pnpm add xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| SheetJS Installation | Pitfall 2: pnpm lockfile corruption | Critical | Test `--frozen-lockfile` in CI immediately after adding dependency |
| File Upload Setup | Pitfall 3: MIME type bypass | Critical | Validate magic bytes on buffer, not just MIME type |
| File Upload Setup | Pitfall 4: Memory exhaustion | Critical | Calculate worst-case memory, implement concurrency limits |
| File Upload Setup | Pitfall 15: Full upload before rejection | Minor | Add client-side size validation |
| Excel Parsing | Pitfall 6: Dates as numbers | Critical | Always use `cellDates: true` |
| Excel Parsing | Pitfall 7: ZIP bomb / malicious files | Critical | Rely on 5MB limit; consider worker thread isolation |
| Excel Parsing | Pitfall 8: Merged cell data loss | Moderate | Check `!merges` and propagate values, or document limitation |
| Excel Parsing | Pitfall 9: Formula cached values | Moderate | Document limitation; check for missing `.v` on formula cells |
| Excel Parsing | Pitfall 13: TypeScript strict mode | Moderate | Create helper functions for cell access |
| Excel Parsing | Pitfall 14: Empty sheets | Moderate | Validate row count > 0 after parsing |
| Database Schema | Pitfall 5: Parameter limit on batch insert | Critical | Chunk inserts to max ~5000 rows per statement |
| Database Schema | Pitfall 11: null vs undefined in JSONB | Moderate | Normalize all undefined to null before storage |
| Database Schema | Pitfall 19: Inconsistent JSONB schemas | Minor | Store column list as batch metadata |
| Transaction Logic | Pitfall 10: Race conditions with read committed | Moderate | Use unique constraints + upsert instead of serializable isolation |
| Transaction Logic | Pitfall 16: returning() memory overhead | Minor | Omit `.returning()` on bulk row inserts |
| Strategy Pattern DI | Pitfall 12: Provider token overwrite | Moderate | Use distinct tokens or a strategy registry |
| Validation Schemas | Pitfall 17: Zod v4 breaking changes | Minor | Use Zod v4 API exclusively, test UUID validation |
| Module Setup | Pitfall 18: ESM/CJS import confusion | Minor | Use `import * as XLSX from 'xlsx'`, avoid `readFile()` |

---

## Pre-Implementation Checklist

Before writing any code for the v2.0 Data Ingestion Engine:

### Installation and Setup
- [ ] SheetJS installed from CDN (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), NOT from npm
- [ ] `@types/xlsx` is NOT installed (types are bundled)
- [ ] `pnpm install --frozen-lockfile` tested in clean environment after adding SheetJS
- [ ] `@nestjs/platform-express` updated to latest (Multer 2.0.2+ for CVE patches)
- [ ] Node.js `--max-old-space-size` calculated for worst-case concurrent uploads

### File Upload Security
- [ ] Multer `limits` configured: `fileSize`, `files`, `fieldSize`
- [ ] Magic byte validation implemented (check for ZIP PK signature on buffer)
- [ ] File content validated AFTER Multer processes it, BEFORE SheetJS parses it
- [ ] User-provided filenames NEVER used for storage (generate UUIDs)
- [ ] Client-side file size validation added to web dashboard

### Excel Parsing
- [ ] `cellDates: true` enabled in all `XLSX.read()` calls
- [ ] Merged cell handling strategy decided and documented
- [ ] Formula cell behavior documented (cached values only)
- [ ] Empty sheet validation added (reject sheets with zero data rows)
- [ ] Type-safe cell access helpers created (no bare index access)
- [ ] Header row detection and validation implemented

### Database and Transactions
- [ ] Insert chunking implemented (max ~5000 rows per INSERT statement)
- [ ] All `undefined` values normalized to `null` before JSONB storage
- [ ] Batch metadata includes column list for downstream consumers
- [ ] Transaction isolation level chosen and documented (recommend `read committed` + unique constraints)
- [ ] `.returning()` omitted on bulk row inserts unless needed

### Strategy Pattern
- [ ] Each strategy has a distinct injection token or uses a registry pattern
- [ ] Strategy selection tested with both `list` and `profile` modes
- [ ] NestJS module properly exports and provides all strategies

### Validation
- [ ] Zod schemas use v4 API (top-level `z.uuid()`, `error.issues`, etc.)
- [ ] Custom `FilesValidationPipe` for multi-file validation (ParseFilePipeBuilder does not support arrays)
- [ ] Upload DTO validates `mode` field before processing

---

## Sources Summary

**HIGH Confidence (Official Documentation):**
- [SheetJS CDN Installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) -- authoritative installation guidance
- [SheetJS Cell Objects](https://docs.sheetjs.com/docs/csf/cell/) -- cell types, date handling
- [SheetJS Merged Cells](https://docs.sheetjs.com/docs/csf/features/merges/) -- merge behavior
- [SheetJS Formulae](https://docs.sheetjs.com/docs/csf/features/formulae/) -- formula handling limitations
- [SheetJS NestJS Integration](https://docs.sheetjs.com/docs/demos/net/server/nestjs/) -- official NestJS example
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) -- isolation levels, savepoints
- [Drizzle ORM Insert](https://orm.drizzle.team/docs/insert) -- bulk insert, returning()
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload) -- Multer integration
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers) -- DI patterns
- [PostgreSQL JSONB Types](https://www.postgresql.org/docs/current/datatype-json.html) -- null vs absent key semantics
- [Multer npm Documentation](https://www.npmjs.com/package/multer) -- memoryStorage, limits
- [Zod v4 Changelog](https://zod.dev/v4/changelog) -- breaking changes from v3

**MEDIUM Confidence (Verified Patterns):**
- [Multer CVE-2025-47944](https://github.com/nestjs/nest/issues/15171) -- NestJS Multer DoS vulnerability
- [Multer CVE-2025-48997](https://github.com/nestjs/nest/issues/15236) -- Empty field name DoS
- [Multer CVE-2025-7338](https://zeropath.com/blog/cve-2025-7338-multer-dos-vulnerability) -- Malformed request DoS
- [Multer File Type Validation](https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l) -- MIME bypass analysis
- [SheetJS Prototype Pollution CVE-2023-30533](https://security.snyk.io/vuln/SNYK-JS-XLSX-5457926) -- npm version vulnerability
- [pnpm Lockfile Bug #7368](https://github.com/pnpm/pnpm/issues/7368) -- CDN tarball lockfile issue
- [Drizzle MAX_PARAMETERS_EXCEEDED](https://www.answeroverflow.com/m/1148695514821435443) -- batch insert limit
- [PostgreSQL JSONB Indexing Pitfalls](https://vsevolod.net/postgresql-jsonb-index/) -- GIN index performance
- [JSONB Storage Tradeoffs](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema) -- when to avoid JSONB
- [NestJS Multi-File Validation](https://github.com/nestjs/docs.nestjs.com/issues/2424) -- ParseFilePipeBuilder limitation

**LOW Confidence (Community Patterns):**
- [NestJS Strategy Pattern Discussion](https://github.com/nestjs/nest/issues/5573) -- community implementation patterns
- [Multer Memory Trap Analysis](https://medium.com/@codewithmunyao/the-multer-memory-trap-why-your-file-upload-strategy-is-killing-your-server-89f9e8797e58) -- memory pressure analysis
