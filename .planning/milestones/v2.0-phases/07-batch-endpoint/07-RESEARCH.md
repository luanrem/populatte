# Phase 7: Batch Endpoint - Research

**Date:** 2026-01-29
**Phase:** Batch Endpoint (HTTP endpoint accepts multipart file uploads with authentication, delegating to the use case)

---

## Research Question
What do I need to know to PLAN this phase well?

---

## 1. Existing Codebase Patterns

### 1.1 Controller Architecture

#### Controller organization
The codebase follows a **modular structure** where each feature domain has its own module and controller:

- `ProjectController` in `ProjectModule` - handles `/projects` routes
- `UserController` in `AuthModule` - handles `/users` routes
- Controllers are registered in their respective feature modules, not in `AppModule`

**Decision for Phase 7:** Create standalone `BatchController` within a new `BatchModule` since batches are a distinct resource with their own lifecycle. Route will be `/projects/:projectId/batches` following REST resource nesting.

#### Authentication pattern
All existing controllers use **`@UseGuards(ClerkAuthGuard)`** at the class level:

```typescript
@Controller('projects')
@UseGuards(ClerkAuthGuard)
export class ProjectController {
  // All routes automatically require authentication
}
```

**ClerkAuthGuard behavior:**
- Extracts Bearer token from `Authorization` header
- Verifies token with Clerk service
- Syncs user data to local database (upsert on every request)
- Attaches `User` entity to `request.user` (typed as `AuthenticatedRequest`)
- Throws `UnauthorizedException` (401) for missing/invalid tokens
- Throws `ServiceUnavailableException` (503) for database sync failures

#### User extraction pattern
Controllers extract authenticated user via **`@CurrentUser()` custom decorator**:

```typescript
@Post()
public async create(
  @Body() body: CreateProjectDto,
  @CurrentUser() user: User,  // ← Extracts user.id for use case
) {
  return this.createProject.execute({
    userId: user.id,
    // ... other fields
  });
}
```

**Decorator implementation:**
```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;  // Attached by ClerkAuthGuard
  },
);
```

**Decision for Phase 7:** Use `@CurrentUser() user: User` to extract `user.id` for ownership validation in the use case.

### 1.2 Validation Patterns

#### Request body validation
All existing controllers use **`ZodValidationPipe`** with Zod schemas for type-safe validation:

```typescript
@Post()
public async create(
  @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectDto,
  @CurrentUser() user: User,
) {
  // body is fully validated and typed
}
```

**ZodValidationPipe behavior:**
- Parses request body with Zod schema
- Throws `BadRequestException` (400) with structured error messages on validation failure:
  ```json
  {
    "message": "Validation failed",
    "errors": [
      { "field": "name", "message": "Required" }
    ]
  }
  ```

**Zod schema pattern:**
```typescript
// apps/api/src/presentation/dto/project.dto.ts
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  // ...
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
```

**Decision for Phase 7:** Create `createBatchSchema` in `apps/api/src/presentation/dto/batch.dto.ts` for validating the `mode` field from multipart form data.

### 1.3 Response Patterns

#### Success responses
Controllers return **plain objects** (no explicit status codes for 200/201):

```typescript
@Post()
public async create(...) {
  return this.createProject.execute({...});
  // Returns: { id, name, status, createdAt, ... }
  // NestJS sends 201 Created by default for POST
}
```

**Pattern:** POST methods automatically return `201 Created` in NestJS. No explicit `@HttpCode()` needed unless changing default.

#### Error responses
No custom exception filters found - relies on **NestJS built-in exception handling**:

- `NotFoundException` → 404
- `ForbiddenException` → 403
- `BadRequestException` → 400
- `UnauthorizedException` → 401

**CreateBatchUseCase error patterns:**
```typescript
// From Phase 5 implementation
throw new NotFoundException('Project not found');        // 404
throw new NotFoundException('Project is archived');      // 404
throw new ForbiddenException('Access denied');          // 403
```

**Decision for Phase 7:** Follow existing error handling pattern. Controller delegates to use case, which throws appropriate exceptions. No custom error filters needed.

#### Location header for 201 responses
**No existing pattern found** in the codebase for adding `Location` headers. `ProjectController.create()` does not set a `Location` header.

**Decision for Phase 7:** Omit `Location` header initially to match existing API patterns. Can be added later if REST compliance becomes a priority.

### 1.4 Module Structure

#### Dependency injection pattern
Modules register **use cases as providers** and export them for injection into controllers:

```typescript
// apps/api/src/infrastructure/project/project.module.ts
@Module({
  controllers: [ProjectController],
  providers: [
    CreateProjectUseCase,
    ListProjectsUseCase,
    // ...
  ],
})
export class ProjectModule {}
```

**IngestionModule pattern:**
```typescript
// apps/api/src/infrastructure/excel/ingestion.module.ts
@Module({
  imports: [ExcelModule],
  providers: [IngestionService, CreateBatchUseCase],
  exports: [IngestionService, CreateBatchUseCase],  // ← Exported for controller
})
export class IngestionModule {}
```

**Decision for Phase 7:** Create `BatchModule` that imports `IngestionModule` to access `CreateBatchUseCase` for dependency injection into `BatchController`.

---

## 2. NestJS Multer File Upload

### 2.1 FilesInterceptor for Multiple Files

**NestJS provides `@UseInterceptors(FilesInterceptor())` for handling multiple files with the same field name.**

#### Basic usage pattern
```typescript
@Post('upload')
@UseInterceptors(FilesInterceptor('files'))  // 'files' = form field name
uploadFile(@UploadedFiles() files: Array<Express.Multer.File>) {
  console.log(files);
}
```

**Parameters:**
1. `fieldName` (string) - Form field name containing files (e.g., `'documents'`)
2. `maxCount` (number, optional) - Maximum number of files allowed
3. `options` (MulterOptions, optional) - Multer configuration (validation, storage)

#### Type: Express.Multer.File
When using **memory storage** (default), uploaded files are available as:

```typescript
interface Express.Multer.File {
  fieldname: string;        // Form field name
  originalname: string;     // Client's filename
  encoding: string;         // File encoding
  mimetype: string;         // MIME type (e.g., 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  size: number;             // File size in bytes
  buffer: Buffer;           // File contents (when using memory storage)
  // ... other fields for disk storage
}
```

**Mapping to CreateBatchInput:**
The `CreateBatchUseCase` expects:
```typescript
export interface ExcelFileInput {
  buffer: Buffer;
  originalName: string;
}
```

**Transformation in controller:**
```typescript
const files: ExcelFileInput[] = uploadedFiles.map(file => ({
  buffer: file.buffer,
  originalName: file.originalname,
}));
```

### 2.2 File Validation Options

**Multer options for validation:**
```typescript
@UseInterceptors(FilesInterceptor('documents', 10, {
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB max per file
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.match(/\/(vnd\.ms-excel|vnd\.openxmlformats)$/)) {
      return callback(new Error('Only Excel files allowed'), false);
    }
    callback(null, true);
  }
}))
```

**Decision for Phase 7:** Implement basic file size validation (10 MB max) and Excel MIME type filtering in `FilesInterceptor` options. Detailed parsing validation happens in `IngestionService`.

### 2.3 Memory Storage vs Disk Storage

**NestJS Multer defaults to memory storage** (files stored in RAM as `Buffer`).

**Memory storage benefits:**
- No filesystem cleanup required
- No temporary file paths to manage
- Direct buffer access for parsing

**Decision for Phase 7:** Use default memory storage since:
- Excel files are small (< 10 MB)
- Files are immediately parsed and discarded
- No need for persistent storage at this layer

### 2.4 Form Data Parsing

**Multipart form data structure for batch upload:**
```
POST /projects/:projectId/batches
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="mode"

LIST_MODE
------WebKitFormBoundary...
Content-Disposition: form-data; name="documents"; filename="clients.xlsx"
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

[binary data]
------WebKitFormBoundary...--
```

**Extracting non-file fields:**
- **`mode` field:** Extract with `@Body('mode')` decorator (works with multipart)
- **Files:** Extract with `@UploadedFiles()` decorator

**Example controller signature:**
```typescript
@Post(':projectId/batches')
@UseInterceptors(FilesInterceptor('documents'))
async createBatch(
  @Param('projectId') projectId: string,
  @Body('mode') mode: string,
  @UploadedFiles() files: Array<Express.Multer.File>,
  @CurrentUser() user: User,
) {
  // Validate mode with Zod
  // Transform files to ExcelFileInput[]
  // Call use case
}
```

**Decision for Phase 7:** Use `@Body('mode')` to extract mode field from multipart form data, then validate with `ZodValidationPipe` inline or manually with Zod schema.

---

## 3. Response Shape Design

### 3.1 Success Response (201 Created)

**Use case returns:**
```typescript
export interface CreateBatchResult {
  batchId: string;
  rowCount: number;
  mode: BatchMode;
  fileCount: number;
}
```

**Controller response (matching CONTEXT.md spec):**
```typescript
{
  "batchId": "cm123abc...",
  "rowCount": 150,
  "createdAt": "2026-01-29T12:34:56.789Z"
}
```

**Additional fields from use case (`mode`, `fileCount`) should be included?**
- **Decision:** Include all fields from use case result for client-side display. API consumers may want to confirm mode and file count.

**Final response shape:**
```typescript
{
  "id": "cm123abc...",          // Use 'id' instead of 'batchId' for REST consistency
  "projectId": "cm456def...",   // Include for context
  "mode": "LIST_MODE",
  "rowCount": 150,
  "fileCount": 2,
  "createdAt": "2026-01-29T12:34:56.789Z"
}
```

### 3.2 Error Response Shape

**Existing error pattern (from ZodValidationPipe):**
```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Required" }
  ]
}
```

**NestJS built-in exception format:**
```json
{
  "statusCode": 404,
  "message": "Project not found",
  "error": "Not Found"
}
```

**Decision for Phase 7:** Rely on NestJS built-in exception handling. No custom error shapes needed at this phase.

### 3.3 HTTP Status Code Mapping

| Scenario | Exception | Status Code |
|----------|-----------|-------------|
| Success | N/A | 201 Created |
| Missing/invalid auth token | `UnauthorizedException` | 401 Unauthorized |
| User doesn't own project | `ForbiddenException` | 403 Forbidden |
| Project not found | `NotFoundException` | 404 Not Found |
| Project is archived | `NotFoundException` | 404 Not Found |
| Invalid mode field | `BadRequestException` | 400 Bad Request |
| Invalid file type | `BadRequestException` | 400 Bad Request |
| File too large | `PayloadTooLargeException` | 413 Payload Too Large |
| Excel parsing failure | Exception from use case | 400 Bad Request |

**Decision for Phase 7:** All error handling is delegated to use case layer and NestJS exception system. Controller should not catch/transform exceptions.

---

## 4. Clean Architecture Considerations

### 4.1 Controller Responsibility Boundaries

**ProjectController pattern:**
```typescript
@Post()
public async create(
  @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectDto,
  @CurrentUser() user: User,
) {
  return this.createProject.execute({
    userId: user.id,
    name: body.name,
    description: body.description,
    targetEntity: body.targetEntity,
    targetUrl: body.targetUrl,
  });
}
```

**Controller responsibilities:**
1. Extract request data (params, body, files, user)
2. Validate request shape (Zod schemas, Multer options)
3. Transform HTTP-specific types (`Express.Multer.File` → `ExcelFileInput`)
4. Delegate to use case with clean domain inputs
5. Return use case result as HTTP response

**Controller SHOULD NOT:**
- Parse Excel files
- Validate business rules (ownership, project existence)
- Perform database operations
- Transform domain entities to DTOs (use cases return presentable data)

**Decision for Phase 7:** BatchController is a thin HTTP adapter that:
- Validates HTTP-level concerns (auth, file size, MIME type)
- Transforms `Express.Multer.File[]` to `ExcelFileInput[]`
- Delegates to `CreateBatchUseCase.execute()`
- Returns use case result unchanged

### 4.2 Ownership Validation Placement

**CreateBatchUseCase already validates ownership:**
```typescript
// Step 1: Find project WITHOUT userId filter (enables separate 404/403)
const project = await this.projectRepository.findByIdOnly(input.projectId);

if (!project) {
  throw new NotFoundException('Project not found');
}

// Step 2: Check if soft-deleted
if (project.deletedAt) {
  throw new NotFoundException('Project is archived');
}

// Step 3: Validate ownership (403 with security audit log)
if (project.userId !== input.userId) {
  this.logger.warn(
    `Unauthorized batch creation attempt - userId: ${input.userId}, projectId: ${input.projectId}`,
  );
  throw new ForbiddenException('Access denied');
}
```

**Decision for Phase 7:** Controller does NOT validate ownership. This is a business rule that belongs in the use case layer. Controller simply passes `userId` from `@CurrentUser()` to the use case.

---

## 5. Implementation Decisions

### 5.1 Route Design

**URL:** `POST /projects/:projectId/batches`
**Controller class:** `@Controller('projects/:projectId/batches')`
**Method route:** `@Post()`

**Rationale:** REST convention for creating a nested resource (batches belong to projects).

### 5.2 Field Names

**File upload field:** `documents` (not `files`) - per user preference for semantic clarity.

**Mode field delivery:** Form field in multipart body (not query parameter).
- **Rationale:** POST data should be in body, not URL. Query parameters are typically for filtering/options on GET requests.

**Validation:**
```typescript
const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode),
});
```

### 5.3 Controller Organization

**Standalone BatchController in new BatchModule:**
```typescript
// apps/api/src/infrastructure/batch/batch.module.ts
@Module({
  imports: [IngestionModule],  // Provides CreateBatchUseCase
  controllers: [BatchController],
  providers: [],
})
export class BatchModule {}
```

**Rationale:**
- Batches are a distinct resource with their own lifecycle
- Keeps ProjectModule focused on project CRUD operations
- Allows future expansion (GET /batches, DELETE /batches/:id)

### 5.4 File Path Structure

**New files to create:**
1. `apps/api/src/presentation/controllers/batch.controller.ts` - HTTP handler
2. `apps/api/src/presentation/dto/batch.dto.ts` - Zod schema for mode validation
3. `apps/api/src/infrastructure/batch/batch.module.ts` - Module wiring
4. Update `apps/api/src/app.module.ts` - Import `BatchModule`
5. Update `apps/api/src/presentation/controllers/index.ts` - Export `BatchController`

---

## 6. Technical Specifications

### 6.1 Dependencies

**Already installed:**
- `@nestjs/platform-express` (v11.0.1) - Provides `FileInterceptor`, `FilesInterceptor`
- `@nestjs/common` - Provides `@UploadedFile()`, `@UploadedFiles()` decorators

**Type definitions:**
- `Express.Multer.File` type is available from `@types/express` (bundled with `@nestjs/platform-express`)

**No additional dependencies needed.**

### 6.2 File Size Limits

**Recommendation:** 10 MB max per file
- Excel files are typically < 5 MB
- Provides buffer for larger datasets
- Prevents memory exhaustion from malicious uploads

**Implementation:**
```typescript
@UseInterceptors(FilesInterceptor('documents', 20, {
  limits: { fileSize: 10 * 1024 * 1024 },
}))
```

### 6.3 MIME Type Validation

**Valid Excel MIME types:**
- `application/vnd.ms-excel` (XLS)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)

**Implementation:**
```typescript
fileFilter: (req, file, callback) => {
  const allowedMimeTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new BadRequestException('Only Excel files (.xls, .xlsx) are allowed'), false);
  }

  callback(null, true);
}
```

### 6.4 Maximum File Count

**Recommendation:** 20 files max
- ListMode: expects exactly 1 file (validated by strategy)
- ProfileMode: expects 1-N files (typically 2-10 profiles)
- 20 provides headroom without risk of resource exhaustion

**Implementation:**
```typescript
@UseInterceptors(FilesInterceptor('documents', 20, {...}))
```

---

## 7. Testing Considerations

### 7.1 Test Scenarios

**Happy path:**
1. Upload single Excel file with `mode=LIST_MODE`
2. Upload multiple Excel files with `mode=PROFILE_MODE`
3. Returns 201 with `{ id, projectId, mode, rowCount, fileCount, createdAt }`

**Error scenarios:**
1. Missing auth token → 401
2. Invalid/expired token → 401
3. User doesn't own project → 403
4. Project not found → 404
5. Project is archived → 404
6. Missing mode field → 400
7. Invalid mode value → 400
8. No files uploaded → 400 (from use case)
9. File too large → 413
10. Invalid file type (not Excel) → 400
11. Corrupted Excel file → 400 (from IngestionService)

### 7.2 Integration Test Pattern

**Existing test pattern (to be followed):**
```typescript
describe('BatchController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /projects/:projectId/batches - success', () => {
    return request(app.getHttpServer())
      .post('/projects/cm123/batches')
      .set('Authorization', 'Bearer valid-token')
      .field('mode', 'LIST_MODE')
      .attach('documents', 'test/fixtures/clients.xlsx')
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('rowCount');
      });
  });
});
```

---

## 8. Open Questions & Decisions

### 8.1 Location Header

**Question:** Should we include `Location` header in 201 response?
**Decision:** **No** - No existing pattern in codebase. Defer to maintain consistency.

### 8.2 Response Field Naming

**Question:** Use `batchId` or `id` in response?
**Decision:** Use **`id`** to match REST conventions (resource responses use `id` field).

### 8.3 Mode Field Validation Placement

**Question:** Validate mode field in controller with ZodValidationPipe or in use case?
**Decision:** **Controller** - HTTP layer should validate request shape. Use case assumes valid enum.

**Implementation:**
```typescript
const validatedMode = createBatchSchema.parse({ mode }).mode;
```

### 8.4 Include ProjectId in Response

**Question:** Should response include `projectId` field?
**Decision:** **Yes** - Client may need confirmation of which project the batch belongs to, especially in error recovery scenarios.

---

## 9. Summary for Planning

### Key Implementation Steps

1. **Create DTOs** (`apps/api/src/presentation/dto/batch.dto.ts`):
   - `createBatchSchema` with `mode` field validation
   - `CreateBatchDto` type inference

2. **Create BatchController** (`apps/api/src/presentation/controllers/batch.controller.ts`):
   - Route: `POST /projects/:projectId/batches`
   - Guards: `@UseGuards(ClerkAuthGuard)`
   - Interceptors: `@UseInterceptors(FilesInterceptor('documents', 20, {...}))`
   - Extract: `projectId`, `mode`, `files`, `user`
   - Transform: `Express.Multer.File[]` → `ExcelFileInput[]`
   - Delegate: `CreateBatchUseCase.execute()`
   - Return: Use case result with `id`, `projectId`, `mode`, `rowCount`, `fileCount`, `createdAt`

3. **Create BatchModule** (`apps/api/src/infrastructure/batch/batch.module.ts`):
   - Import `IngestionModule` (provides `CreateBatchUseCase`)
   - Register `BatchController`

4. **Update AppModule** (`apps/api/src/app.module.ts`):
   - Import `BatchModule`

5. **Export BatchController** (`apps/api/src/presentation/controllers/index.ts`):
   - Add to barrel export

### Critical Constraints

- **No business logic in controller** - All validation/orchestration in use case
- **Use existing patterns** - Follow ProjectController structure exactly
- **Memory storage only** - No disk writes at HTTP layer
- **Delegate error handling** - Let NestJS exception system handle all errors
- **Type safety** - Full TypeScript types for all transformations

### Dependencies on Other Phases

- **Phase 5 (CreateBatchUseCase):** ✅ Complete
- **Phase 8 (Excel strategies):** ✅ Complete
- **Phase 9 (Repository implementations):** ✅ Complete
- **ClerkAuthGuard:** ✅ Exists
- **@CurrentUser decorator:** ✅ Exists

**All dependencies satisfied. Ready for planning.**

---

## References

**Codebase Files Analyzed:**
- `/apps/api/src/presentation/controllers/project.controller.ts` - Controller pattern
- `/apps/api/src/presentation/controllers/user.controller.ts` - Auth guard usage
- `/apps/api/src/presentation/dto/project.dto.ts` - Zod schema pattern
- `/apps/api/src/presentation/pipes/zod-validation.pipe.ts` - Validation pipe
- `/apps/api/src/presentation/decorators/current-user.decorator.ts` - User extraction
- `/apps/api/src/infrastructure/auth/guards/clerk-auth.guard.ts` - Auth guard implementation
- `/apps/api/src/infrastructure/project/project.module.ts` - Module structure
- `/apps/api/src/infrastructure/excel/ingestion.module.ts` - Use case registration
- `/apps/api/src/core/use-cases/batch/create-batch.use-case.ts` - Use case interface
- `/apps/api/src/infrastructure/excel/strategies/excel-parsing.strategy.ts` - ExcelFileInput type

**External Documentation:**
- [NestJS File Upload Documentation](https://docs.nestjs.com/techniques/file-upload)
- [File Uploads in NestJS with Multer](https://arnab-k.medium.com/file-uploads-in-nestjs-handling-files-with-multer-f9e15db38a10)
- [How to Handle File Uploads in NestJS with Multer (FreeCodeCamp)](https://www.freecodecamp.org/news/how-to-handle-file-uploads-in-nestjs-with-multer/)
- [NestJS File Upload Tutorial with Multer](https://muhesi.hashnode.dev/mastering-file-uploads-using-nestjs-and-multer)
- [NestJS Type-safe File Uploads](https://notiz.dev/blog/type-safe-file-uploads/)
