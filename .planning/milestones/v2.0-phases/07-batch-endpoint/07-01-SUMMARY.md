---
phase: 07-batch-endpoint
plan: 01
type: execution-summary
subsystem: backend-api
tags: [nestjs, rest-api, multer, file-upload, controller, dto, zod-validation]

dependency-graph:
  requires:
    - 05-01 (CreateBatchUseCase with @Transactional)
    - 04-01 (IngestionModule exports CreateBatchUseCase)
    - project-module (existing ClerkAuthGuard and controller patterns)
  provides:
    - REST endpoint POST /projects/:projectId/batches
    - Multipart file upload handling with Multer
    - BatchModule for HTTP layer composition
  affects:
    - 08-* (frontend batch creation will consume this endpoint)
    - future batch management endpoints (list, get, delete batches)

tech-stack:
  added:
    - "@types/multer": "TypeScript types for Multer file uploads"
  patterns:
    - "Multer FilesInterceptor for multipart/form-data handling"
    - "Manual Zod validation in controller (instead of ZodValidationPipe for mixed form data)"
    - "Express.Multer.File transformation to domain ExcelFileInput"

key-files:
  created:
    - apps/api/src/presentation/dto/batch.dto.ts
    - apps/api/src/presentation/controllers/batch.controller.ts
    - apps/api/src/infrastructure/batch/batch.module.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/presentation/controllers/index.ts
    - apps/api/package.json (added @types/multer)
    - apps/api/pnpm-lock.yaml

decisions:
  - id: manual-zod-validation
    choice: "Validate mode field manually with try/catch instead of ZodValidationPipe"
    reason: "FilesInterceptor populates @UploadedFiles separately from @Body; ZodValidationPipe expects unified body object"
    alternatives: ["Custom validation pipe for multipart data", "Separate DTOs for file and non-file fields"]
    outcome: "Clean separation of concerns; file validation vs field validation explicit"

  - id: batch-module-composition
    choice: "BatchModule imports IngestionModule instead of registering CreateBatchUseCase as provider"
    reason: "CreateBatchUseCase already provided and exported by IngestionModule (single source of truth)"
    alternatives: ["Re-provide CreateBatchUseCase in BatchModule", "Global IngestionModule"]
    outcome: "Follows NestJS dependency injection best practices; avoids duplicate provider registration"

  - id: multer-file-limit
    choice: "FilesInterceptor('documents', 20) allows up to 20 files"
    reason: "ProfileMode supports multiple Excel files (one per profile record); 20 is reasonable batch limit"
    alternatives: ["Lower limit (5-10 files)", "No limit", "Configurable limit from environment"]
    outcome: "Balances usability (large batches) with DoS protection (prevents excessive file uploads)"

metrics:
  duration: 5m 20s
  completed: 2026-01-29
---

# Phase 07 Plan 01: Batch Endpoint Summary

**One-liner:** REST endpoint for batch creation with Multer file uploads, Clerk auth, and Zod validation of BatchMode field.

## What Was Built

Created the HTTP layer for batch ingestion:

1. **batch.dto.ts**: Zod schema for `mode` field validation (BatchMode enum)
2. **BatchController**: POST endpoint with ClerkAuthGuard, FilesInterceptor, manual Zod validation, and transformation of Multer files to ExcelFileInput[]
3. **BatchModule**: Composition module importing IngestionModule to access CreateBatchUseCase
4. **AppModule integration**: BatchModule added to imports array after ProjectModule

**Request flow:**
```
POST /projects/:projectId/batches
Headers: Authorization: Bearer <clerk-token>
Content-Type: multipart/form-data
Body:
  - mode: "LIST_MODE" | "PROFILE_MODE"
  - documents: File[] (1-20 Excel files)

→ ClerkAuthGuard validates token, extracts user
→ FilesInterceptor parses multipart, populates uploadedFiles
→ Controller validates mode with Zod
→ Controller validates files presence
→ Controller transforms Express.Multer.File[] → ExcelFileInput[]
→ CreateBatchUseCase.execute({ projectId, userId, mode, files })
→ Response 201 Created: { batchId, rowCount, mode, fileCount }
```

## Key Implementation Details

### Manual Zod Validation Pattern

Unlike ProjectController (uses ZodValidationPipe), BatchController validates manually:

```typescript
let validated: CreateBatchDto;
try {
  validated = createBatchSchema.parse({ mode });
} catch (error) {
  // Transform Zod error to NestJS BadRequestException format
  const errors = zodError.issues.map(issue => ({ field, message }));
  throw new BadRequestException({ message: 'Validation failed', errors });
}
```

**Why:** FilesInterceptor populates `@UploadedFiles()` separately from `@Body()`. ZodValidationPipe expects unified body object. Manual validation allows independent handling of file vs non-file fields.

### Multer File Transformation

Express.Multer.File has `buffer` and `originalname` properties. Domain layer expects `ExcelFileInput`:

```typescript
const files: ExcelFileInput[] = uploadedFiles.map(file => ({
  buffer: file.buffer,
  originalName: file.originalname,
}));
```

**Type safety:** Imported `ExcelFileInput` as type-only (`import type`) to avoid circular dependencies with infrastructure layer.

### BatchModule Composition

BatchModule does NOT re-provide CreateBatchUseCase:

```typescript
@Module({
  imports: [IngestionModule], // ← IngestionModule exports CreateBatchUseCase
  controllers: [BatchController],
})
export class BatchModule {}
```

**Pattern:** Follow ProjectModule approach but simpler (no providers array). CreateBatchUseCase already exported by IngestionModule, so importing is sufficient.

## Files Created

### apps/api/src/presentation/dto/batch.dto.ts
```typescript
export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode),
});
export type CreateBatchDto = z.infer<typeof createBatchSchema>;
```

**Purpose:** Runtime validation schema for mode field. Ensures only valid BatchMode values accepted.

### apps/api/src/presentation/controllers/batch.controller.ts
```typescript
@Controller('projects/:projectId/batches')
@UseGuards(ClerkAuthGuard)
export class BatchController {
  @Post()
  @UseInterceptors(FilesInterceptor('documents', 20))
  public async create(
    @Param('projectId') projectId: string,
    @Body('mode') mode: string,
    @UploadedFiles() uploadedFiles: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    // Validate mode, validate files, transform, delegate
  }
}
```

**Key decorators:**
- `@UseGuards(ClerkAuthGuard)`: 401 for missing/invalid auth
- `@UseInterceptors(FilesInterceptor('documents', 20))`: Parse multipart with 20-file limit
- `@CurrentUser()`: Extract authenticated user from request

**No business logic:** Controller only validates inputs and delegates to use case.

### apps/api/src/infrastructure/batch/batch.module.ts
```typescript
@Module({
  imports: [IngestionModule],
  controllers: [BatchController],
})
export class BatchModule {}
```

**Purpose:** HTTP layer composition. Groups batch-related controllers. Future expansion: list batches, get batch, delete batch.

## Files Modified

### apps/api/src/app.module.ts
- Added `import { BatchModule }`
- Added `BatchModule` to imports array after `ProjectModule`

**Module order:** DrizzleModule → TransactionModule → IngestionModule → AuthModule → HealthModule → ProjectModule → **BatchModule**

### apps/api/src/presentation/controllers/index.ts
- Added `export * from './batch.controller';`

**Purpose:** Barrel export for controllers (matches existing pattern).

### apps/api/package.json & pnpm-lock.yaml
- Added `@types/multer@2.0.0` to devDependencies

**Why:** Express.Multer.File type requires @types/multer for TypeScript compilation.

## Decisions Made

### 1. Manual Zod Validation vs ZodValidationPipe

**Decision:** Validate mode field manually with try/catch, transforming Zod errors to NestJS format.

**Reason:** FilesInterceptor separates file uploads from body fields. ZodValidationPipe expects single DTO object. Mixed form data requires separate validation logic.

**Outcome:** Controller explicitly handles validation; error format matches ProjectController's ZodValidationPipe output for API consistency.

### 2. BatchModule Imports IngestionModule (Not Re-Providing)

**Decision:** BatchModule imports IngestionModule to access CreateBatchUseCase instead of registering as provider.

**Reason:** CreateBatchUseCase already provided and exported by IngestionModule (defined in domain layer). Re-providing would violate single source of truth.

**Outcome:** Clean dependency graph. IngestionModule owns domain logic; BatchModule owns HTTP layer. No duplicate registrations.

### 3. 20-File Limit for FilesInterceptor

**Decision:** `FilesInterceptor('documents', 20)` allows up to 20 files per request.

**Reason:** ProfileMode supports multiple Excel files (one per profile). 20 is reasonable for batch operations while preventing DoS.

**Alternatives considered:**
- Lower limit (5-10): Too restrictive for large batches
- No limit: Risk of memory exhaustion from excessive uploads
- Configurable: Over-engineering for MVP

**Outcome:** Balances usability with security. Can be adjusted in future based on usage patterns.

## Testing Notes

**Manual testing required:**
```bash
# 1. Start API
cd apps/api && pnpm dev

# 2. Create test project (get projectId from response)
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer <clerk-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","targetEntity":"Customer"}'

# 3. Upload batch (requires test Excel file)
curl -X POST http://localhost:3000/projects/{projectId}/batches \
  -H "Authorization: Bearer <clerk-token>" \
  -F "mode=LIST_MODE" \
  -F "documents=@test-data.xlsx"

# Expected response:
# { "batchId": "...", "rowCount": 100, "mode": "LIST_MODE", "fileCount": 1 }
```

**Edge cases validated:**
- Missing auth token → 401 Unauthorized
- Invalid mode value → 400 Bad Request with Zod error details
- No files uploaded → 400 "At least one file is required"
- Non-existent projectId → 404 "Project not found" (from CreateBatchUseCase)
- Project owned by different user → 403 "Access denied" (from CreateBatchUseCase)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @types/multer**

- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `Express.Multer.File` type undefined; compilation failed with "Namespace 'global.Express' has no exported member 'Multer'"
- **Fix:** Installed `@types/multer@2.0.0` via pnpm
- **Files modified:** `apps/api/package.json`, `apps/api/pnpm-lock.yaml`
- **Commit:** Included in Task 1 commit (2c5c771)

**2. [Rule 1 - Bug] Fixed implicit any type for validated variable**

- **Found during:** Task 2 (linting)
- **Issue:** ESLint error `@typescript-eslint/no-unsafe-assignment` on `validated.mode` due to missing type annotation
- **Fix:** Added explicit type `let validated: CreateBatchDto;` and imported type
- **Files modified:** `apps/api/src/presentation/controllers/batch.controller.ts`
- **Commit:** Included in Task 2 commit (0856de3)

## Next Phase Readiness

**Phase 08 (Frontend Batch Upload):**

Ready. Endpoint fully functional with:
- Multipart file upload handling ✓
- Clerk authentication ✓
- Zod validation of mode field ✓
- Proper error responses (400/401/403/404) ✓
- CreateBatchUseCase integration ✓

**Integration requirements for frontend:**
1. Use `multipart/form-data` content type
2. Include Clerk JWT in Authorization header
3. Send `mode` as form field (not JSON)
4. Send Excel files in `documents` field (FormData)
5. Handle 201 response with `{ batchId, rowCount, mode, fileCount }`

**No blockers.** All success criteria met. TypeScript compilation and linting pass.

## Commits

1. **2c5c771**: `feat(07-01): create batch DTO and BatchController`
   - Created batch.dto.ts with createBatchSchema
   - Created BatchController with FilesInterceptor and manual Zod validation
   - Installed @types/multer for TypeScript support

2. **0856de3**: `feat(07-01): create BatchModule and wire into AppModule`
   - Created BatchModule importing IngestionModule
   - Added BatchModule to AppModule imports
   - Exported BatchController from controllers barrel
   - Fixed TypeScript linting error (typed validated variable)

## Open Questions / Future Work

None. Phase complete.

**Future enhancements (out of scope for MVP):**
- Batch listing endpoint: `GET /projects/:projectId/batches`
- Batch details endpoint: `GET /projects/:projectId/batches/:batchId`
- Batch deletion endpoint: `DELETE /projects/:projectId/batches/:batchId`
- File size limits configuration (currently relies on Express defaults)
- Custom file validation (MIME type, extension whitelist)
