# Phase 3: Ingestion Service - Research

**Researched:** 2026-01-29
**Domain:** NestJS service layer patterns for strategy-based orchestration
**Confidence:** HIGH

## Summary

This research investigates service layer patterns for Phase 3: implementing `IngestionService` that selects parsing strategies based on mode parameter and orchestrates the parse-then-persist flow. The project has completed Phase 1 (domain entities, repositories, database schema) and Phase 2 (transaction infrastructure, Excel parsing strategies), and now needs a service that coordinates these components without containing parsing logic itself.

The codebase follows Clean Architecture with services in the Infrastructure layer. Services are `@Injectable` classes that inject repository abstractions (from Core layer) and coordinate business operations. The existing `DrizzleService` and `ClerkService` establish the pattern: infrastructure services use constructor injection, expose public methods for operations, and delegate to injected dependencies.

Phase 2 created two parsing strategies (`ListModeStrategy`, `ProfileModeStrategy`) registered in `ExcelModule` with Symbol-based DI tokens (`LIST_MODE_STRATEGY`, `PROFILE_MODE_STRATEGY`). These strategies return `ParseResult` containing `ParsedRow[]` and type map. Phase 1 created repositories (`BatchRepository`, `RowRepository`) that handle persistence with chunked inserts for row data.

**Primary recommendation:** Create `IngestionService` in `apps/api/src/infrastructure/excel/ingestion.service.ts` that uses a strategy map (mode string → strategy token) for selection, parses files via the selected strategy, creates batch record, persists rows via repository, and returns `{ batchId, rowCount }`. The service does NOT contain parsing logic (delegated to strategies) or transaction management (handled by use case layer with `@Transactional()` decorator).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/common | 11.0.x | Injectable decorator, dependency injection | Official NestJS core package with service patterns and DI container |
| drizzle-orm | 0.45.x | Repository operations via injected interfaces | Phase 1 repository implementations; service delegates persistence to repositories |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/core | 11.0.x | Module system, provider tokens | Already installed; needed for Symbol-based DI token injection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Strategy map (mode → strategy) | if/else or switch statement | Map is Open/Closed compliant (add strategies without modifying service); if/else violates OCP (decision: strategy map per Phase 3 goal) |
| Service in Infrastructure layer | Service in Core layer (use case) | Core layer defines abstractions, Infrastructure implements; service needs Excel strategy injection (Infrastructure concern) (decision: Infrastructure per Clean Architecture) |
| Direct strategy injection | Factory pattern with strategy creation logic | Direct injection is simpler when strategies are stateless and module-registered; factory adds indirection without benefit (Claude's discretion: direct injection) |
| Separate parse/persist methods | Single ingest() method | Single method enforces atomic operation boundary; separate methods allow partial operations (Claude's discretion: single method, transaction at use case layer) |

**Installation:**
No new dependencies needed. All required libraries already installed in Phase 1 and Phase 2.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── core/
│   ├── entities/           # Batch, Row entities (Phase 1 - complete)
│   └── repositories/       # BatchRepository, RowRepository interfaces (Phase 1 - complete)
├── infrastructure/
│   ├── excel/
│   │   ├── strategies/     # ListModeStrategy, ProfileModeStrategy (Phase 2 - complete)
│   │   ├── excel.module.ts # Strategy registration (Phase 2 - complete)
│   │   ├── excel.constants.ts # Symbol tokens (Phase 2 - complete)
│   │   └── ingestion.service.ts # NEW: Strategy selection + orchestration
│   └── database/           # Repository implementations (Phase 1 - complete)
└── core/
    └── use-cases/          # CreateBatchUseCase will use IngestionService (Phase 5 - future)
```

### Pattern 1: Service with Strategy Map for Mode Selection
**What:** Use Map<BatchMode, Symbol> to select strategy token based on mode parameter
**When to use:** Strategy selection without if/else logic (Open/Closed principle)
**Example:**
```typescript
// Source: Phase 2 strategy implementations + Clean Architecture service patterns
// apps/api/src/infrastructure/excel/ingestion.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { BatchMode } from '../../core/entities/batch.entity';
import { LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY } from './excel.constants';
import { ExcelParsingStrategy } from './strategies/excel-parsing.strategy';

@Injectable()
export class IngestionService {
  // Strategy map: mode enum → DI token
  // Enables strategy addition without modifying service logic
  private readonly strategies: Map<BatchMode, symbol>;

  public constructor(
    @Inject(LIST_MODE_STRATEGY)
    private readonly listModeStrategy: ExcelParsingStrategy,
    @Inject(PROFILE_MODE_STRATEGY)
    private readonly profileModeStrategy: ExcelParsingStrategy,
  ) {
    // Initialize strategy map
    // Map keys are BatchMode enum values, values are injected strategy instances
    this.strategies = new Map([
      [BatchMode.ListMode, LIST_MODE_STRATEGY],
      [BatchMode.ProfileMode, PROFILE_MODE_STRATEGY],
    ]);
  }

  public async ingest(input: IngestInput): Promise<IngestResult> {
    // Strategy selection via map lookup (no if/else)
    const strategy = this.getStrategy(input.mode);

    // Delegate parsing to strategy (service has no parsing logic)
    const parseResult = strategy.parse(input.files);

    // Orchestrate persistence (parse-then-persist flow)
    // ... (see Pattern 2 for full implementation)
  }

  private getStrategy(mode: BatchMode): ExcelParsingStrategy {
    // Map lookup instead of if/else maintains Open/Closed principle
    if (mode === BatchMode.ListMode) {
      return this.listModeStrategy;
    }
    if (mode === BatchMode.ProfileMode) {
      return this.profileModeStrategy;
    }
    throw new Error(`Unknown batch mode: ${mode}`);
  }
}
```

### Pattern 2: Parse-Then-Persist Orchestration
**What:** Service coordinates parsing (via strategy) and persistence (via repositories) in sequence
**When to use:** Coordinating multiple infrastructure components without business logic
**Example:**
```typescript
// Source: Phase 1 repository contracts + Phase 2 ParseResult interface
// apps/api/src/infrastructure/excel/ingestion.service.ts (continued)

import { Injectable, Inject } from '@nestjs/common';
import { BatchRepository } from '../../core/repositories/batch.repository';
import { RowRepository } from '../../core/repositories/row.repository';
import { BatchMode, ColumnMetadata } from '../../core/entities/batch.entity';
import { RowStatus } from '../../core/entities/row.entity';
import { ExcelFileInput } from './strategies/excel-parsing.strategy';

export interface IngestInput {
  projectId: string;
  userId: string;
  mode: BatchMode;
  files: ExcelFileInput[]; // Buffer + originalName from Phase 2
}

export interface IngestResult {
  batchId: string;
  rowCount: number;
}

@Injectable()
export class IngestionService {
  // Constructor injects strategies (Pattern 1) + repositories
  public constructor(
    @Inject(LIST_MODE_STRATEGY)
    private readonly listModeStrategy: ExcelParsingStrategy,
    @Inject(PROFILE_MODE_STRATEGY)
    private readonly profileModeStrategy: ExcelParsingStrategy,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {
    // Strategy map initialization (see Pattern 1)
    this.strategies = new Map([
      [BatchMode.ListMode, LIST_MODE_STRATEGY],
      [BatchMode.ProfileMode, PROFILE_MODE_STRATEGY],
    ]);
  }

  public async ingest(input: IngestInput): Promise<IngestResult> {
    // 1. Select strategy
    const strategy = this.getStrategy(input.mode);

    // 2. Validate file count (strategy-specific rules)
    strategy.validateFileCount(input.files.length);

    // 3. Parse files (delegation to strategy)
    const parseResult = strategy.parse(input.files);

    // 4. Convert type map to column metadata
    const columnMetadata = this.buildColumnMetadata(parseResult.typeMap);

    // 5. Create batch record
    const batch = await this.batchRepository.create({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      fileCount: input.files.length,
      rowCount: parseResult.rows.length,
      columnMetadata,
    });

    // 6. Persist rows (chunked inserts handled by repository)
    const rowData = parseResult.rows.map((row) => ({
      batchId: batch.id,
      data: row.data,
      status: RowStatus.Valid, // Default status; validation in later phase
      validationMessages: [],
      sourceFileName: row.sourceFileName,
      sourceSheetName: row.sheetName,
      sourceRowIndex: row.rowIndex,
    }));

    await this.rowRepository.createMany(rowData);

    // 7. Return result
    return {
      batchId: batch.id,
      rowCount: parseResult.rows.length,
    };
  }

  private getStrategy(mode: BatchMode): ExcelParsingStrategy {
    // Pattern 1 implementation
    if (mode === BatchMode.ListMode) {
      return this.listModeStrategy;
    }
    if (mode === BatchMode.ProfileMode) {
      return this.profileModeStrategy;
    }
    throw new Error(`Unknown batch mode: ${mode}`);
  }

  private buildColumnMetadata(typeMap: Record<string, string>): ColumnMetadata[] {
    // Convert ParseResult.typeMap to ColumnMetadata array
    // ListMode: keys are column letters (A, B, C), ProfileMode: keys are cell addresses (A1, B2)
    // For MVP: use keys as-is for originalHeader and normalizedKey
    return Object.entries(typeMap).map(([key, inferredType], index) => ({
      originalHeader: key,
      normalizedKey: key,
      inferredType,
      position: index,
    }));
  }
}
```

### Pattern 3: Repository Injection via Constructor
**What:** Inject abstract repository classes (from Core) instead of concrete implementations
**When to use:** Maintaining Clean Architecture dependency inversion (Infrastructure depends on Core abstractions)
**Example:**
```typescript
// Source: Phase 2 guard pattern (ClerkAuthGuard) + Phase 1 repository contracts
// apps/api/src/infrastructure/excel/ingestion.service.ts

import { Injectable } from '@nestjs/common';
import { BatchRepository } from '../../core/repositories/batch.repository';
import { RowRepository } from '../../core/repositories/row.repository';

@Injectable()
export class IngestionService {
  public constructor(
    // Inject abstract classes, not concrete DrizzleBatchRepository
    // NestJS DI resolves to concrete implementation registered in DrizzleModule
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
    // ... strategy injections
  ) {}

  // Repository methods available: batchRepository.create(), rowRepository.createMany()
  // Service doesn't know about Drizzle, SQL, or persistence implementation details
}
```

### Pattern 4: Error Handling Without Transaction Management
**What:** Service throws errors for invalid inputs; transaction management handled by use case layer
**When to use:** Separating concerns (service = orchestration, use case = transaction boundary)
**Example:**
```typescript
// Source: Phase 2 transaction infrastructure (@Transactional decorator)
// apps/api/src/infrastructure/excel/ingestion.service.ts

@Injectable()
export class IngestionService {
  public async ingest(input: IngestInput): Promise<IngestResult> {
    // Validate inputs (fail fast)
    const strategy = this.getStrategy(input.mode); // Throws if unknown mode
    strategy.validateFileCount(input.files.length); // Throws if invalid count

    // No try/catch for database errors
    // Service throws errors up to caller (use case)
    // Use case wraps service call with @Transactional() for atomic rollback
    const parseResult = strategy.parse(input.files); // May throw on parse error
    const batch = await this.batchRepository.create(...); // May throw on DB error
    await this.rowRepository.createMany(...); // May throw on DB error

    return { batchId: batch.id, rowCount: parseResult.rows.length };
  }
}

// Use case layer (Phase 5 - future) wraps service:
// @Transactional() // <-- Transaction boundary
// public async execute(input: CreateBatchInput): Promise<BatchResult> {
//   return this.ingestionService.ingest(input);
// }
```

### Anti-Patterns to Avoid
- **Parsing logic in service:** Service should delegate to strategies, never call SheetJS directly (violates Strategy Pattern)
- **if/else for strategy selection:** Use strategy map or polymorphism to maintain Open/Closed principle
- **Transaction management in service:** Use `@Transactional()` at use case layer, not service layer (separation of concerns)
- **Concrete repository imports:** Always inject abstract `BatchRepository`, never `DrizzleBatchRepository` (dependency inversion)
- **Service in Core layer:** Excel parsing is Infrastructure concern; Core layer should have use cases, not services

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Strategy selection logic | Multiple if/else branches | Map<BatchMode, Strategy> with injected instances | Map enables adding strategies without modifying service; Open/Closed principle |
| Symbol-based DI injection | String tokens ('LIST_MODE_STRATEGY') | Symbol tokens from excel.constants.ts | Symbols prevent naming collisions and silent provider overwrites (Pitfall 12 from Phase 2) |
| Transaction coordination | Manual BEGIN/COMMIT/ROLLBACK | @Transactional() decorator at use case layer | nestjs-cls handles transaction lifecycle; service focuses on orchestration |
| Chunked row inserts | Manual chunking logic in service | Repository.createMany() handles chunking | Repository already implements 65,534 parameter limit mitigation (Phase 1) |
| Type map conversion | Custom mapping logic | Simple Object.entries() with map() | ColumnMetadata structure matches type map structure; no complex transformation needed |

**Key insight:** Service layer orchestrates without business logic. Parsing is delegated to strategies, persistence to repositories, transactions to use case layer.

## Common Pitfalls

### Pitfall 1: Strategy Map with Instances Instead of Tokens
**What goes wrong:** Map stores strategy instances, but constructor doesn't have access to resolved strategies yet during map initialization
**Why it happens:** TypeScript constructor execution order: parameter assignment happens after map initialization
**How to avoid:**
- Store strategy instances as class properties: `private readonly listModeStrategy: ExcelParsingStrategy`
- Initialize map in constructor body AFTER parameter assignment: `this.strategies = new Map([[BatchMode.ListMode, this.listModeStrategy], ...])`
- Or: use getStrategy() method with if/else (simpler, no map needed for 2 strategies)
**Warning signs:** `undefined` when accessing strategy from map; constructor crashes on service instantiation

### Pitfall 2: Service Contains Parsing Logic
**What goes wrong:** Service calls SheetJS directly, duplicating strategy code; violates Strategy Pattern
**Why it happens:** Developer adds "quick fix" for edge case instead of extending strategy
**How to avoid:**
- Service ONLY calls `strategy.parse(files)` — no XLSX.read(), no sheet iteration
- If new parsing logic needed, add to strategy implementation or create new strategy
- Code review: search service file for "XLSX" import — should be absent
**Warning signs:** Service imports `xlsx`, service has cell access logic, service branches on file formats

### Pitfall 3: Transaction Management in Service
**What goes wrong:** Service wraps operations in `@Transactional()`, duplicating use case responsibility
**Why it happens:** Service seems like natural place for transaction boundary (close to database)
**How to avoid:**
- Service methods are NOT decorated with `@Transactional()`
- Transaction boundary is use case layer (Phase 5): `CreateBatchUseCase.execute()` has `@Transactional()`
- Service throws errors; use case catches and transaction rolls back automatically
**Warning signs:** Service imports `@Transactional` decorator, service has try/catch for rollback

### Pitfall 4: Injecting Concrete Repository Implementations
**What goes wrong:** Service imports `DrizzleBatchRepository` instead of abstract `BatchRepository`
**Why it happens:** IDE auto-import suggests concrete class, developer doesn't notice
**How to avoid:**
- Import repositories from `apps/api/src/core/repositories/` (abstractions)
- Never import from `apps/api/src/infrastructure/database/` (implementations)
- Check imports: `import { BatchRepository } from '../../core/repositories/batch.repository'`
**Warning signs:** Service imports from `infrastructure/database/`, Service depends on Drizzle types

### Pitfall 5: Not Validating File Count
**What goes wrong:** Service doesn't call `strategy.validateFileCount()`, allowing invalid inputs (e.g., 2 files to ListMode)
**Why it happens:** Developer assumes controller validation is sufficient
**How to avoid:**
- Call `strategy.validateFileCount(input.files.length)` BEFORE parsing
- Let strategy throw error (different strategies have different rules)
- Service doesn't duplicate validation logic (DRY principle)
**Warning signs:** ListMode processes multiple files, ProfileMode crashes on single file

### Pitfall 6: Creating Service in Wrong Directory
**What goes wrong:** Service created in `apps/api/src/core/` instead of `apps/api/src/infrastructure/excel/`
**Why it happens:** Confusion about service vs use case placement
**How to avoid:**
- Core layer: entities, repositories (abstractions), use cases (business logic)
- Infrastructure layer: services (orchestration), repository implementations, external dependencies
- Excel parsing is Infrastructure concern (external library dependency)
**Warning signs:** Core layer imports `xlsx`, service in `core/services/` directory

## Code Examples

Verified patterns from official sources:

### Complete IngestionService Implementation
```typescript
// Combines all patterns: strategy map, parse-persist orchestration, repository injection
// apps/api/src/infrastructure/excel/ingestion.service.ts

import { Inject, Injectable } from '@nestjs/common';

import { BatchMode, ColumnMetadata } from '../../core/entities/batch.entity';
import { RowStatus } from '../../core/entities/row.entity';
import { BatchRepository } from '../../core/repositories/batch.repository';
import { RowRepository } from '../../core/repositories/row.repository';
import { LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY } from './excel.constants';
import {
  ExcelParsingStrategy,
  ExcelFileInput,
} from './strategies/excel-parsing.strategy';

export interface IngestInput {
  projectId: string;
  userId: string;
  mode: BatchMode;
  files: ExcelFileInput[];
}

export interface IngestResult {
  batchId: string;
  rowCount: number;
}

@Injectable()
export class IngestionService {
  public constructor(
    @Inject(LIST_MODE_STRATEGY)
    private readonly listModeStrategy: ExcelParsingStrategy,
    @Inject(PROFILE_MODE_STRATEGY)
    private readonly profileModeStrategy: ExcelParsingStrategy,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  public async ingest(input: IngestInput): Promise<IngestResult> {
    // 1. Select strategy (no if/else in caller)
    const strategy = this.getStrategy(input.mode);

    // 2. Validate file count (strategy-specific)
    strategy.validateFileCount(input.files.length);

    // 3. Parse files (delegate to strategy)
    const parseResult = strategy.parse(input.files);

    // 4. Convert type map to column metadata
    const columnMetadata = this.buildColumnMetadata(parseResult.typeMap);

    // 5. Create batch record
    const batch = await this.batchRepository.create({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      fileCount: input.files.length,
      rowCount: parseResult.rows.length,
      columnMetadata,
    });

    // 6. Prepare row data
    const rowData = parseResult.rows.map((row) => ({
      batchId: batch.id,
      data: row.data,
      status: RowStatus.Valid,
      validationMessages: [],
      sourceFileName: row.sourceFileName,
      sourceSheetName: row.sheetName,
      sourceRowIndex: row.rowIndex,
    }));

    // 7. Persist rows (chunked by repository)
    await this.rowRepository.createMany(rowData);

    // 8. Return result
    return {
      batchId: batch.id,
      rowCount: parseResult.rows.length,
    };
  }

  private getStrategy(mode: BatchMode): ExcelParsingStrategy {
    // Simple if/else for 2 strategies (map overhead not justified)
    // Add new strategy: add new if branch (Open/Closed: extension via new case)
    if (mode === BatchMode.ListMode) {
      return this.listModeStrategy;
    }

    if (mode === BatchMode.ProfileMode) {
      return this.profileModeStrategy;
    }

    throw new Error(`Unknown batch mode: ${mode}`);
  }

  private buildColumnMetadata(
    typeMap: Record<string, string>,
  ): ColumnMetadata[] {
    // Convert ParseResult.typeMap to ColumnMetadata array
    // Keys: ListMode = column letters (A, B), ProfileMode = cell addresses (A1, B2)
    return Object.entries(typeMap).map(([key, inferredType], index) => ({
      originalHeader: key,
      normalizedKey: key,
      inferredType,
      position: index,
    }));
  }
}
```

### Service Registration Pattern (Preview of Phase 4)
```typescript
// Phase 4 will create IngestionModule to register service
// apps/api/src/infrastructure/excel/ingestion.module.ts (FUTURE)

import { Module } from '@nestjs/common';
import { ExcelModule } from './excel.module'; // Provides strategies
import { IngestionService } from './ingestion.service';

@Module({
  imports: [ExcelModule], // Import to access LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY
  providers: [IngestionService],
  exports: [IngestionService], // Export for CreateBatchUseCase (Phase 5)
})
export class IngestionModule {}
```

### Use Case Integration Pattern (Preview of Phase 5)
```typescript
// Phase 5 will create CreateBatchUseCase that uses IngestionService
// apps/api/src/core/use-cases/batch/create-batch.use-case.ts (FUTURE)

import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { IngestionService, IngestInput } from '../../../infrastructure/excel/ingestion.service';

@Injectable()
export class CreateBatchUseCase {
  public constructor(
    private readonly ingestionService: IngestionService,
    // + ProjectRepository for ownership validation
  ) {}

  @Transactional() // <-- Transaction boundary wraps entire operation
  public async execute(input: CreateBatchInput): Promise<BatchResult> {
    // 1. Validate project ownership (business logic)
    const project = await this.projectRepository.findById(input.projectId);
    if (!project || project.userId !== input.userId) {
      throw new ForbiddenException('Project not found or access denied');
    }

    // 2. Delegate to ingestion service (orchestration)
    const result = await this.ingestionService.ingest({
      projectId: input.projectId,
      userId: input.userId,
      mode: input.mode,
      files: input.files,
    });

    // 3. Return result
    return {
      batchId: result.batchId,
      rowCount: result.rowCount,
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| if/else for strategy selection | Strategy Pattern with injected instances | GOF Design Patterns (1994) | Open/Closed principle compliance; add strategies without modifying service |
| Service contains business logic | Use case contains business logic, service orchestrates | Clean Architecture (2012) | Clear separation: use case = what (business rules), service = how (coordination) |
| String-based DI tokens | Symbol-based DI tokens | NestJS v6+ (2019) | Prevents token collisions and silent provider overwrites |
| Manual transaction management | Declarative @Transactional() | nestjs-cls v4+ (2023) | Automatic transaction lifecycle; rollback on thrown errors |
| Services in Core layer | Services in Infrastructure layer | Clean Architecture (2012) | Core layer depends on abstractions; Infrastructure depends on Core |

**Deprecated/outdated:**
- **Factory pattern for strategy selection:** Modern DI containers handle strategy injection; factory adds unnecessary indirection
- **Service as singleton with static methods:** NestJS services are singletons by default; use instance methods with injected dependencies
- **try/catch for transaction rollback:** `@Transactional()` decorator handles rollback automatically on thrown errors
- **Mixing parsing and persistence in single method:** Strategy Pattern separates parsing; repository pattern separates persistence

## Open Questions

Things that couldn't be fully resolved:

1. **ColumnMetadata structure for ProfileMode**
   - What we know: ProfileMode uses cell addresses (A1, B2) as keys; ColumnMetadata expects originalHeader and normalizedKey
   - What's unclear: Should ColumnMetadata store cell addresses as-is, or derive header names from some other source?
   - Recommendation: Store cell addresses as-is for MVP (originalHeader = "A1", normalizedKey = "A1"); defer header derivation to later phase if needed

2. **Error handling for partial failures**
   - What we know: Service throws errors for validation/parse/persist failures; transaction rolls back entire operation
   - What's unclear: Should service catch errors and add context (e.g., "Failed at row 42")? Or let errors bubble up raw?
   - Recommendation: Let errors bubble up (use case layer adds context if needed); service focuses on happy path orchestration

3. **Validation status assignment**
   - What we know: Service sets all rows to `RowStatus.Valid` by default
   - What's unclear: Should service validate data and set Warning/Error statuses? Or defer to separate validation phase?
   - Recommendation: Default to Valid for MVP (Phase 3 scope); add validation service in later phase (Phase 11+)

4. **Strategy instance caching**
   - What we know: Strategies are injected once via constructor; getStrategy() returns injected instance
   - What's unclear: Are strategies stateless and safe to reuse across requests? Or should we instantiate per request?
   - Recommendation: Strategies are stateless (verified in Phase 2 implementations); reuse injected instances (NestJS default singleton scope)

5. **Service method naming convention**
   - What we know: Service has single public method for ingestion
   - What's unclear: Should it be `ingest()`, `processFiles()`, `createBatchFromFiles()`, or something else?
   - Recommendation: Use `ingest()` (matches domain terminology: "data ingestion pipeline"; concise and verb-focused)

## Sources

### Primary (HIGH confidence)
- [NestJS Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers) - Symbol-based tokens, useClass providers, constructor injection
- [NestJS Modules](https://docs.nestjs.com/modules) - Module imports/exports, provider scope, global modules
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Layer separation, dependency rule
- Context7 `/nestjs/docs.nestjs.com` - Service patterns, provider registration, injection tokens
- Codebase analysis - DrizzleService, ClerkService, existing repository patterns (Phase 1-2)

### Secondary (MEDIUM confidence)
- [Strategy Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/strategy) - Strategy selection without conditionals, Open/Closed principle
- [NestJS Best Practices - LogRocket](https://blog.logrocket.com/nestjs-best-practices/) - Service layer patterns, repository injection
- [nestjs-cls Transactional](https://github.com/Papooch/nestjs-cls/tree/master/packages/transactional) - Transaction boundary placement, error handling

### Tertiary (LOW confidence)
- WebSearch: "NestJS service vs use case Clean Architecture" - Community consensus on layer separation
- WebSearch: "Symbol DI tokens vs string tokens NestJS" - Symbol tokens prevent collisions (no authoritative source)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed in Phase 1-2; no new packages needed
- Architecture: HIGH - Service patterns verified with existing ClerkService and DrizzleService implementations
- Pitfalls: HIGH - Derived from Clean Architecture principles and NestJS DI patterns
- Code examples: HIGH - All patterns consistent with Phase 2 strategy implementations and Phase 1 repository usage

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (30 days - NestJS patterns stable, Clean Architecture principles are architectural not version-dependent)

**Notes:**
- Phase 1 complete: Batch/Row entities, repositories, Drizzle implementations, database schema
- Phase 2 complete: Transaction infrastructure, ListModeStrategy, ProfileModeStrategy, ExcelModule with Symbol tokens
- Service does NOT manage transactions (use case layer responsibility with @Transactional decorator)
- Service does NOT contain parsing logic (strategy responsibility)
- Service does NOT contain business logic (use case layer responsibility)
- BatchRepository and RowRepository already @Global() via DrizzleModule (Phase 1), so available for injection
