# Feature Landscape: Data Ingestion Engine

**Domain:** Excel Data Ingestion for B2B SaaS
**Researched:** 2026-01-29
**Confidence:** HIGH

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| File validation before processing | Industry standard for all B2B SaaS with file upload | LOW | File type, size, structure checks before accepting upload |
| Real-time validation feedback | Users expect immediate feedback on data quality | MEDIUM | Per-row validation with clear error messages showing which cells have issues |
| File size limits with clear messaging | Prevents server overload and sets user expectations | LOW | 5MB/file is reasonable for Excel; proactively warn before upload fails |
| Support for .xlsx and .csv formats | These are the two universal export formats from all business software | MEDIUM | .xlsx via SheetJS, .csv is trivial |
| Batch upload status tracking | Users need to know if their upload succeeded or failed | LOW | Simple success/failure states with error counts |
| Error export/download | When validation fails, users need to know exactly what to fix | MEDIUM | Export rows that failed validation with error reasons |
| Upload history/audit trail | Compliance requirement for enterprise B2B | MEDIUM | Who uploaded what, when, with what result |
| Data preview before commit | Users want to verify parsed data before it's saved | MEDIUM | Show first 10-50 rows in a table format |
| Rollback capability | If batch processing fails mid-way, users expect atomic all-or-nothing | HIGH | Requires transaction support or compensating operations |
| Progress indicators | Users expect visual feedback during upload/processing | LOW | Upload progress bar, then processing spinner |

## Differentiators (Competitive Advantage)

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Strategy Pattern support (ListMode + ProfileMode) | Handles both common use cases (bulk rows vs individual profile sheets) | MEDIUM | Most competitors only support row-based imports; ProfileMode is unique to form-filling workflows |
| Source traceability in JSONB | Each data point tracks which file/row/cell it came from | LOW | Enables powerful debugging and audit capabilities |
| Smart column mapping suggestions | AI/heuristic-based suggestions reduce manual mapping effort | HIGH | Can defer to post-v2.0; uses column name similarity + data type detection |
| Incremental upload support | Users can upload additional files to same project without replacing | MEDIUM | Append vs replace semantics; requires merge strategy |
| Multi-file batch upload (up to 50 files) | ProfileMode users often have dozens of client sheets to upload at once | MEDIUM | Parallel processing with aggregated status reporting |
| Data normalization preview | Show users how their Excel dates/numbers will be transformed | MEDIUM | Prevents "why did my date become a number?" support tickets |
| Schema versioning | Track changes to data structure over time | HIGH | Useful for long-running projects but overkill for v2.0 |
| Duplicate detection | Warn when uploading data that already exists in project | MEDIUM | Based on configurable unique keys (e.g., CNPJ, email) |

## Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Automatic data transformation/cleaning | Users want "magic" that fixes their messy data | Creates unpredictable behavior; users lose trust when system "fixes" things incorrectly | Validate strictly, provide clear error messages, let users fix source data |
| Support for .xls (legacy Excel) | Some users still have old Excel files | .xls is a binary format with security issues and parsing complexity; deprecated since Excel 2007 | Require .xlsx; provide conversion instructions |
| Unlimited file size uploads | "Why can't I upload my 100MB spreadsheet?" | Kills server performance, ties up resources, bad UX with timeouts | Hard limit at 5MB; guide users to split large files or use database exports |
| Real-time collaborative editing of uploaded data | Users want to edit data in-browser like Google Sheets | Massive scope creep; becomes a spreadsheet app instead of data ingestion | Make uploads immutable; require re-upload if source data changes |
| Auto-repair of malformed Excel files | "Just make it work" mentality | Impossible to reliably repair; creates false confidence | Strict validation; provide specific error messages so users can fix in Excel |
| Support for macros/formulas in Excel | Users have complex Excel files with calculations | Security risk (macros), parsing complexity (formulas), unclear expectations | Only parse values, ignore formulas; document this clearly |

## Feature Dependencies

```
[File Upload] ──requires──> [File Validation]
                                 └──requires──> [Error Reporting]

[Strategy Pattern] ──requires──> [File Validation]
    ├──enables──> [ListMode Parsing]
    └──enables──> [ProfileMode Parsing]

[Batch Processing] ──requires──> [Atomic Operations]
                                      └──requires──> [Rollback Support]

[Data Preview] ──enhances──> [File Upload]
[Source Traceability] ──enhances──> [Audit Trail]
[Progress Indicators] ──enhances──> [Upload UX]

[Multi-file Upload] ──conflicts──> [Large File Sizes]
    (50 files × 5MB = 250MB total; need careful memory management)

[Schema Versioning] ──depends──> [Audit Trail]
[Duplicate Detection] ──requires──> [Data Normalization]
```

### Dependency Notes

- **File Upload requires File Validation:** Cannot accept files without validating type, size, structure first
- **Strategy Pattern requires File Validation:** Both ListMode and ProfileMode need validated files before determining parsing approach
- **Batch Processing requires Atomic Operations:** All-or-nothing semantics essential for data integrity
- **Data Preview enhances File Upload:** Gives users confidence before committing
- **Multi-file Upload conflicts with Large File Sizes:** Need memory management strategy to avoid server overload when processing 50 concurrent files

## MVP Recommendation (v2.0 Data Ingestion)

### Launch With (v2.0)

Minimum viable product — what's needed to validate the concept.

- [x] **File Upload with Validation** — Essential foundation; users cannot use system without uploading data
- [x] **Strategy Pattern (ListMode + ProfileMode)** — Core differentiator; solves the two primary use cases
- [x] **File Size Limits (5MB/file, 50 files/request)** — Prevents server overload while supporting real workflows
- [x] **Format Support (.xlsx, .csv)** — Industry standard formats cover 95%+ of use cases
- [x] **Real-time Validation Feedback** — Table stakes for good UX; prevents "upload and pray"
- [x] **Atomic Batch Operations** — Data integrity non-negotiable for B2B
- [x] **JSONB Storage with Source Traceability** — Enables audit trail and debugging
- [x] **Basic Error Reporting** — Users need to know what went wrong and where
- [x] **Progress Indicators** — Visual feedback during upload/processing reduces anxiety

### Add After Validation (v2.x)

Features to add once core is working and validated with real users.

- [ ] **Error Export** — When validation finds issues, export failed rows with error reasons (trigger: user feedback on "how do I fix this?")
- [ ] **Data Preview** — Show parsed data before commit (trigger: users accidentally upload wrong files)
- [ ] **Upload History/Audit Trail** — Who uploaded what, when (trigger: compliance questions or multi-user teams)
- [ ] **Duplicate Detection** — Warn when re-uploading existing data (trigger: users complain about duplicate records)
- [ ] **Data Normalization Preview** — Show transformation results before applying (trigger: support tickets about "wrong" dates/numbers)

### Future Consideration (v3+)

Features to defer until product-market fit is established.

- [ ] **Smart Column Mapping Suggestions** — Defer until we have enough data to train heuristics; manual mapping works for MVP
- [ ] **Incremental Upload Support** — Complex merge semantics; wait for user demand
- [ ] **Schema Versioning** — Only needed for long-running projects; overkill for initial users
- [ ] **Multi-file Parallel Processing** — Sequential processing acceptable for MVP; optimize when we see performance issues

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| File Upload + Validation | HIGH | LOW | P1 (v2.0) |
| Strategy Pattern (ListMode + ProfileMode) | HIGH | MEDIUM | P1 (v2.0) |
| Atomic Batch Operations | HIGH | MEDIUM | P1 (v2.0) |
| JSONB Storage + Traceability | MEDIUM | LOW | P1 (v2.0) |
| Real-time Validation Feedback | HIGH | MEDIUM | P1 (v2.0) |
| Progress Indicators | MEDIUM | LOW | P1 (v2.0) |
| Error Export | HIGH | MEDIUM | P2 (v2.x) |
| Data Preview | HIGH | MEDIUM | P2 (v2.x) |
| Upload History/Audit Trail | MEDIUM | MEDIUM | P2 (v2.x) |
| Duplicate Detection | MEDIUM | MEDIUM | P2 (v2.x) |
| Data Normalization Preview | MEDIUM | MEDIUM | P2 (v2.x) |
| Smart Column Mapping | LOW | HIGH | P3 (v3+) |
| Incremental Uploads | LOW | MEDIUM | P3 (v3+) |
| Schema Versioning | LOW | HIGH | P3 (v3+) |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add in v2.x based on user feedback
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Flatfile (CSV Import SaaS) | CSVBox | Our Approach |
|---------|----------------------------|--------|--------------|
| File Format Support | CSV only | CSV/Excel | .xlsx + .csv (table stakes) |
| Validation | Schema-based, real-time | Template matching | Real-time with Strategy Pattern awareness |
| Error Handling | Row-level errors with export | Inline error highlighting | Row-level validation + error export (v2.x) |
| Batch Processing | Async with webhooks | Sync up to 10K rows | Atomic batch with rollback |
| Data Preview | Full preview UI | First 100 rows | First 50 rows (v2.x) |
| Column Mapping | Manual + AI suggestions | Template-based | Manual (v2.0), AI suggestions (v3+) |
| Multi-file Upload | No (single file) | No (single file) | Yes (up to 50 files for ProfileMode) |
| Source Traceability | No | No | Yes (JSONB with file/row/cell metadata) |

**Our Differentiators:**
1. **Strategy Pattern**: Only solution that handles both row-based (ListMode) and file-per-entity (ProfileMode) ingestion
2. **Multi-file Support**: ProfileMode users often have 20-50 individual client sheets to upload simultaneously
3. **Source Traceability**: Every data point tracks its origin (file, row, cell) for debugging and audit
4. **B2B Form-Filling Context**: Competitors focus on generic data import; we optimize for form population workflows

## Implementation Recommendations for v2.0

### Phase 1: Core Upload Infrastructure
1. File upload with Multer (NestJS standard)
2. File type and size validation
3. Parse .xlsx with SheetJS, .csv with built-in parser
4. Strategy detection (headers in row 1 = ListMode, cell addresses = ProfileMode)

### Phase 2: Validation Engine
1. Schema-based validation (Zod schemas)
2. Per-row validation with error collection
3. Data type normalization (Excel dates to ISO strings, etc.)
4. Validation result summary

### Phase 3: Storage Layer
1. PostgreSQL JSONB column for parsed data
2. Source traceability metadata (fileName, rowIndex, cellAddress)
3. Atomic batch insert with transaction
4. Rollback on validation failure

### Phase 4: UX Polish
1. Upload progress indicator (frontend)
2. Processing status tracking
3. Success/failure messaging
4. Basic error list display

**Defer to v2.x:**
- Error export as downloadable file
- Data preview table UI
- Upload history/audit log
- Duplicate detection

## Sources

**B2B SaaS Best Practices:**
- [Design and Implementation of CSV/Excel Upload for SaaS](https://www.kalzumeus.com/2015/01/28/design-and-implementation-of-csvexcel-upload-for-saas/)
- [How to build a CSV importer for your SaaS](https://blog.csvbox.io/csv-importer-saas/)
- [Building a Seamless CSV Import Experience with Flatfile](https://flatfile.com/blog/optimizing-csv-import-experiences-flatfile-portal/)

**File Upload UX:**
- [User experience for B2B SaaS: Error handling](https://medium.com/design-bootcamp/user-experience-for-b2b-saas-error-handling-2a599045d5a1)
- [UX Case Study: Bulk Upload Feature](https://bootcamp.uxdesign.cc/ux-case-study-bulk-upload-feature-785803089328)
- [UX best practices for designing a file uploader](https://uploadcare.com/blog/file-uploader-ux-best-practices/)

**Data Ingestion Architecture:**
- [Data Ingestion — Part 1: Architectural Patterns](https://medium.com/the-modern-scientist/the-art-of-data-ingestion-powering-analytics-from-operational-sources-467552d6c9a2)
- [10 Best Practices in Data Ingestion](https://www.shaped.ai/blog/10-best-practices-in-data-ingestion)
- [Common B2B SaaS Integration Patterns](https://prismatic.io/blog/common-b2b-saas-integration-patterns-when-to-use/)

**Atomic Operations:**
- [Transactions and batched writes | Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Transactions and batch queries | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Database transactions | Django documentation](https://docs.djangoproject.com/en/6.0/topics/db/transactions/)

**Excel Parsing:**
- [xlsx (SheetJS) - npm](https://www.npmjs.com/package/xlsx)
- [ExcelJS - npm](https://www.npmjs.com/package/exceljs)
- [read-excel-file - npm](https://www.npmjs.com/package/read-excel-file)

**File Size Limits:**
- [File Upload - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [How to upload large files: Developer guide](https://uploadcare.com/blog/handling-large-file-uploads/)

---
*Feature research for: v2.0 Data Ingestion Engine*
*Researched: 2026-01-29*
