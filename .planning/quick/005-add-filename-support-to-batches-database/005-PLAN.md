---
phase: quick-005
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts
  - apps/api/src/core/entities/batch.entity.ts
  - apps/api/src/infrastructure/database/drizzle/mappers/batch.mapper.ts
  - apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
  - apps/api/src/infrastructure/excel/ingestion.service.ts
  - apps/api/src/core/use-cases/batch/create-batch.use-case.ts
  - apps/api/src/presentation/controllers/batch.controller.ts
  - apps/web/lib/api/schemas/batch.schema.ts
  - apps/web/components/projects/batch-card.tsx
  - apps/web/components/projects/batch-detail-header.tsx
autonomous: true

must_haves:
  truths:
    - "Uploaded file's original name is persisted in the database"
    - "API returns the batch name in list and detail responses"
    - "BatchCard shows the filename (or 'Sem nome' fallback) as a title"
    - "BatchDetailHeader shows the filename (or 'Sem nome' fallback) as a title"
    - "Old batches without a name display 'Sem nome' gracefully"
  artifacts:
    - path: "apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts"
      provides: "nullable name varchar column on ingestion_batches"
      contains: "name"
    - path: "apps/api/src/core/entities/batch.entity.ts"
      provides: "name field on Batch interface and CreateBatchData"
      contains: "name"
    - path: "apps/web/lib/api/schemas/batch.schema.ts"
      provides: "name field in batchResponseSchema"
      contains: "name"
    - path: "apps/web/components/projects/batch-card.tsx"
      provides: "batch.name display with fallback"
      contains: "Sem nome"
    - path: "apps/web/components/projects/batch-detail-header.tsx"
      provides: "batch.name display with fallback"
      contains: "Sem nome"
  key_links:
    - from: "apps/api/src/presentation/controllers/batch.controller.ts"
      to: "apps/api/src/infrastructure/excel/ingestion.service.ts"
      via: "passes first file's originalName through use case -> ingestion"
      pattern: "originalname|originalName"
    - from: "apps/api/src/infrastructure/excel/ingestion.service.ts"
      to: "apps/api/src/core/repositories/batch.repository.ts"
      via: "includes name in CreateBatchData"
      pattern: "name.*files.*originalName"
    - from: "apps/web/lib/api/schemas/batch.schema.ts"
      to: "apps/web/components/projects/batch-card.tsx"
      via: "BatchResponse type includes name field"
      pattern: "batch\\.name"
---

<objective>
Add a `name` column to `ingestion_batches` so the original filename is persisted from upload through to the UI.

Purpose: Users currently cannot identify which file a batch came from. After this change, the original filename (e.g., "teste-clientes.xlsx") will be clearly visible in BatchCard and BatchDetailHeader.

Output: Database migration, updated backend entities/services/controller, updated frontend schema and components.
</objective>

<execution_context>
@/Users/luanmartins/.claude/get-shit-done/workflows/execute-plan.md
@/Users/luanmartins/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Key files to understand the current state:

@apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts
@apps/api/src/core/entities/batch.entity.ts
@apps/api/src/core/repositories/batch.repository.ts
@apps/api/src/infrastructure/database/drizzle/mappers/batch.mapper.ts
@apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
@apps/api/src/infrastructure/excel/ingestion.service.ts
@apps/api/src/core/use-cases/batch/create-batch.use-case.ts
@apps/api/src/presentation/controllers/batch.controller.ts
@apps/web/lib/api/schemas/batch.schema.ts
@apps/web/components/projects/batch-card.tsx
@apps/web/components/projects/batch-detail-header.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add name column to Drizzle schema and generate migration</name>
  <files>
    apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts
  </files>
  <action>
    Add a `name` column to the `ingestionBatches` table in the Drizzle schema. The column should be:
    - Type: `varchar('name', { length: 255 })`
    - Nullable (no `.notNull()`) so existing rows are unaffected
    - Place it after the `mode` field, before `status`, for logical grouping

    The column definition:
    ```typescript
    import { varchar } from 'drizzle-orm/pg-core'; // add varchar to the existing import
    // ...
    name: varchar('name', { length: 255 }),
    ```

    After updating the schema, generate the Drizzle migration from the `apps/api` directory:
    ```bash
    cd apps/api && npx drizzle-kit generate
    ```

    This will create a new SQL file in `apps/api/drizzle/` (e.g., `0004_*.sql`). Verify the generated SQL contains an `ALTER TABLE "ingestion_batches" ADD COLUMN "name" varchar(255);` statement.

    Then push the migration to the local database:
    ```bash
    cd apps/api && npx drizzle-kit push
    ```
  </action>
  <verify>
    - The schema file includes the `name` column definition with `varchar('name', { length: 255 })`
    - A new migration file exists in `apps/api/drizzle/` containing the ALTER TABLE statement
    - `npx drizzle-kit push` completes without errors
  </verify>
  <done>
    The `ingestion_batches` table has a nullable `name` varchar(255) column, and the Drizzle schema reflects it.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update backend entities, mapper, repository, ingestion service, and controller</name>
  <files>
    apps/api/src/core/entities/batch.entity.ts
    apps/api/src/infrastructure/database/drizzle/mappers/batch.mapper.ts
    apps/api/src/infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
    apps/api/src/infrastructure/excel/ingestion.service.ts
    apps/api/src/core/use-cases/batch/create-batch.use-case.ts
    apps/api/src/presentation/controllers/batch.controller.ts
  </files>
  <action>
    **1. batch.entity.ts** - Add `name` field to both interfaces:

    In the `Batch` interface, add:
    ```typescript
    name: string | null;
    ```
    Place it after `mode`, before `status`.

    In the `CreateBatchData` interface, add:
    ```typescript
    name?: string | null;
    ```
    This is optional because old code paths might not provide it.

    **2. batch.mapper.ts** - Map the `name` field from DB row to domain:

    In `BatchMapper.toDomain()`, add to the return object:
    ```typescript
    name: row.name ?? null,
    ```

    **3. drizzle-batch.repository.ts** - Include `name` in the insert values:

    In the `create` method, add `name` to the `.values()` object:
    ```typescript
    name: data.name ?? null,
    ```

    **4. ingestion.service.ts** - Pass the first file's original name as the batch name:

    In the `IngestInput` interface, add:
    ```typescript
    name?: string;
    ```

    In the `ingest()` method, at step 5 where `this.batchRepository.create()` is called, add `name` to the creation data:
    ```typescript
    const batch: Batch = await this.batchRepository.create({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      fileCount: input.files.length,
      rowCount: parseResult.rows.length,
      columnMetadata,
      name: input.name,   // <-- ADD THIS
    });
    ```

    **5. create-batch.use-case.ts** - Pass the first file's originalName to the ingestion service:

    In the `CreateBatchInput` interface, add:
    ```typescript
    name?: string;
    ```

    In the `execute()` method, pass `name` to `this.ingestionService.ingest()`:
    ```typescript
    const result = await this.ingestionService.ingest({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      files: input.files,
      name: input.name,   // <-- ADD THIS
    });
    ```

    **6. batch.controller.ts** - Extract the first file's original name and pass it:

    In the `create()` method, after the `uploadedFiles` validation block and before delegating to the use case, extract the name:
    ```typescript
    const batchName = uploadedFiles[0]?.originalname;
    ```

    Then pass it to `this.createBatch.execute()`:
    ```typescript
    return this.createBatch.execute({
      projectId,
      userId: user.id,
      mode: validated.mode,
      files,
      name: batchName,   // <-- ADD THIS
    });
    ```

    Important: Use `uploadedFiles[0]?.originalname` (the Express.Multer.File property, lowercase 'n') NOT `files[0]?.originalName` (the mapped ExcelFileInput). The original Multer filename is the actual user-uploaded filename.
  </action>
  <verify>
    - `cd apps/api && npx tsc --noEmit` compiles without errors
    - `cd apps/api && npm run test` passes (existing tests still work; the field is optional/nullable so no tests break)
    - Manually trace: controller extracts originalname -> use case passes name -> ingestion service passes name -> repository inserts name -> mapper returns name
  </verify>
  <done>
    The full backend pipeline persists the first uploaded file's original name as `batch.name`, and all existing endpoints (list, getById) return it.
  </done>
</task>

<task type="auto">
  <name>Task 3: Update frontend schema and display batch name in UI</name>
  <files>
    apps/web/lib/api/schemas/batch.schema.ts
    apps/web/components/projects/batch-card.tsx
    apps/web/components/projects/batch-detail-header.tsx
  </files>
  <action>
    **1. batch.schema.ts** - Add `name` to the Zod schema:

    In `batchResponseSchema`, add:
    ```typescript
    name: z.string().nullable().optional(),
    ```
    Use `.nullable().optional()` because: existing records have no `name` (the column is nullable in DB), and the API may return `null` or omit it entirely for old records. Place it after `mode`, before `status`.

    **2. batch-card.tsx** - Display the batch name prominently:

    Add a `FileSpreadsheet` icon import from lucide-react (add to existing import):
    ```typescript
    import { Calendar, ChevronRight, FileSpreadsheet, Rows } from "lucide-react";
    ```

    Inside the `BatchCard` component, add the batch name as the first element in the flex column (before the Calendar date line). Use `batch.name` with a fallback:
    ```tsx
    <div className="flex items-center gap-2 text-sm font-medium">
      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
      <span>{batch.name ?? "Sem nome"}</span>
    </div>
    ```

    This goes as the FIRST child of the `<div className="flex flex-col gap-3 flex-1">` container, BEFORE the Calendar date div.

    **3. batch-detail-header.tsx** - Show the batch name as a title:

    Add a `FileSpreadsheet` icon import from lucide-react (add to existing import):
    ```typescript
    import { Calendar, FileSpreadsheet, Rows } from "lucide-react";
    ```

    Inside the Card/CardContent, add the batch name as a title BEFORE the badges/metadata row. Insert it between the `<CardContent>` opening tag and the existing `<div className="flex flex-wrap items-center gap-4">`:
    ```tsx
    <CardContent className="p-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
        {batch.name ?? "Sem nome"}
      </h2>
      <div className="flex flex-wrap items-center gap-4">
        {/* existing badges and metadata */}
      </div>
    </CardContent>
    ```

    Also update the breadcrumb: replace the hardcoded "Importacao" BreadcrumbPage text with the batch name (or fallback):
    ```tsx
    <BreadcrumbPage>{batch.name ?? "Importacao"}</BreadcrumbPage>
    ```
  </action>
  <verify>
    - `cd apps/web && npx tsc --noEmit` compiles without errors
    - The `BatchResponse` type now includes `name?: string | null`
    - BatchCard renders batch.name with "Sem nome" fallback
    - BatchDetailHeader renders batch.name as title with "Sem nome" fallback and in breadcrumb
    - Run `npm run lint` from repo root to verify no lint issues
  </verify>
  <done>
    Frontend displays the batch filename. New batches show the uploaded filename (e.g., "teste-clientes.xlsx"). Old batches gracefully display "Sem nome".
  </done>
</task>

</tasks>

<verification>
1. Full-stack type check: `npm run type-check` from repo root passes
2. API tests: `npm run test --filter=@populatte/api` passes
3. Lint: `npm run lint` from repo root passes
4. Manual end-to-end: Upload an Excel file via the API or web UI, then verify:
   - The `ingestion_batches` row has a non-null `name` value matching the original filename
   - The list batches API response includes `name`
   - The get batch API response includes `name`
   - BatchCard in the project page shows the filename
   - BatchDetailHeader on the batch detail page shows the filename as a title
5. Old data: Existing batches (where `name IS NULL`) display "Sem nome" in both components
</verification>

<success_criteria>
- Database has nullable `name` column on `ingestion_batches`
- Drizzle migration file generated and applied
- Upload flow persists first file's original name as batch name
- API list/detail endpoints return `name` field
- BatchCard and BatchDetailHeader display `batch.name` with "Sem nome" fallback
- All type checks, tests, and linting pass
</success_criteria>

<output>
After completion, create `.planning/quick/005-add-filename-support-to-batches-database/005-SUMMARY.md`
</output>
