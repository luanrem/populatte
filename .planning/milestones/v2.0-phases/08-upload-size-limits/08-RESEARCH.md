# Phase 8: Upload Size Limits - Research

**Researched:** 2026-01-29
**Domain:** Multer file upload limits in NestJS
**Confidence:** HIGH

## Summary

Multer provides comprehensive file upload limits through its `limits` configuration object, which is passed to the underlying busboy parser. NestJS exposes this configuration through `MulterOptions` that can be set globally via `MulterModule.register()` or locally on individual interceptors. Multer throws specific `MulterError` instances with distinct error codes for different limit violations (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, etc.), which can be caught and transformed using NestJS exception filters.

The standard approach is to configure limits in the `FilesInterceptor` options, handle `MulterError` exceptions with a custom exception filter to return HTTP 413 responses, and optionally implement Content-Length middleware for early rejection before Multer begins buffering. Environment variables should be validated using the existing Joi schema pattern.

**Primary recommendation:** Configure Multer limits via environment variables, create a global exception filter to catch `MulterError` instances and return 413 responses with detailed error information, and implement route-scoped Content-Length middleware for early rejection optimization.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/platform-express | ^11.0.1 | NestJS Multer integration | Official NestJS package providing FilesInterceptor and MulterModule |
| multer | (peer dependency) | Multipart form parsing | Industry standard for Express/NestJS file uploads, built on busboy |
| @nestjs/config | ^4.0.2 | Environment variable management | Official NestJS configuration module with validation support |
| joi | ^18.0.2 | Environment variable validation | Already used in codebase for env validation schema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/multer | ^2.0.0 | TypeScript definitions | Already in codebase as devDependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Multer limits | Manual stream size tracking | Multer limits are battle-tested, handle edge cases, and integrate seamlessly with NestJS |
| Exception filter | Controller-level try/catch | Exception filters centralize error handling, provide consistent responses, and avoid code duplication |
| Joi validation | Custom validation | Joi is already used in the codebase for env validation, maintaining consistency |

**Installation:**
No new packages required - all dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
src/infrastructure/
├── config/
│   ├── upload.config.ts         # registerAs('upload', ...) for upload limits
│   ├── env.validation.ts        # Add UPLOAD_MAX_FILE_SIZE, UPLOAD_MAX_FILE_COUNT
│   └── index.ts                 # Export upload config
├── upload/                      # NEW - upload infrastructure
│   ├── filters/
│   │   └── multer-exception.filter.ts  # Catches MulterError, returns 413
│   ├── middleware/
│   │   └── content-length.middleware.ts # Early rejection based on Content-Length
│   └── upload.module.ts         # Exports filter and middleware
└── batch/
    └── batch.module.ts          # Applies middleware via configure()
```

### Pattern 1: Multer Limits Configuration
**What:** Pass limits object to FilesInterceptor via MulterOptions
**When to use:** Every file upload endpoint that needs size/count enforcement
**Example:**
```typescript
// Source: https://github.com/nestjs/docs.nestjs.com/blob/master/content/techniques/file-upload.md
// Source: https://github.com/expressjs/multer/blob/main/doc/README-ru.md

import { FilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

@Post()
@UseInterceptors(
  FilesInterceptor('documents', 50, {  // maxCount: 50
    limits: {
      fileSize: 5 * 1024 * 1024,  // 5MB in bytes
      files: 50,                   // Redundant with maxCount but explicit
    },
  })
)
async create(@UploadedFiles() files: Express.Multer.File[]) {
  // Files already validated by Multer
}
```

### Pattern 2: Environment-Driven Configuration
**What:** Use ConfigService to inject environment variables into Multer options
**When to use:** When limits should be configurable without code changes
**Example:**
```typescript
// Source: Existing codebase pattern (clerk.config.ts, env.validation.ts)

// src/infrastructure/config/upload.config.ts
import { registerAs } from '@nestjs/config';

export const uploadConfig = registerAs('upload', () => ({
  maxFileSize: parseInt(process.env['UPLOAD_MAX_FILE_SIZE'] ?? '5242880', 10), // 5MB default
  maxFileCount: parseInt(process.env['UPLOAD_MAX_FILE_COUNT'] ?? '50', 10),
}));

// src/infrastructure/config/env.validation.ts
export const envValidationSchema = Joi.object({
  // ... existing fields
  UPLOAD_MAX_FILE_SIZE: Joi.number()
    .default(5 * 1024 * 1024)
    .description('Maximum file size in bytes (default: 5MB)'),
  UPLOAD_MAX_FILE_COUNT: Joi.number()
    .default(50)
    .description('Maximum number of files per request (default: 50)'),
});
```

### Pattern 3: MulterError Exception Filter
**What:** Global exception filter that catches MulterError and returns HTTP 413 with details
**When to use:** Required for proper error handling of Multer limit violations
**Example:**
```typescript
// Source: https://github.com/expressjs/multer/blob/main/lib/multer-error.js
// Source: https://docs.nestjs.com/exception-filters

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as multer from 'multer';

@Catch(multer.MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: multer.MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Map Multer error codes to detailed messages
    const errorMap: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File size exceeds maximum allowed size',
      LIMIT_FILE_COUNT: 'Too many files uploaded',
      LIMIT_PART_COUNT: 'Too many parts in request',
      LIMIT_FIELD_KEY: 'Field name too long',
      LIMIT_FIELD_VALUE: 'Field value too long',
      LIMIT_FIELD_COUNT: 'Too many fields',
      LIMIT_UNEXPECTED_FILE: 'Unexpected field',
    };

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: errorMap[exception.code] || 'File upload limit exceeded',
      error: 'Payload Too Large',
      details: {
        code: exception.code,
        field: exception.field,
      },
    });
  }
}

// Register globally in main.ts
app.useGlobalFilters(new MulterExceptionFilter());
```

### Pattern 4: Content-Length Middleware for Early Rejection
**What:** Middleware that checks Content-Length header before Multer buffering
**When to use:** Optimization to reject obviously oversized requests early
**Example:**
```typescript
// Source: https://medium.com/@louistrinh/taming-large-requests-limiting-request-size-in-node-js-6791b7318bd6
// Source: https://docs.nestjs.com/middleware

import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ContentLengthMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const contentLength = req.headers['content-length'];

    if (!contentLength) {
      // No Content-Length header - pass through to Multer
      return next();
    }

    const maxFileSize = this.configService.get<number>('upload.maxFileSize', 5242880);
    const maxFileCount = this.configService.get<number>('upload.maxFileCount', 50);

    // Conservative threshold: (maxFileSize * maxFileCount) + overhead for metadata
    const threshold = (maxFileSize * maxFileCount) + (1024 * 100); // 100KB overhead

    if (parseInt(contentLength, 10) > threshold) {
      return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'Request size exceeds maximum allowed',
        error: 'Payload Too Large',
      });
    }

    next();
  }
}

// Apply to specific route in BatchModule
export class BatchModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContentLengthMiddleware)
      .forRoutes({ path: 'projects/:projectId/batches', method: RequestMethod.POST });
  }
}
```

### Pattern 5: Logging with NestJS Logger
**What:** Use NestJS Logger to log all rejected uploads with context
**When to use:** Every limit violation for security audit trail
**Example:**
```typescript
// Source: Existing codebase pattern (clerk-auth.guard.ts, create-batch.use-case.ts)

import { Logger } from '@nestjs/common';

@Catch(multer.MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  catch(exception: multer.MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const user = (request as any).user; // From ClerkAuthGuard

    this.logger.warn(
      `Upload rejected - code: ${exception.code}, field: ${exception.field}, userId: ${user?.id}, path: ${request.path}`,
    );

    // ... send 413 response
  }
}
```

### Anti-Patterns to Avoid
- **Controller-level error handling:** Don't use try/catch in controllers for Multer errors - use exception filters for centralized handling
- **Hardcoded limits:** Don't hardcode file size/count limits - use environment variables for flexibility
- **Ignoring error codes:** Don't return generic error messages - use MulterError.code to provide specific feedback
- **Total request size limit:** Don't enforce total request size independently - per-file enforcement is sufficient per CONTEXT.md
- **Missing Content-Length check:** Don't skip Content-Length middleware - it prevents unnecessary buffering

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File size validation | Custom stream size counter | Multer `limits.fileSize` | Multer handles edge cases like chunked encoding, partial uploads, connection drops |
| File count validation | Manual file array length check in controller | Multer `maxCount` parameter + `limits.files` | Multer enforces at parsing level before buffering all files |
| Error response formatting | Custom error objects per controller | NestJS Exception Filter | Filters centralize formatting, ensure consistency, integrate with NestJS error pipeline |
| Environment variable parsing | Manual process.env reads with fallbacks | @nestjs/config with Joi validation | ConfigService provides type safety, validation, testability |
| Content-Length parsing | String manipulation of header | Built-in `parseInt(req.headers['content-length'])` | Native approach handles undefined/null safely |

**Key insight:** Multer's limits configuration is production-battle-tested across millions of Express applications. The error codes (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, etc.) cover all common scenarios. Custom validation logic is prone to edge cases like incomplete uploads, chunked encoding, and race conditions.

## Common Pitfalls

### Pitfall 1: Confusing maxCount parameter vs limits.files
**What goes wrong:** Developers set `FilesInterceptor('documents', 20)` and expect 20-file enforcement, but don't set `limits.files`, leading to inconsistent behavior.
**Why it happens:** `maxCount` is a NestJS convenience parameter, while `limits.files` is the underlying Multer/busboy configuration. They should match.
**How to avoid:** Always set both `maxCount` and `limits.files` to the same value for clarity and defense-in-depth.
**Warning signs:** Multer accepts more files than expected, or errors occur inconsistently.

### Pitfall 2: Bytes vs Megabytes confusion
**What goes wrong:** Developer sets `limits.fileSize: 5` thinking it's megabytes, but Multer expects bytes, resulting in a 5-byte limit.
**Why it happens:** Multer documentation specifies bytes, but developers think in MB.
**How to avoid:** Always calculate `fileSize` explicitly: `5 * 1024 * 1024` with comment `// 5MB`, and store in environment as bytes.
**Warning signs:** All files rejected as "too large" even tiny ones.

### Pitfall 3: Not registering exception filter globally
**What goes wrong:** MulterError is thrown but not caught, resulting in default NestJS 500 Internal Server Error instead of 413.
**Why it happens:** Developers forget to register the exception filter in main.ts or expect it to work automatically.
**How to avoid:** Use `app.useGlobalFilters(new MulterExceptionFilter())` in main.ts bootstrap function.
**Warning signs:** Multer errors return 500 status code instead of 413.

### Pitfall 4: Content-Length middleware rejecting valid requests
**What goes wrong:** Middleware calculates threshold too conservatively (e.g., using sum of all file sizes instead of total request size with overhead), rejecting valid multi-file uploads.
**Why it happens:** Multipart form data includes boundaries, field names, and metadata that add overhead beyond raw file sizes.
**How to avoid:** Calculate threshold as `(maxFileSize * maxFileCount) + overhead` where overhead accounts for ~100KB of form metadata. Accept that some oversized requests will pass middleware but get caught by Multer.
**Warning signs:** Users report uploads failing immediately with "Request size exceeds maximum" but total file sizes are under limit.

### Pitfall 5: Missing userId in rejection logs
**What goes wrong:** Rejection logs don't include userId, making security audits and debugging difficult.
**Why it happens:** Exception filter doesn't access the request.user object populated by ClerkAuthGuard.
**How to avoid:** Extract `request.user` in the exception filter's catch method and include in log messages.
**Warning signs:** Security team requests "Who tried to upload 100MB files?" and logs can't answer.

### Pitfall 6: Reporting only first violation
**What goes wrong:** When multiple files violate size limits, only the first error is returned, leaving users confused about which specific files are too large.
**Why it happens:** Multer throws an error on first violation, stopping parsing immediately.
**How to avoid:** Accept this limitation per CONTEXT.md requirement to "report ALL violations" - this requires custom implementation beyond standard Multer (see Open Questions).
**Warning signs:** User uploads 5 files, 3 are too large, but error only mentions "File too large" without specifics.

### Pitfall 7: Environment variable type coercion errors
**What goes wrong:** `process.env['UPLOAD_MAX_FILE_SIZE']` returns a string, but code uses it directly as a number, causing NaN or incorrect limits.
**Why it happens:** Environment variables are always strings in Node.js.
**How to avoid:** Use `parseInt()` when accessing env vars, and validate with Joi schema that coerces to numbers.
**Warning signs:** Limits don't work as expected, or NaN appears in logs.

## Code Examples

Verified patterns from official sources:

### Basic FilesInterceptor with Limits
```typescript
// Source: https://github.com/nestjs/docs.nestjs.com/blob/master/content/techniques/file-upload.md
import { FilesInterceptor } from '@nestjs/platform-express';

@Post('upload')
@UseInterceptors(
  FilesInterceptor('files', 10, {  // Field name: 'files', Max count: 10
    limits: {
      fileSize: 5 * 1024 * 1024,  // 5MB per file
      files: 10,                   // Max 10 files (matches maxCount)
    },
  })
)
uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
  return { count: files.length };
}
```

### Complete Multer Limits Object
```typescript
// Source: https://github.com/expressjs/multer/blob/main/doc/README-ru.md
const multerOptions: MulterOptions = {
  limits: {
    fieldNameSize: 100,              // Max field name size (bytes) - default: 100
    fieldSize: 1024 * 1024,          // Max field value size (bytes) - default: 1MB
    fields: 50,                       // Max non-file fields - default: Infinity
    fileSize: 5 * 1024 * 1024,       // Max file size (bytes) - default: Infinity
    files: 50,                        // Max file fields - default: Infinity
    parts: 100,                       // Max parts (fields + files) - default: Infinity
    headerPairs: 2000,                // Max header pairs - default: 2000
  },
};
```

### Multer Error Handling with Error Codes
```typescript
// Source: https://github.com/expressjs/multer/blob/main/lib/multer-error.js
// Source: https://dev.to/marufrahmanlive/multer-file-upload-in-expressjs-complete-guide-for-2026-1i9p

if (err instanceof multer.MulterError) {
  // All possible error codes:
  // LIMIT_PART_COUNT - "Too many parts"
  // LIMIT_FILE_SIZE - "File too large"
  // LIMIT_FILE_COUNT - "Too many files"
  // LIMIT_FIELD_KEY - "Field name too long"
  // LIMIT_FIELD_VALUE - "Field value too long"
  // LIMIT_FIELD_COUNT - "Too many fields"
  // LIMIT_UNEXPECTED_FILE - "Unexpected field"
  // MISSING_FIELD_NAME - "Field name missing"

  if (err.code === 'LIMIT_FILE_SIZE') {
    // Handle file size error specifically
  }
}
```

### Global Exception Filter Registration
```typescript
// Source: https://docs.nestjs.com/exception-filters
// In main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new MulterExceptionFilter());

  await app.listen(3000);
}
```

### Route-Scoped Middleware
```typescript
// Source: https://docs.nestjs.com/middleware
import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';

@Module({
  // ...
})
export class BatchModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ContentLengthMiddleware)
      .forRoutes({
        path: 'projects/:projectId/batches',
        method: RequestMethod.POST
      });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ParseFilePipe validators | Direct Multer limits + Exception Filter | NestJS 9+ | ParseFilePipe (MaxFileSizeValidator) works per-file post-upload; Multer limits work at parsing level, preventing buffering |
| Manual error checks in controller | Global exception filters | NestJS 5+ | Centralized error handling, consistent responses, separation of concerns |
| Hardcoded limits | Environment variables + validation | Always best practice | Deployment flexibility, no code changes for limit adjustments |
| Body parser limits for uploads | Multer-specific limits | Always | Body parser is for JSON/urlencoded; Multer is for multipart/form-data |

**Deprecated/outdated:**
- **ParseFilePipe for size limits:** Not deprecated but less efficient than Multer limits - ParseFilePipe validates after buffering, while Multer limits prevent buffering
- **MulterModule.register() for global defaults:** Still valid but local options are preferred for explicit per-endpoint configuration
- **express.limit() middleware:** Deprecated in Express 4+, replaced by body-parser limit option (not applicable to Multer)

## Open Questions

Things that couldn't be fully resolved:

1. **Reporting ALL file violations in a single response**
   - What we know: CONTEXT.md requires "Report ALL violations in a single response, not just the first one"
   - What's unclear: Multer throws an error on the first violation and stops parsing immediately. Standard Multer cannot continue parsing after a limit error.
   - Recommendation: Two options:
     - Accept this limitation and update CONTEXT.md to "report first violation with context" (pragmatic)
     - Implement custom validation AFTER Multer succeeds (check all file sizes in controller, aggregate errors) - but this defeats the purpose of early rejection
   - **Suggested approach:** Clarify in planning that "ALL violations" means providing context (which file, which limit) for the single violation Multer caught, not aggregating multiple violations.

2. **Content-Length threshold calculation precision**
   - What we know: Multipart form data adds overhead for boundaries, field names, metadata
   - What's unclear: Exact overhead calculation varies by number of fields, filename lengths, etc.
   - Recommendation: Use conservative threshold of `(maxFileSize * maxFileCount) + 100KB` and accept that some oversized requests will pass middleware but get caught by Multer. This is an optimization, not a security boundary.

3. **Handling missing Content-Length header**
   - What we know: Content-Length is optional in HTTP, especially with chunked transfer encoding
   - What's unclear: Whether to reject requests without Content-Length or pass through
   - Recommendation: Pass through to Multer (no rejection for missing header) as specified in CONTEXT.md. Multer will enforce limits regardless of header presence.

4. **HTTP status code for multiple error types**
   - What we know: CONTEXT.md specifies HTTP 413 for "all limit violations"
   - What's unclear: Whether errors like LIMIT_UNEXPECTED_FILE (wrong field name) should also be 413 or 400
   - Recommendation: Use 413 for size/count limits (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, LIMIT_PART_COUNT), use 400 for validation errors (LIMIT_UNEXPECTED_FILE, MISSING_FIELD_NAME). Aligns with HTTP semantics.

## Sources

### Primary (HIGH confidence)
- [Context7: /nestjs/docs.nestjs.com](https://github.com/nestjs/docs.nestjs.com/blob/master/content/techniques/file-upload.md) - NestJS file upload documentation
- [Context7: /expressjs/multer](https://github.com/expressjs/multer) - Multer limits and error handling
- [Multer error codes](https://github.com/expressjs/multer/blob/main/lib/multer-error.js) - Complete list of error codes
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters) - Official exception filter documentation
- [NestJS Middleware](https://docs.nestjs.com/middleware) - Official middleware documentation
- Existing codebase: `apps/api/src/infrastructure/config/env.validation.ts`, `clerk.config.ts`, `batch.controller.ts`

### Secondary (MEDIUM confidence)
- [NestJS Error Handling Patterns](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/) - Community best practices
- [Multer File Upload Guide 2026](https://dev.to/marufrahmanlive/multer-file-upload-in-expressjs-complete-guide-for-2026-1i9p) - Recent community guide
- [Taming Large Requests in Node.js](https://medium.com/@louistrinh/taming-large-requests-limiting-request-size-in-node-js-6791b7318bd6) - Content-Length middleware patterns
- [NestJS Environment Variables Best Practices](https://mdjamilkashemporosh.medium.com/nestjs-environment-variables-best-practices-for-validating-and-structuring-configs-a24a8e8d93c1) - Config patterns

### Tertiary (LOW confidence)
- [GitHub Issue: Multer fileFilter status codes](https://github.com/nestjs/nest/issues/7229) - Known issue with fileFilter returning 500 instead of 400
- [PayloadTooLargeError in NestJS](https://www.geeksforgeeks.org/javascript/how-to-fix-payloadtoolargeerror-request-entity-too-large-in-nest-js/) - Community troubleshooting

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via package.json and Context7 documentation
- Architecture: HIGH - Patterns verified with official NestJS docs and Multer source code
- Pitfalls: MEDIUM - Based on community reports and GitHub issues, some edge cases may exist

**Research date:** 2026-01-29
**Valid until:** 60 days (stable domain - Multer v1.x and NestJS v11 are mature)

---

**Next steps for planner:**
- Create plan tasks for adding upload config (env vars, validation schema, registerAs)
- Create plan tasks for MulterExceptionFilter (implementation, registration, logging)
- Create plan tasks for ContentLengthMiddleware (implementation, route scoping)
- Create plan tasks for updating FilesInterceptor in batch.controller.ts
- Create plan tasks for testing limit violations (integration tests)
- Resolve Open Question #1 with product owner before implementation
