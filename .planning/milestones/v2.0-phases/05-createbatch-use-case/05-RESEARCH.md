# Phase 5: CreateBatch Use Case - Research

**Researched:** 2026-01-29
**Domain:** NestJS transactional use cases with Clean Architecture
**Confidence:** HIGH

## Summary

Phase 5 implements a transactional use case that validates project ownership, orchestrates ingestion via IngestionService, and guarantees atomic commit/rollback of batch + rows. This follows established Clean Architecture patterns in the codebase where use cases orchestrate domain logic and infrastructure services while controllers remain thin.

The research focused on three key domains: (1) `@Transactional` decorator patterns from `@nestjs-cls/transactional`, (2) ownership validation and error handling patterns already established in the codebase, and (3) use case architecture consistent with existing implementations.

**Primary recommendation:** Follow the established pattern from `CreateProjectUseCase` and `GetProjectUseCase` - injectable service with `execute()` method accepting Input interface, returning domain entity or result. Add `@Transactional()` decorator from `@nestjs-cls/transactional` to wrap batch creation + row persistence in atomic transaction. Use NestJS built-in exceptions (`NotFoundException`, `ForbiddenException`) for ownership validation errors, consistent with existing use cases.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs-cls/transactional` | 3.2.0 | Declarative transactions via `@Transactional()` | Already configured in TransactionModule (Phase 2) - provides CLS-enabled transactions without explicit withTransaction calls |
| `@nestjs-cls/transactional-adapter-drizzle-orm` | 1.2.3 | Drizzle adapter for transaction plugin | Connects transactional decorator to Drizzle database client |
| `nestjs-cls` | 6.2.0 | CLS (Continuation-Local Storage) for request context | Foundation for transactional plugin - manages transaction context across async calls |
| `@nestjs/common` (Logger) | 11.0.1 | Built-in logging service | Standard NestJS logger for security auditing and error tracking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| IngestionService | Local (Phase 3/4) | Orchestrates Excel parsing and batch/row persistence | Call from use case to handle ingestion logic |
| ProjectRepository | Local (Phase 2) | Domain repository for project lookup | Use for ownership validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@Transactional()` decorator | Manual `TransactionHost.withTransaction()` | Decorator is cleaner, less boilerplate; manual approach gives more control over propagation but violates DRY |
| NestJS exceptions (NotFoundException) | Custom domain errors | Built-in exceptions integrate seamlessly with NestJS HTTP layer; custom errors require exception filters for HTTP mapping |
| Logger instance | Static Logger methods | Instance method allows class name context; static method requires passing context explicitly |

**Installation:**
```bash
# All dependencies already installed (Phase 2 TransactionModule setup)
# No new packages required for Phase 5
```

## Architecture Patterns

### Recommended Use Case Structure
```
src/core/use-cases/
├── batch/                    # New directory for batch use cases
│   ├── index.ts             # Barrel export
│   └── create-batch.use-case.ts
```

### Pattern 1: Injectable Use Case with Execute Method
**What:** Standard use case pattern established in codebase
**When to use:** All use case implementations
**Example:**
```typescript
// Source: apps/api/src/core/use-cases/project/create-project.use-case.ts
export interface CreateProjectInput {
  userId: string;
  name: string;
  description?: string | null;
}

@Injectable()
export class CreateProjectUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(input: CreateProjectInput): Promise<Project> {
    return this.projectRepository.create({
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
    });
  }
}
```

### Pattern 2: @Transactional Decorator for Atomic Operations
**What:** Wraps method in CLS-enabled transaction - automatic commit on success, rollback on exception
**When to use:** When multiple database operations must succeed or fail together (batch + rows)
**Example:**
```typescript
// Source: https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class CreateBatchUseCase {
  @Transactional()
  public async execute(input: CreateBatchInput): Promise<CreateBatchResult> {
    // All operations here participate in same transaction
    // Rollback triggered automatically by any thrown exception
    const batch = await this.batchRepository.create(...);
    await this.rowRepository.createMany(...);
    return result;
  }
}
```

### Pattern 3: Two-Step Ownership Validation
**What:** Separate project lookup (404) from ownership check (403)
**When to use:** When validating user access to resources
**Example:**
```typescript
// Source: apps/api/src/core/use-cases/project/get-project.use-case.ts (adapted)
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';

@Injectable()
export class MyUseCase {
  private readonly logger = new Logger(MyUseCase.name);

  public async execute(projectId: string, userId: string) {
    // Step 1: Find project (doesn't filter by userId)
    const project = await this.projectRepository.findById(projectId, userId);

    if (!project) {
      // Could be not found OR could be soft-deleted
      throw new NotFoundException('Project not found');
    }

    // Step 2: Check ownership (if repository doesn't filter by userId)
    if (project.userId !== userId) {
      this.logger.warn(`Unauthorized access attempt: userId=${userId}, projectId=${projectId}`);
      throw new ForbiddenException('Access denied');
    }

    // Continue with operation
  }
}
```

**NOTE:** Current `ProjectRepository.findById(id, userId)` already filters by userId in the WHERE clause, returning `null` for both "not found" and "not owned" cases. For Phase 5 context decisions requiring separate 404/403 errors, this pattern needs repository adjustment OR separate query.

### Pattern 4: Logger with Class Name Context
**What:** Create logger instance with class name for contextual logging
**When to use:** All services/use cases needing logging
**Example:**
```typescript
// Source: apps/api/src/presentation/controllers/webhook.controller.ts
import { Logger } from '@nestjs/common';

@Injectable()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  public async handleEvent() {
    this.logger.log('Event processed successfully');
    this.logger.warn('Unexpected condition detected');
    this.logger.error('Operation failed', error);
  }
}
```

### Pattern 5: Input/Output Interfaces for Use Case Contracts
**What:** Define explicit interfaces for use case inputs and results
**When to use:** All use cases (decouples domain from presentation layer)
**Example:**
```typescript
// Source: apps/api/src/core/use-cases/user/sync-user.use-case.ts
export interface SyncUserInput {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

@Injectable()
export class SyncUserUseCase {
  public async execute(input: SyncUserInput): Promise<User> {
    return this.userRepository.upsert({ ...input });
  }
}
```

### Anti-Patterns to Avoid
- **Transaction logic in service layer:** IngestionService has NO transaction management - that belongs at use case layer with `@Transactional()`
- **HTTP exceptions in domain entities:** Domain entities should not import `@nestjs/common` exceptions
- **Ownership check without logging:** Security audit requires WARN-level logging for 403 errors
- **Single error for 404 and 403:** Context decision requires separate errors - don't conflate "not found" with "not owned"

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transaction management | Custom transaction wrapper with try/catch/commit/rollback | `@Transactional()` from `@nestjs-cls/transactional` | Handles propagation, CLS context, rollback on exception automatically - 50 lines reduced to 1 decorator |
| HTTP error responses | Custom error classes + exception filters | NestJS built-in exceptions (NotFoundException, ForbiddenException) | Already integrated with HTTP layer, standard status codes, automatic JSON serialization |
| Request-scoped transaction context | Manual transaction passing between services | CLS (Continuation-Local Storage) via nestjs-cls | Implicit context propagation across async boundaries without explicit parameter passing |
| Soft-delete detection | Custom deleted check logic | Repository `isNull(deletedAt)` pattern (already established) | Consistent with existing DrizzleProjectRepository pattern - filters soft-deleted records in WHERE clause |
| Security audit logging | Custom audit service | NestJS Logger.warn() with userId + resourceId | Built-in, contextual, configurable, no extra dependencies |

**Key insight:** Transaction management is complex (propagation modes, isolation levels, nested transactions, error rollback). The `@nestjs-cls/transactional` library handles this with 7 propagation modes (Required, RequiresNew, Mandatory, Never, NotSupported, Supports, Nested). Hand-rolling would miss edge cases like subtransactions and CLS context leakage.

## Common Pitfalls

### Pitfall 1: Forgetting @Transactional on Use Case Execute Method
**What goes wrong:** Batch gets created but rows fail to persist - partial data corruption
**Why it happens:** IngestionService has no transaction management (per Phase 3 decision) - relies on caller to provide transaction boundary
**How to avoid:** Add `@Transactional()` decorator to `execute()` method signature
**Warning signs:**
- Batches appear in database with `rowCount > 0` but no corresponding rows in `ingestion_rows` table
- Intermittent failures leave orphaned batch records

### Pitfall 2: Using ProjectRepository.findById(id, userId) for Two-Step Validation
**What goes wrong:** Cannot distinguish 404 (project not found) from 403 (user doesn't own project)
**Why it happens:** Repository filters by BOTH `id` AND `userId` in WHERE clause - returns null for either condition
**How to avoid:** Create separate repository method `findByIdWithoutUserFilter(id)` OR query twice (first without userId filter, then check ownership)
**Warning signs:**
- All ownership failures return 404 instead of 403
- Security audit logs missing unauthorized access attempts
- User gets "not found" message when they don't own a resource (confusing UX)

**Context decision constraint:** CONTEXT.md specifies separate 404/403 errors, requiring repository adaptation.

### Pitfall 3: Batch Status Not Updated to COMPLETED
**What goes wrong:** Batch created with default status `PENDING_REVIEW` (from schema default) but never updated to `COMPLETED`
**Why it happens:** Forgot to update batch status after successful ingestion
**How to avoid:**
- Option A: Update batch status to `COMPLETED` after row persistence (requires BatchRepository.updateStatus method)
- Option B: Set status to `COMPLETED` in CreateBatchData (override default)
**Warning signs:**
- All batches stuck in `PENDING_REVIEW` status
- No way to distinguish successful vs in-progress batches

**Note:** Schema default is `PENDING_REVIEW` but context decision specifies three states: PROCESSING → COMPLETED/FAILED. Need to align entity enum with schema enum OR update after creation.

### Pitfall 4: Enum Mismatch Between Entity and Schema
**What goes wrong:** TypeScript entity defines `PROCESSING` status but database schema defines `PENDING_REVIEW`
**Why it happens:** Entity and schema developed separately (entity in batch.entity.ts, schema in ingestion-batches.schema.ts)
**How to avoid:**
- Verify enum consistency: `BatchStatus` enum should match `batchStatusEnum` pgEnum
- Current schema: `['PENDING_REVIEW', 'COMPLETED', 'FAILED']`
- Context decision: `['PROCESSING', 'COMPLETED', 'FAILED']`
- **ACTION REQUIRED:** Update schema enum OR update entity enum to match
**Warning signs:**
- Runtime errors: "invalid input value for enum batch_status"
- TypeScript compiles but database rejects INSERT

### Pitfall 5: Transaction Rollback Loses Error Context
**What goes wrong:** Exception thrown during ingestion triggers rollback, but original error message lost
**Why it happens:** Drizzle or transaction adapter wraps original error
**How to avoid:**
- Catch exceptions at use case boundary, log with context, then rethrow
- Use Logger.error() before throwing to preserve error details
**Warning signs:**
- Generic "Transaction failed" errors without root cause
- Cannot debug which file/row caused parsing failure

### Pitfall 6: Soft-Deleted Projects Return Generic 404
**What goes wrong:** User tries to create batch for archived/deleted project, gets "Project not found" instead of meaningful message
**Why it happens:** Repository filters `isNull(deletedAt)` - treats soft-deleted as not found
**How to avoid:** Context decision specifies distinct error message for soft-deleted projects - requires separate query OR check `deletedAt` field before returning error
**Warning signs:**
- Users confused why project "disappeared"
- No way to distinguish deleted from never-existed

## Code Examples

Verified patterns from official sources and codebase:

### Use Case with @Transactional Decorator
```typescript
// Combining codebase patterns with @Transactional from official docs
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { BatchMode } from '../../entities/batch.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { IngestionService, IngestInput } from '../../../infrastructure/excel/ingestion.service';

export interface CreateBatchInput {
  projectId: string;
  userId: string;
  mode: BatchMode;
  files: Array<{ buffer: Buffer; filename: string }>;
}

export interface CreateBatchResult {
  batchId: string;
  rowCount: number;
  mode: BatchMode;
  fileCount: number;
}

@Injectable()
export class CreateBatchUseCase {
  private readonly logger = new Logger(CreateBatchUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly ingestionService: IngestionService,
  ) {}

  @Transactional() // Wraps entire method in atomic transaction
  public async execute(input: CreateBatchInput): Promise<CreateBatchResult> {
    // 1. Validate project exists and user owns it
    const project = await this.projectRepository.findById(input.projectId, input.userId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Note: Current repository already filters by userId, so null means "not found OR not owned"
    // For separate 404/403, would need repository refactor per Pitfall 2

    // 2. Delegate to IngestionService (batch + row creation happens in THIS transaction)
    const result = await this.ingestionService.ingest({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      files: input.files.map(f => ({ buffer: f.buffer, filename: f.filename })),
    });

    // 3. Return minimal summary
    return {
      batchId: result.batchId,
      rowCount: result.rowCount,
      mode: input.mode,
      fileCount: input.files.length,
    };
  }
}
```

### Ownership Validation with Separate 404/403 (Requires Repository Refactor)
```typescript
// Pattern for separate 404/403 errors (requires new repository method)
@Injectable()
export class CreateBatchUseCase {
  private readonly logger = new Logger(CreateBatchUseCase.name);

  @Transactional()
  public async execute(input: CreateBatchInput): Promise<CreateBatchResult> {
    // Step 1: Check if project exists (without userId filter)
    const project = await this.projectRepository.findByIdWithoutUserFilter(input.projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if soft-deleted (context decision: specific error message)
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 2: Validate ownership
    if (project.userId !== input.userId) {
      this.logger.warn(
        `Unauthorized batch creation attempt - userId: ${input.userId}, projectId: ${input.projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Continue with ingestion...
  }
}
```

### Logger Usage for Security Auditing
```typescript
// Source: apps/api/src/presentation/controllers/webhook.controller.ts (adapted)
import { Logger } from '@nestjs/common';

@Injectable()
export class CreateBatchUseCase {
  private readonly logger = new Logger(CreateBatchUseCase.name);

  public async execute(input: CreateBatchInput) {
    // Log unauthorized access at WARN level with context
    this.logger.warn(
      `Unauthorized batch creation: userId=${input.userId}, projectId=${input.projectId}`,
    );

    // Log errors with full exception
    try {
      await this.ingestionService.ingest(input);
    } catch (error) {
      this.logger.error('Ingestion failed', error);
      throw error; // Rethrow to trigger transaction rollback
    }
  }
}
```

### Mode Validation with Domain Error
```typescript
// Validate BatchMode enum value
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class CreateBatchUseCase {
  @Transactional()
  public async execute(input: CreateBatchInput) {
    // Validate mode is valid BatchMode enum value
    if (!Object.values(BatchMode).includes(input.mode)) {
      throw new BadRequestException(`Invalid batch mode: ${input.mode}`);
    }

    // Note: IngestionService.getStrategy() already throws on unknown mode,
    // so this is defensive validation at use case boundary
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual transaction handling with TransactionHost.withTransaction() | `@Transactional()` decorator | Phase 2 (TransactionModule setup) | Cleaner code, automatic rollback, CLS propagation |
| Single repository method filtering by userId | Separate methods for exists vs ownership checks | Phase 5 (this phase) - REQUIRED | Enables distinct 404/403 error messages |
| Batch status as simple string | Enum with lifecycle states (PROCESSING/COMPLETED/FAILED) | Phase 5 context decision | Enables future async processing and status tracking |
| Generic "Project not found" | Specific messages for not-found vs soft-deleted | Phase 5 context decision | Better UX and clarity |

**Deprecated/outdated:**
- ~~Transaction logic in service layer~~ - Use cases own transaction boundaries with `@Transactional()`
- ~~Repository filtering by userId for ownership checks~~ - Need separate method to distinguish 404 from 403 (per context decision)

**Schema/Entity Enum Mismatch (ACTION REQUIRED):**
- **Schema enum:** `['PENDING_REVIEW', 'COMPLETED', 'FAILED']` (ingestion-batches.schema.ts line 14-18)
- **Entity enum:** `['PendingReview', 'Completed', 'Failed']` (batch.entity.ts line 1-5)
- **Context decision:** `['PROCESSING', 'COMPLETED', 'FAILED']`
- **Resolution needed:** Align all three to consistent enum values

## Open Questions

Things that couldn't be fully resolved:

1. **ProjectRepository.findById() behavior**
   - What we know: Current implementation filters by BOTH id AND userId (DrizzleProjectRepository line 20-36)
   - What's unclear: Does this method satisfy context requirement for separate 404/403 errors?
   - Recommendation: Create new method `findByIdWithoutUserFilter(id: string)` for ownership validation OR accept that 404/403 distinction requires two queries

2. **Batch status enum alignment**
   - What we know: Three different enum definitions exist (schema: PENDING_REVIEW, entity: PendingReview, context: PROCESSING)
   - What's unclear: Which is the source of truth?
   - Recommendation: Update schema enum to match context decision `['PROCESSING', 'COMPLETED', 'FAILED']` via migration, then update entity enum

3. **When to update batch status to COMPLETED**
   - What we know: Schema default is PENDING_REVIEW, context decision requires PROCESSING → COMPLETED flow
   - What's unclear: Should batch start as PROCESSING then update to COMPLETED, OR start as COMPLETED when use case succeeds?
   - Recommendation:
     - Option A: Create with `status: PROCESSING`, update to COMPLETED after row persistence (requires BatchRepository.updateStatus method)
     - Option B: Create with `status: COMPLETED` directly (simpler, works for synchronous ingestion)
     - Option B recommended for MVP (async processing deferred to future phases)

4. **Error message specificity for parsing failures**
   - What we know: Context decision requires error messages to include source filename
   - What's unclear: Does IngestionService already include filename in exceptions?
   - Recommendation: Review ListModeStrategy and ProfileModeStrategy error throwing - ensure filename included in error messages

## Sources

### Primary (HIGH confidence)
- [@nestjs-cls/transactional official documentation](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional) - Decorator usage, propagation modes, error handling
- Codebase: `apps/api/src/infrastructure/transaction/transaction.module.ts` - TransactionModule configuration with DRIZZLE_CLIENT token
- Codebase: `apps/api/src/core/use-cases/project/create-project.use-case.ts` - Use case pattern with Injectable and execute method
- Codebase: `apps/api/src/core/use-cases/project/get-project.use-case.ts` - NotFoundException pattern for missing resources
- Codebase: `apps/api/src/presentation/controllers/webhook.controller.ts` - Logger pattern with class name context
- Codebase: `apps/api/src/infrastructure/excel/ingestion.service.ts` - Service orchestration without transaction management
- Codebase: `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-project.repository.ts` - Repository pattern with soft-delete filtering
- Codebase: `apps/api/src/infrastructure/database/drizzle/schema/ingestion-batches.schema.ts` - Batch status enum definition
- Codebase: `apps/api/src/core/entities/batch.entity.ts` - Batch entity and CreateBatchData interface

### Secondary (MEDIUM confidence)
- [Understanding the NestJS Logger](https://dev.to/brandonwie/understanding-the-nestjs-logger-format-specifiers-and-logging-best-practices-27h9) - Logger.warn() with context parameter examples
- [Mastering Error Handling in NestJS](https://medium.com/@kelispatel5/mastering-error-handling-in-nestjs-exploring-all-exception-scenarios-31d0b7e6956c) - ForbiddenException and NotFoundException use cases
- [Clean Architecture with NestJS](https://medium.com/@jonathan.pretre91/clean-architecture-with-nestjs-e089cef65045) - Use case layer patterns and domain logic separation
- [Implementing Audit Logging in NestJS](https://cropsly.com/blog/implementing-audit-logging-in-a-nestjs-application/) - Security audit logging best practices

### Tertiary (LOW confidence)
- [NestJS official documentation](https://docs.nestjs.com/techniques/logger) - WebFetch failed to extract content, marked for validation
- WebSearch results on domain exceptions - No specific code examples found, general architectural guidance only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured in Phase 2, verified in package.json
- Architecture: HIGH - Patterns verified directly from codebase files and official @nestjs-cls/transactional documentation
- Pitfalls: MEDIUM - Enum mismatch and repository limitation identified via code inspection; ownership validation pattern inferred from context decisions

**Research date:** 2026-01-29
**Valid until:** 30 days (stable patterns - NestJS and transactional library well-established)

**Critical action items for planner:**
1. Resolve batch status enum mismatch (PENDING_REVIEW vs PROCESSING)
2. Determine if ProjectRepository needs refactoring for separate 404/403 errors
3. Decide on batch status update strategy (create as PROCESSING + update, OR create as COMPLETED)
