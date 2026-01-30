# Phase 9: File Content Validation - Research

**Researched:** 2026-01-29
**Domain:** File type validation via magic-byte inspection
**Confidence:** HIGH

## Summary

File content validation through magic-byte inspection is a critical security layer that prevents MIME-type spoofing attacks by verifying the actual binary signature of uploaded files rather than trusting client-provided headers. For Excel file validation, the primary challenge is distinguishing between file formats that share container structures (ZIP-based XLSX vs. generic ZIP files, OLE2-based XLS vs. other OLE2 files).

The ecosystem offers multiple mature libraries for magic-byte detection, with `file-type` being the most popular but requiring ESM compatibility considerations. NestJS provides a pipe-based validation pattern that fits naturally after Multer buffering but before SheetJS parsing. The key insight is that extension validation AND content validation must both pass - a file with valid XLSX magic bytes but .pdf extension should be rejected to prevent clever bypass attempts.

**Primary recommendation:** Use a custom NestJS pipe implementing FileValidator interface with manual buffer inspection for magic-byte validation. Avoid relying solely on libraries like `file-type` due to ESM compatibility issues and the challenge of distinguishing ZIP-based formats. Implement fail-fast validation that rejects the entire batch on first invalid file.

## Standard Stack

The established libraries/tools for file type validation via magic bytes:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js Buffer | Built-in | Read first N bytes of file | Native, zero dependencies, full control over byte inspection |
| @nestjs/common | 11.0.1+ | Pipe infrastructure (FileValidator) | Already in project, provides validation lifecycle hooks |
| Multer | Via @nestjs/platform-express | File buffering before validation | Already handling uploads, provides buffer for inspection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-type | 19.6.0+ | Magic-byte library (optional) | Only if ESM compatibility resolved, offers broad format support |
| magic-bytes.js | Latest | Alternative magic-byte detection | If simpler API needed, but less maintained |
| zod | 4.3.6+ | Schema validation for DTOs | Already in project for request validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual buffer inspection | file-type package | file-type is ESM-only, causes issues in CommonJS/NestJS projects; manual inspection gives full control but requires maintaining magic-byte constants |
| Custom pipe | Built-in FileTypeValidator | Built-in validator only checks Multer's mimetype (derived from extension), doesn't inspect buffer content - inadequate for security |
| Pipe validation | Use case layer validation | Pipes execute earlier in request lifecycle, fail faster, follow NestJS conventions for input validation |

**Installation:**
```bash
# No new dependencies required - use Node.js Buffer API
# Optional if ESM compatibility resolved:
npm install file-type@latest
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── presentation/
│   ├── controllers/
│   │   └── batch.controller.ts           # Uses @UploadedFiles with validation pipe
│   └── pipes/
│       ├── file-content-validation.pipe.ts  # Custom pipe for magic-byte validation
│       └── file-validators/
│           ├── excel-validator.ts        # FileValidator implementation for Excel
│           └── magic-bytes.constants.ts  # Magic-byte signatures
└── infrastructure/
    └── upload/
        └── filters/
            └── multer-exception.filter.ts  # Already exists, handles Multer errors
```

### Pattern 1: Custom FileValidator for Magic-Byte Inspection

**What:** Create a custom validator extending NestJS's FileValidator abstract class that inspects the first N bytes of uploaded file buffers to verify file type matches expected magic-byte signatures.

**When to use:** When you need to validate file content (not just extension/mimetype) before processing, especially for security-sensitive uploads.

**Example:**
```typescript
// Source: https://github.com/nestjs/nest/blob/master/packages/common/pipes/file/file-type.validator.ts
// and https://www.binishjoshi.com.np/blog/file-type-validator-pipe-in-nestjs

import { FileValidator } from '@nestjs/common';

interface ExcelValidatorOptions {
  errorMessage?: string | ((file: Express.Multer.File) => string);
}

export class ExcelContentValidator extends FileValidator<ExcelValidatorOptions> {
  buildErrorMessage(file: Express.Multer.File): string {
    if (this.validationOptions?.errorMessage) {
      if (typeof this.validationOptions.errorMessage === 'function') {
        return this.validationOptions.errorMessage(file);
      }
      return this.validationOptions.errorMessage;
    }
    return 'File content does not match expected Excel format';
  }

  async isValid(file: Express.Multer.File): Promise<boolean> {
    if (!file?.buffer) return false;

    const ext = file.originalname.split('.').pop()?.toLowerCase();

    // Both extension AND content must match
    if (ext === 'xlsx') {
      return this.isZipFormat(file.buffer);
    } else if (ext === 'xls') {
      return this.isOLE2Format(file.buffer);
    } else if (ext === 'csv') {
      return this.isTextFormat(file.buffer);
    }

    return false;
  }

  private isZipFormat(buffer: Buffer): boolean {
    // ZIP magic bytes: 0x504B0304
    return buffer.length >= 4 &&
           buffer[0] === 0x50 &&
           buffer[1] === 0x4B &&
           buffer[2] === 0x03 &&
           buffer[3] === 0x04;
  }

  private isOLE2Format(buffer: Buffer): boolean {
    // OLE2 magic bytes: 0xD0CF11E0A1B11AE1 (first 8 bytes)
    return buffer.length >= 8 &&
           buffer[0] === 0xD0 &&
           buffer[1] === 0xCF &&
           buffer[2] === 0x11 &&
           buffer[3] === 0xE0 &&
           buffer[4] === 0xA1 &&
           buffer[5] === 0xB1 &&
           buffer[6] === 0x1A &&
           buffer[7] === 0xE1;
  }

  private isTextFormat(buffer: Buffer): boolean {
    // Basic UTF-8 validation - check for binary garbage
    const sample = buffer.slice(0, Math.min(512, buffer.length));
    const text = sample.toString('utf-8');

    // Check for null bytes (indicates binary)
    if (text.includes('\0')) return false;

    // Check for high ratio of printable characters
    const printable = text.match(/[\x20-\x7E\r\n\t]/g)?.length || 0;
    return printable / text.length > 0.95;
  }
}
```

### Pattern 2: Custom Validation Pipe for Multi-File Batch Validation

**What:** A pipe implementing PipeTransform that validates all uploaded files, failing fast on the first invalid file and throwing UnprocessableEntityException (422) consistent with the phase's error handling requirements.

**When to use:** When validating multiple files with fail-fast behavior and standardized error responses.

**Example:**
```typescript
// Source: https://bhargavacharyb.medium.com/nestjs-15-validating-multiple-file-uploads-in-nestjs-using-custom-pipe-ce75889c9768
// and https://medium.com/@kevinpatelcse/guards-vs-middlewares-vs-interceptors-vs-pipes-in-nestjs-a-comprehensive-guide-37841a7873f1

import { PipeTransform, Injectable, UnprocessableEntityException, Logger } from '@nestjs/common';
import { ParseFilePipe } from '@nestjs/common';

@Injectable()
export class FileContentValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileContentValidationPipe.name);

  constructor(
    private readonly validators: FileValidator[]
  ) {}

  async transform(files: Express.Multer.File[]): Promise<Express.Multer.File[]> {
    if (!files || files.length === 0) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'At least one file is required',
        error: 'Unprocessable Entity',
        details: { code: 'NO_FILES_UPLOADED' }
      });
    }

    // Fail-fast: stop on first invalid file
    for (const file of files) {
      for (const validator of this.validators) {
        const isValid = await validator.isValid(file);
        if (!isValid) {
          // Log with details (userId added by controller context)
          this.logger.warn({
            message: 'File content validation failed',
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            detectedBytes: file.buffer.slice(0, 8).toString('hex')
          });

          // Generic error message - don't list individual filenames
          throw new UnprocessableEntityException({
            statusCode: 422,
            message: 'One or more files are not valid Excel files',
            error: 'Unprocessable Entity',
            details: { code: 'INVALID_FILE_TYPE' }
          });
        }
      }
    }

    return files;
  }
}
```

### Pattern 3: Integration with Controller

**What:** Apply validation pipe to @UploadedFiles decorator, executing after FilesInterceptor buffers files but before use case processes them.

**When to use:** Standard pattern for all multi-file upload endpoints requiring content validation.

**Example:**
```typescript
// Source: NestJS request lifecycle pattern
// https://medium.com/@bloodturtle/nestjs-middleware-vs-guard-vs-pipe-understanding-the-request-flow-c26276dbe373

@Controller('projects/:projectId/batches')
@UseGuards(ClerkAuthGuard)
export class BatchController {
  @Post()
  @UseInterceptors(
    FilesInterceptor('documents', 50, {
      limits: { fileSize: 5 * 1024 * 1024, files: 50 },
    }),
  )
  public async create(
    @Param('projectId') projectId: string,
    @Body('mode') mode: string,
    @UploadedFiles(
      new FileContentValidationPipe([
        new ExcelContentValidator({
          errorMessage: 'One or more files are not valid Excel files'
        })
      ])
    ) uploadedFiles: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    // Files are already validated by pipe - proceed with use case
    // ...
  }
}
```

### Anti-Patterns to Avoid

- **Trusting Multer's file.mimetype alone:** MIME types are client-provided headers that can be trivially spoofed. Always validate buffer content.
- **Extension-only validation:** A renamed malicious.exe to malicious.xlsx bypasses extension checks. Validate content.
- **Continuing validation after first failure:** Wastes CPU cycles checking remaining files when batch will be rejected anyway. Fail fast.
- **Listing individual filenames in errors:** Security risk - reveals internal validation details. Use generic messages.
- **Validating in use case layer:** Pipes execute earlier in lifecycle (Guard → Pipe → Controller), providing faster rejection and following NestJS conventions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comprehensive magic-byte database | Custom magic-byte registry for all file types | file-type package (if ESM resolved) or focused Excel-only constants | Maintaining magic bytes for hundreds of formats is error-prone; focused solution for Excel only is sufficient for this phase |
| XLSX vs ZIP differentiation | Deep ZIP archive parsing to check for [Content_Types].xml | Accept all ZIP files with .xlsx extension, rely on SheetJS to fail if invalid | XLSX files ARE ZIP files (magic bytes identical); SheetJS will catch invalid XLSX archives during parsing |
| OLE2 variant detection | Parsing OLE2 directory structures to distinguish XLS from MSI/DOC | Accept all OLE2 files with .xls extension, rely on SheetJS validation | All OLE2 files share magic bytes (0xD0CF11E0); SheetJS handles XLS-specific validation |
| CSV encoding detection | Complete charset detection library | Basic UTF-8 validation checking for null bytes and printable character ratio | CSV files have no magic bytes; simple heuristic catches binary garbage while legitimate CSV passes |
| Empty file detection | Dedicated zero-byte file validator | Check buffer.length in ExcelContentValidator.isValid | One-line check, no need for separate validator |

**Key insight:** Magic-byte validation is a coarse filter that catches obvious mismatches (PDF masquerading as XLSX). Fine-grained validation (is this ZIP actually a valid XLSX?) is SheetJS's responsibility. Don't duplicate SheetJS's validation logic.

## Common Pitfalls

### Pitfall 1: file-type Package ESM Compatibility Issues

**What goes wrong:** The file-type package is ESM-only (requires `import`, not `require`). NestJS projects using CommonJS or hybrid module systems encounter `ERR_REQUIRE_ESM` errors. NestJS's FileTypeValidator dynamically imports file-type, but can load the wrong version from root node_modules.

**Why it happens:** file-type switched to ESM-only in v16+. The package recommends "your project needs to be ESM too", but many NestJS projects use `module: "commonjs"` in tsconfig. The API project uses `module: "nodenext"`, which supports ESM, but dynamic imports still cause issues.

**How to avoid:**
1. Use manual buffer inspection instead of file-type package (eliminates dependency entirely)
2. If using file-type, ensure consistent version across all node_modules (check with `npm list file-type`)
3. Use dynamic import() in async context: `const { fileTypeFromBuffer } = await import('file-type');`
4. Consider file-type-cjs wrapper package if ESM proves problematic

**Warning signs:**
- Error: `require() of ES Module not supported`
- Error: `A dynamic import callback was invoked without --experimental-vm-modules`
- file-type functions return undefined unexpectedly

**Sources:**
- [file-type ESM compatibility issue](https://github.com/sindresorhus/file-type/issues/525)
- [FileTypeValidator version mismatch bug](https://github.com/nestjs/nest/issues/15270)
- [ESM/CommonJS TypeScript guide 2025](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing)

### Pitfall 2: MIME Type Validation Instead of Content Validation

**What goes wrong:** Developers use Multer's `file.mimetype` or NestJS's built-in FileTypeValidator to validate file types, assuming it checks file content. Attackers bypass validation by spoofing the Content-Type header in the upload request.

**Why it happens:** The Content-Type header is client-provided and cannot be trusted. Multer's FileTypeValidator "uses the type as detected by multer, which derives file type from file extension on user's device but does not check actual file contents."

**How to avoid:**
1. Never trust `file.mimetype` for security decisions
2. Always inspect `file.buffer` using magic-byte validation
3. Use custom FileValidator extending @nestjs/common's FileValidator, not built-in FileTypeValidator
4. Validate both extension AND content match (extension: .xlsx, content: ZIP signature)

**Warning signs:**
- Validation logic uses `if (file.mimetype === 'application/vnd.openxmlformats...')`
- No buffer inspection in validation code
- Built-in FileTypeValidator used without custom magic-byte validator

**Sources:**
- [OWASP File Upload Security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [PortSwigger File Upload Vulnerabilities](https://portswigger.net/web-security/file-upload)
- [NestJS FileTypeValidator limitations](https://www.binishjoshi.com.np/blog/file-type-validator-pipe-in-nestjs)

### Pitfall 3: Insufficient Magic Bytes Read for XLSX Detection

**What goes wrong:** Reading only the first 4 bytes (ZIP signature 0x504B0304) detects ZIP files but cannot distinguish XLSX from DOCX, JAR, APK, EPUB - all share the same magic bytes. Developers assume 4 bytes is sufficient and accept any ZIP file as XLSX.

**Why it happens:** XLSX files are ZIP archives containing XML sub-files. The ZIP signature is at the start, but XLSX-specific structure requires deeper inspection (e.g., checking for [Content_Types].xml inside the archive).

**How to avoid:**
1. Accept that magic-byte validation cannot perfectly distinguish XLSX from other ZIP formats
2. Validate extension matches (.xlsx) AND magic bytes match (ZIP signature)
3. Rely on SheetJS to perform deep XLSX validation during parsing
4. For deeper detection, read ~2000 bytes and check for XLSX-specific patterns (0x786C2F for "xl/" directory)
5. Document that magic-byte validation is a "best-effort hint, not a guarantee"

**Warning signs:**
- Accepting any file with ZIP magic bytes as XLSX
- No extension validation alongside magic-byte check
- Expecting magic-byte validation to be 100% accurate

**Sources:**
- [XLSX detection requires 2000 bytes](https://github.com/ckan/ckan/pull/8088)
- [ZIP-based formats share magic bytes](https://en.wikipedia.org/wiki/List_of_file_signatures)
- [file-type limitations](https://github.com/sindresorhus/file-type)

### Pitfall 4: Continuing Validation After First Invalid File

**What goes wrong:** Validation logic iterates through all uploaded files, collecting errors for each invalid file, then throws an exception listing all failures. This wastes CPU cycles and potentially exposes internal validation details.

**Why it happens:** Developers assume providing detailed feedback (listing all failed files) improves UX. However, the phase requirements specify: "Reject entire batch if any file fails validation" and "Fail-fast on first invalid file."

**How to avoid:**
1. Break/return immediately on first validation failure
2. Throw UnprocessableEntityException on first invalid file
3. Use generic error message: "One or more files are not valid Excel files" (don't list filenames)
4. Log detailed validation failures (filenames, detected bytes) server-side for debugging
5. Return error code (`INVALID_FILE_TYPE`) for programmatic handling

**Warning signs:**
- Loop continues after `isValid` returns false
- Error messages list individual filenames
- Multiple validation errors accumulated before throwing

**Sources:**
- Phase 09 CONTEXT.md requirements
- [NestJS exception filters](https://docs.nestjs.com/exception-filters)

### Pitfall 5: Not Validating Extension AND Content Together

**What goes wrong:** Validation checks magic bytes OR extension separately, allowing a file with valid XLSX magic bytes but .pdf extension to pass, or a .xlsx file with PDF content to pass.

**Why it happens:** Developers assume one validation method is sufficient. Phase requirements specify: "Both extension AND content must match: file extension must be .xlsx/.xls/.csv AND content must pass the corresponding validation check."

**How to avoid:**
1. Extract extension from `file.originalname.split('.').pop()`
2. Check extension FIRST to determine expected magic bytes
3. Then validate buffer matches expected magic bytes for that extension
4. Reject if extension is .xlsx but content is OLE2, or extension is .xls but content is ZIP

**Warning signs:**
- Validation logic has separate extension check and magic-byte check (not combined)
- Accepting file with valid ZIP bytes regardless of extension
- No cross-check between declared extension and detected content

**Sources:**
- Phase 09 CONTEXT.md: "A file named 'data.pdf' with valid ZIP bytes is rejected - extension mismatch"

## Code Examples

Verified patterns from research and official sources:

### Magic-Byte Constants Definition
```typescript
// Source: https://en.wikipedia.org/wiki/List_of_file_signatures
// and https://gist.github.com/neutrinoguy/b6cdbe854b34b9fc32c7bbe88b8eb261

export const MAGIC_BYTES = {
  // ZIP-based formats (XLSX, DOCX, PPTX share this signature)
  ZIP: [0x50, 0x4B, 0x03, 0x04],

  // OLE2 Compound File Binary Format (XLS, DOC, PPT, MSI share this)
  OLE2: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1],

  // Other formats for reference (not needed for this phase)
  PDF: [0x25, 0x50, 0x44, 0x46],
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47],
} as const;

export function matchesMagicBytes(buffer: Buffer, signature: readonly number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}
```

### Buffer Inspection Helper
```typescript
// Source: https://medium.com/@sridhar_be/file-validations-using-magic-numbers-in-nodejs-express-server-d8fbb31a97e7
// and https://nodejs.org/api/buffer.html

export class FileTypeDetector {
  static isExcelXLSX(buffer: Buffer): boolean {
    return matchesMagicBytes(buffer, MAGIC_BYTES.ZIP);
  }

  static isExcelXLS(buffer: Buffer): boolean {
    return matchesMagicBytes(buffer, MAGIC_BYTES.OLE2);
  }

  static isCSV(buffer: Buffer): boolean {
    // CSV has no magic bytes - validate as UTF-8 text
    const sample = buffer.slice(0, Math.min(512, buffer.length));

    try {
      const text = sample.toString('utf-8');

      // Reject if contains null bytes (binary file)
      if (text.includes('\0')) return false;

      // Check UTF-8 BOM (optional, but valid)
      const hasUTF8BOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;

      // Require high ratio of printable characters
      const printableChars = text.match(/[\x20-\x7E\r\n\t]/g)?.length || 0;
      const ratio = printableChars / text.length;

      return ratio > 0.95 || hasUTF8BOM;
    } catch {
      return false; // Invalid UTF-8
    }
  }

  static getFileExtension(filename: string): string | null {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : null;
  }
}
```

### Empty File Validation
```typescript
// Source: https://github.com/nestjs/nest/issues/4752

export class ExcelContentValidator extends FileValidator<ExcelValidatorOptions> {
  async isValid(file: Express.Multer.File): Promise<boolean> {
    // Catch empty files early
    if (!file?.buffer || file.buffer.length === 0) {
      return false;
    }

    // Continue with magic-byte validation...
  }
}
```

### Error Response Formatting
```typescript
// Source: Phase 08 MulterExceptionFilter pattern
// Consistent with existing error code structure

throw new UnprocessableEntityException({
  statusCode: 422,
  message: 'One or more files are not valid Excel files',
  error: 'Unprocessable Entity',
  details: {
    code: 'INVALID_FILE_TYPE', // Matches Phase 8 error code pattern
  },
});
```

### Logging Validation Failures
```typescript
// Source: Phase 08 upload violation logging pattern

this.logger.warn({
  message: 'File content validation failed',
  userId: user?.id,
  filenames: files.map(f => f.originalname), // Log server-side only
  detectedBytes: files.map(f => f.buffer.slice(0, 8).toString('hex')),
  path: request.path,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rely on MIME type headers | Inspect magic bytes in buffer | Security best practice since ~2015 | MIME spoofing attacks no longer bypass validation |
| Use file-type package universally | Manual buffer inspection or selective file-type use | file-type went ESM-only v16+ (2021) | ESM compatibility issues force manual implementation in CommonJS projects |
| Built-in NestJS FileTypeValidator | Custom FileValidator with magic-byte inspection | NestJS community identified limitation ~2023 | Built-in validator doesn't check buffer content, custom validators required for security |
| Separate extension and content checks | Combined extension + content validation | OWASP guidelines ~2020 | Prevents polyglot files and extension-content mismatches |
| Detailed error messages listing files | Generic error messages with server-side logging | Modern security practice | Prevents information disclosure while maintaining debuggability |

**Deprecated/outdated:**
- **file-type package without ESM consideration:** Causes runtime errors in CommonJS/hybrid projects. Use manual buffer inspection or ensure full ESM compatibility.
- **NestJS built-in FileTypeValidator for security:** Only checks Multer's mimetype (derived from extension). Use custom FileValidator with buffer inspection.
- **Extension-only validation:** Easily bypassed by renaming files. Always combine with magic-byte validation.

## Open Questions

Things that couldn't be fully resolved:

1. **Exact threshold for CSV printable character ratio**
   - What we know: Simple heuristic checking for null bytes and high ratio of printable ASCII characters works for most cases
   - What's unclear: Optimal threshold ratio (95%? 90%? 99%?) for diverse CSV files with international characters
   - Recommendation: Start with 95% threshold, adjust based on testing with real-world CSV files. UTF-8 BOM detection provides additional confidence.

2. **SheetJS error messages when invalid XLSX passes magic-byte check**
   - What we know: ZIP files with .xlsx extension will pass magic-byte validation but may not be valid XLSX
   - What's unclear: What specific errors SheetJS throws when parsing invalid XLSX? Can we distinguish "corrupt XLSX" from "not XLSX at all"?
   - Recommendation: Test SheetJS error handling in subsequent phases. Magic-byte validation is a pre-filter; SheetJS provides final validation.

3. **Performance impact of validating 50 files sequentially**
   - What we know: Fail-fast pattern stops on first invalid file. Magic-byte inspection reads first 8 bytes (trivial operation).
   - What's unclear: Should validation run in parallel for performance? Would concurrent buffer reading provide meaningful speedup?
   - Recommendation: Sequential validation is simpler and fails fast. Profile if performance issues arise, but likely negligible (reading 8 bytes from buffered memory is microseconds).

## Sources

### Primary (HIGH confidence)
- [Node.js Buffer API Official Documentation](https://nodejs.org/api/buffer.html) - Native buffer manipulation methods
- [NestJS FileValidator Source Code](https://github.com/nestjs/nest/blob/master/packages/common/pipes/file/file-type.validator.ts) - Official FileValidator implementation pattern
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) - Security best practices
- [Wikipedia List of File Signatures](https://en.wikipedia.org/wiki/List_of_file_signatures) - Authoritative magic-byte reference

### Secondary (MEDIUM confidence)
- [File Type Validator Pipe in NestJS](https://www.binishjoshi.com.np/blog/file-type-validator-pipe-in-nestjs) - Custom pipe implementation example, verified against source code
- [NestJS Request Lifecycle Guide](https://medium.com/@bloodturtle/nestjs-middleware-vs-guard-vs-pipe-understanding-the-request-flow-c26276dbe373) - Pipe execution order confirmed by official docs
- [File Validations Using Magic Numbers](https://medium.com/@sridhar_be/file-validations-using-magic-numbers-in-nodejs-express-server-d8fbb31a97e7) - Node.js buffer inspection pattern
- [Validating Multiple File Uploads in NestJS](https://bhargavacharyb.medium.com/nestjs-15-validating-multiple-file-uploads-in-nestjs-using-custom-pipe-ce75889c9768) - Multi-file validation pattern

### Tertiary (LOW confidence)
- [file-type npm package](https://www.npmjs.com/package/file-type) - Popular library but ESM compatibility issues, marked for validation
- [magic-bytes.js npm package](https://www.npmjs.com/package/magic-bytes.js) - Alternative library, less commonly used

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js Buffer API is official, FileValidator pattern is from NestJS source code
- Architecture: HIGH - Pipe pattern verified against NestJS lifecycle documentation, examples cross-referenced with official source
- Pitfalls: HIGH - OWASP security guidance (official), ESM issues verified from multiple GitHub issue reports, MIME spoofing is well-documented attack vector

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (30 days - stable domain, magic bytes don't change, but library versions may update)
