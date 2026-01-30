# Phase 10: Batch DTO Validation - Research

**Researched:** 2026-01-29
**Domain:** NestJS DTO validation with Zod v4, multipart form-data handling
**Confidence:** HIGH

## Summary

Phase 10 focuses on ensuring the `CreateBatchDto` uses Zod v4 API correctly and the BatchController remains thin by delegating to the use case without business logic. The codebase already has Zod v4.3.6 installed and established patterns for DTO validation.

**Current state:** BatchController manually validates the `mode` field with Zod's `parse()` method in a try/catch block (Phase 7 decision). The error handling uses Zod v3-style API (`error.issues`), which happens to be v4-compatible. The ZodValidationPipe exists and already uses the correct v4 API.

**Key findings:**
1. Zod v4.3.6 is installed but has peer dependency conflicts with drizzle-orm/drizzle-kit (expect Zod ^3.20.2)
2. Current manual validation in BatchController already uses v4-compatible error handling (`error.issues`)
3. ZodValidationPipe exists and is already v4-compliant
4. Project standard: `{message: 'Validation failed', errors: [{field, message}]}` error format
5. Manual validation was chosen in Phase 7 due to multipart form-data constraints

**Primary recommendation:** The current implementation is already Zod v4-compatible. Focus should be on ensuring consistency, improving error messages if needed, and confirming the pipe vs inline validation decision aligns with multipart form-data requirements.

## Standard Stack

The established libraries/tools for NestJS + Zod validation:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Runtime schema validation | Industry standard for TypeScript-first validation |
| @nestjs/common | 11.0.1 | NestJS core (pipes, exceptions) | Framework foundation for validation patterns |
| @nestjs/platform-express | 11.0.1 | Multer integration | Required for multipart/form-data handling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/multer | 2.0.0 | TypeScript types for Multer | Always (dev dependency for file uploads) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | class-validator + class-transformer | Zod is more TypeScript-native, better type inference, smaller bundle size |
| Manual validation | ZodValidationPipe for all fields | Pipe doesn't work cleanly with multipart mixed data (files + form fields) |
| nestjs-form-data | Native Multer + manual parsing | Third-party library adds dependency but uses class-validator (inconsistent with Zod stack) |

**Installation:**
Already installed. No additional packages needed.

## Architecture Patterns

### Recommended DTO Structure
```
src/presentation/dto/
├── batch.dto.ts           # Batch-related DTOs
├── project.dto.ts         # Project-related DTOs
└── clerk-webhook.dto.ts   # External integration DTOs
```

Each DTO file exports:
1. Zod schema (e.g., `createBatchSchema`)
2. Inferred TypeScript type (e.g., `export type CreateBatchDto = z.infer<typeof createBatchSchema>`)

### Pattern 1: ZodValidationPipe for Regular Endpoints
**What:** Apply ZodValidationPipe directly to `@Body()` decorator for JSON endpoints
**When to use:** Standard POST/PATCH endpoints with `application/json` content-type
**Example:**
```typescript
// Source: apps/api/src/presentation/controllers/project.controller.ts
@Post()
public async create(
  @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectDto,
  @CurrentUser() user: User,
) {
  return this.createProject.execute({
    userId: user.id,
    ...body,
  });
}
```

### Pattern 2: Manual Zod Validation for Multipart Endpoints
**What:** Use `schema.parse()` in try/catch with manual error transformation
**When to use:** Endpoints with `FilesInterceptor` where files and form fields are separate
**Example:**
```typescript
// Source: apps/api/src/presentation/controllers/batch.controller.ts
@Post()
@UseInterceptors(FilesInterceptor('documents', 50))
public async create(
  @Body('mode') mode: string,
  @UploadedFiles() uploadedFiles: Express.Multer.File[],
) {
  let validated: CreateBatchDto;
  try {
    validated = createBatchSchema.parse({ mode });
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: string[]; message: string }> };
      const errors = zodError.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
    throw error;
  }
  // Delegate to use case
}
```

### Pattern 3: Error Format Consistency
**What:** All validation errors use structured format
**Standard format:**
```typescript
{
  message: 'Validation failed',
  errors: [
    { field: 'mode', message: 'Invalid enum value. Expected \'LIST_MODE\' | \'PROFILE_MODE\', received \'INVALID\'' }
  ]
}
```

**Implementation locations:**
- ZodValidationPipe: `apps/api/src/presentation/pipes/zod-validation.pipe.ts`
- Manual validation: `apps/api/src/presentation/controllers/batch.controller.ts`

### Anti-Patterns to Avoid
- **Mixing Zod and class-validator:** Pick one validation library per project
- **Business logic in controllers:** Controllers validate inputs, delegates to use cases
- **Re-parsing in use cases:** Use case receives validated DTOs, trusts controller validation
- **Inconsistent error formats:** All validation errors should use same `{message, errors}` structure

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod error formatting | Custom error mapper | `result.error.issues.map()` pattern | Zod v4 provides structured issues array; custom mappers add complexity |
| Parameter validation pipes | Custom generic pipe | Existing `ZodValidationPipe` | Already exists in codebase, tested, consistent |
| Multipart file validation | Custom Multer configuration | `FilesInterceptor` with limits + custom pipe | NestJS built-in handles parsing, custom pipe for content validation |
| Enum validation | Manual string checks | `z.nativeEnum(EnumType)` | Zod handles TypeScript enums natively, auto-generates error messages |
| UUID validation | Regex or manual parsing | `z.string().uuid()` or top-level `z.uuid()` (v4) | RFC 4122 compliance built-in, handles edge cases |

**Key insight:** Zod v4's error structure (`error.issues`) is designed for transformation. Don't build custom validation layers when Zod's API + simple mapping suffices.

## Common Pitfalls

### Pitfall 1: Zod v3 vs v4 Error API Confusion
**What goes wrong:** Using `error.errors` instead of `error.issues` causes TypeScript errors or runtime failures
**Why it happens:** Documentation and tutorials mix v3 and v4 syntax
**How to avoid:**
- Always use `error.issues` (v4 API)
- ZodValidationPipe already uses correct API (line 11: `result.error.issues.map`)
- Verify with TypeScript strict mode enabled
**Warning signs:**
- TypeScript error: `Property 'errors' does not exist on type 'ZodError'`
- Runtime error accessing undefined property

### Pitfall 2: ZodValidationPipe with Multipart Form-Data
**What goes wrong:** ZodValidationPipe applied to `@Body()` on multipart endpoints fails because Multer separates files from body fields
**Why it happens:** `FilesInterceptor` populates `@UploadedFiles()` separately; pipe receives incomplete data
**How to avoid:**
- Use ZodValidationPipe only for `application/json` endpoints
- For multipart: manually validate form fields, use separate pipe for files
- Phase 7 decision: manual validation chosen for BatchController
**Warning signs:**
- File fields missing from validation
- Validation errors for "required" file fields that were uploaded
- `@UploadedFiles()` populated but validation fails

### Pitfall 3: Zod v4 UUID Strictness
**What goes wrong:** UUIDs that passed v3 validation fail in v4
**Why it happens:** Zod v4 enforces RFC 4122/9562 compliance (variant bits must be `10`)
**How to avoid:**
- Use `z.uuid()` for strict RFC compliance
- Use `z.guid()` for lenient validation (if non-compliant UUIDs needed)
- Test with actual database-generated UUIDs
**Warning signs:**
- Previously working UUID validation suddenly fails
- Error: "Invalid uuid"

### Pitfall 4: Drizzle ORM Zod Peer Dependency Conflict
**What goes wrong:** npm/pnpm reports peer dependency warnings for Zod version mismatch
**Why it happens:** drizzle-orm and drizzle-kit expect Zod ^3.20.2 but project uses 4.3.6
**How to avoid:**
- Monitor drizzle-orm release notes for Zod v4 support
- Use `--legacy-peer-deps` or pnpm's `overrides` if necessary
- Keep Zod v4 API usage isolated to presentation layer
**Warning signs:**
- `npm list zod` shows "invalid" warnings
- Drizzle schema validation behaves unexpectedly
**Current status:** Warning present but non-blocking (apps/api/package.json shows zod@4.3.6 installed)

### Pitfall 5: Enum Error Messages Generic and Unhelpful
**What goes wrong:** Default Zod nativeEnum error message is "Invalid enum value" without showing valid options
**Why it happens:** Zod's default message doesn't include enum values for brevity
**How to avoid:**
- Use Zod v4 error customization via configuration object:
  ```typescript
  z.nativeEnum(BatchMode, {
    error: { message: "Mode must be LIST_MODE or PROFILE_MODE" }
  })
  ```
- Or use global error map for consistent enum messaging
**Warning signs:**
- Frontend shows "Invalid enum value" without guidance
- User confusion about valid values

## Code Examples

Verified patterns from the codebase:

### ZodValidationPipe Implementation (v4-compatible)
```typescript
// Source: apps/api/src/presentation/pipes/zod-validation.pipe.ts
import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  public constructor(private readonly schema: T) {}

  public transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }

    return result.data as z.infer<T>;
  }
}
```

### DTO Pattern with nativeEnum
```typescript
// Source: apps/api/src/presentation/dto/batch.dto.ts
import { z } from 'zod';
import { BatchMode } from '../../core/entities/batch.entity';

export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode),
});

export type CreateBatchDto = z.infer<typeof createBatchSchema>;
```

### Manual Validation in Controller (Multipart Endpoint)
```typescript
// Source: apps/api/src/presentation/controllers/batch.controller.ts (lines 39-58)
// Validate mode field with Zod
let validated: CreateBatchDto;
try {
  validated = createBatchSchema.parse({ mode });
} catch (error) {
  if (error instanceof Error && 'issues' in error) {
    const zodError = error as {
      issues: Array<{ path: string[]; message: string }>;
    };
    const errors = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new BadRequestException({
      message: 'Validation failed',
      errors,
    });
  }
  throw error;
}
```

### Custom Enum Error Message (Recommended Enhancement)
```typescript
// Enhanced version with custom error message
export const createBatchSchema = z.object({
  mode: z.nativeEnum(BatchMode, {
    error: { message: "Mode must be either LIST_MODE or PROFILE_MODE" }
  }),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 `error.errors` | Zod v4 `error.issues` | Zod v4.0.0 (2025) | Breaking change; must update all error handling code |
| `z.string().uuid()` | Top-level `z.uuid()` or `z.string().uuid()` (both valid) | Zod v4.0.0 | String format methods remain but top-level functions added |
| `z.string().email()` | Top-level `z.email()` preferred | Zod v4.0.0 | Method still works but top-level recommended |
| Lenient UUID validation | Strict RFC 4122 compliance | Zod v4.0.0 | Use `z.guid()` for lenient validation |
| `invalid_type_error` / `required_error` params | Unified `error` param | Zod v4.0.0 | Error customization API standardized |
| class-validator + class-transformer | Zod for TypeScript projects | Industry shift (2023-2024) | Better type inference, smaller bundle, simpler API |

**Deprecated/outdated:**
- Using `error.errors` instead of `error.issues` (Zod v3 API)
- Assuming UUID validation is lenient (v4 enforces RFC compliance)
- Using separate `invalid_type_error` and `required_error` params (use unified `error` param in v4)

## Open Questions

Things that couldn't be fully resolved:

1. **Drizzle ORM Zod v4 Compatibility**
   - What we know: drizzle-orm and drizzle-kit peer deps expect Zod ^3.20.2; project uses 4.3.6
   - What's unclear: Whether this causes runtime issues or just peer dependency warnings
   - Recommendation: Monitor for runtime errors; consider downgrading Zod if Drizzle schemas break, or wait for Drizzle to update peer deps

2. **ZodValidationPipe vs Manual Validation Decision**
   - What we know: Phase 7 chose manual validation for multipart endpoints
   - What's unclear: Whether this should remain the pattern or if there's a cleaner approach
   - Recommendation: Keep manual validation for multipart; use pipe for JSON endpoints (current pattern is correct)

3. **ProjectId UUID Validation at Controller Level**
   - What we know: `@Param('projectId')` not currently validated before passing to use case
   - What's unclear: Should controller validate UUID format before delegation?
   - Recommendation: Consider adding `@Param('projectId', new ZodValidationPipe(z.string().uuid()))` for early validation

## Sources

### Primary (HIGH confidence)
- [Zod v4 Migration Guide](https://zod.dev/v4/changelog) - Breaking changes and v4 API
- [Zod Error Formatting Documentation](https://zod.dev/error-formatting) - error.issues structure
- Codebase files:
  - `apps/api/src/presentation/pipes/zod-validation.pipe.ts` - v4-compatible pipe implementation
  - `apps/api/src/presentation/controllers/batch.controller.ts` - Manual validation pattern
  - `apps/api/src/presentation/dto/batch.dto.ts` - nativeEnum usage
  - `apps/api/package.json` - Zod v4.3.6 installation
  - `.planning/phases/07-batch-endpoint/07-01-SUMMARY.md` - Phase 7 manual validation decision

### Secondary (MEDIUM confidence)
- [NestJS Validating Multiple File Uploads Custom Pipe](https://bhargavacharyb.medium.com/nestjs-15-validating-multiple-file-uploads-in-nestjs-using-custom-pipe-ce75889c9768) - Multipart validation patterns
- [NestJS Error Handling Best Practices](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/) - Exception structure
- [Zod Enum Error Messages Best Practices](https://tecktol.com/zod-enum/) - Custom enum error configuration
- [NestJS Parameter-Scoped Pipes](https://shadisbaih.medium.com/custom-parameter-decorators-vs-body-in-nestjs-9a496a314f09) - Pipe application patterns

### Tertiary (LOW confidence)
- Community discussions on Zod v4 migration challenges
- Stack Overflow threads on multipart + Zod validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod v4.3.6 verified installed, NestJS patterns established in codebase
- Architecture: HIGH - Existing patterns documented in Phase 7, ZodValidationPipe code reviewed
- Pitfalls: HIGH - Zod v4 breaking changes documented officially, multipart constraint verified in Phase 7 decision

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (30 days - Zod v4 stable, NestJS patterns mature)
