# Architecture Research: Data Ingestion with Strategy Pattern

**Domain:** NestJS Data Ingestion with Clean Architecture
**Researched:** 2026-01-29
**Confidence:** HIGH (based on NestJS Clean Architecture patterns, Strategy Pattern implementation, and Drizzle ORM transaction handling)

## Executive Summary

This document provides architecture guidance for integrating a Strategy Pattern-based data ingestion system into the existing NestJS Clean Architecture codebase. The goal is to support multiple Excel file parsing strategies (ListModeStrategy, ProfileModeStrategy) while maintaining SOLID principles, Clean Architecture layer boundaries, and atomic database transactions.

**Key Architectural Decision:** Strategy interface belongs in Core, concrete strategies in Infrastructure, with an Infrastructure-layer IngestionService acting as the Strategy context. Transaction boundaries wrap the entire batch insert operation using `@nestjs-cls/transactional` for automatic transaction propagation.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ BatchesController│  │ CreateBatchDTO │  │ ZodValidationPipe│  │
│  │ POST /batches   │  │ (Zod schema)   │  │ (input guard)    │  │
│  └────────┬────────┘  └────────────────┘  └──────────────────┘  │
│           │ (calls)                                              │
├───────────┴──────────────────────────────────────────────────────┤
│                         CORE LAYER                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ USE CASE: CreateBatchUseCase                               │ │
│  │ - Validates projectId exists                               │ │
│  │ - Calls IngestionService with strategy selection           │ │
│  │ - Wraps in @Transactional() for atomicity                  │ │
│  └────────┬───────────────────────────────────────────────────┘ │
│           │                                                       │
│  ┌────────┴────────────────────────────────────────────────────┐│
│  │ INTERFACE: IngestionStrategy                                ││
│  │ - parseFiles(files): Promise<ParsedRow[]>                   ││
│  │ - validateInput(files): void                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ BatchRepository  │  │ RowRepository    │                     │
│  │ (abstract class) │  │ (abstract class) │                     │
│  └──────────────────┘  └──────────────────┘                     │
├───────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ SERVICE: IngestionService (Strategy Context)               │ │
│  │ - selectStrategy(mode): IngestionStrategy                  │ │
│  │ - execute(strategy, files, projectId, userId)              │ │
│  │ - Uses BatchRepository + RowRepository                     │ │
│  └────────┬───────────────────────────────────────────────────┘ │
│           │                                                       │
│  ┌────────┴───────────────┐  ┌─────────────────────────────┐   │
│  │ ListModeStrategy       │  │ ProfileModeStrategy          │   │
│  │ implements             │  │ implements                   │   │
│  │ IngestionStrategy      │  │ IngestionStrategy            │   │
│  │                        │  │                              │   │
│  │ - Uses xlsx (SheetJS)  │  │ - Uses xlsx (SheetJS)        │   │
│  │ - Parses 1 file → N    │  │ - Parses N files → N rows    │   │
│  │   rows with headers    │  │   with cell addresses        │   │
│  └────────────────────────┘  └─────────────────────────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ REPOSITORIES: DrizzleBatchRepository + DrizzleRowRepository│ │
│  │ - Inject TransactionHost<DrizzleClient>                    │ │
│  │ - Use txHost.tx for all DB operations                      │ │
│  │ - Automatically participate in active transactions         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ MODULE: IngestionModule (feature module)                   │ │
│  │ - Provides strategies via factory pattern                  │ │
│  │ - Exports IngestionService for use case injection          │ │
│  └────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────┤
│                      DATABASE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │ batches      │  │ rows         │                              │
│  │ table        │  │ table        │                              │
│  │ (Drizzle)    │  │ (Drizzle)    │                              │
│  └──────────────┘  └──────────────┘                              │
└───────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Layer | Communicates With |
|-----------|----------------|-------|-------------------|
| `BatchesController` | Handle HTTP upload, validate input, delegate to use case | Presentation | CreateBatchUseCase |
| `CreateBatchUseCase` | Orchestrate batch creation, ensure transaction atomicity | Core | IngestionService, ProjectRepository |
| `IngestionStrategy` | Interface defining parsing contract | Core | None (pure abstraction) |
| `IngestionService` | Select strategy, coordinate parsing + persistence | Infrastructure | Concrete strategies, repositories |
| `ListModeStrategy` | Parse single Excel file with headers as keys | Infrastructure | xlsx library |
| `ProfileModeStrategy` | Parse multiple Excel files with cell addresses as keys | Infrastructure | xlsx library |
| `BatchRepository` | Batch CRUD operations | Core (interface) / Infrastructure (impl) | TransactionHost |
| `RowRepository` | Row CRUD operations | Core (interface) / Infrastructure (impl) | TransactionHost |
| `DrizzleModule` | Provide database client and repositories globally | Infrastructure | All repositories |
| `IngestionModule` | Feature module for ingestion-specific services | Infrastructure | DrizzleModule, @nestjs-cls/transactional |

## Recommended Project Structure

```
apps/api/src/
├── core/
│   ├── entities/
│   │   ├── batch.entity.ts              # Batch domain entity
│   │   └── row.entity.ts                # Row domain entity
│   ├── repositories/
│   │   ├── batch.repository.ts          # Abstract class with CRUD methods
│   │   └── row.repository.ts            # Abstract class with CRUD methods
│   ├── use-cases/
│   │   └── batch/
│   │       └── create-batch.use-case.ts # Orchestrates ingestion with @Transactional
│   └── strategies/
│       └── ingestion-strategy.interface.ts # Strategy interface
│
├── infrastructure/
│   ├── database/
│   │   └── drizzle/
│   │       ├── drizzle.module.ts        # Extended with BatchRepository, RowRepository
│   │       ├── repositories/
│   │       │   ├── drizzle-batch.repository.ts    # Implements BatchRepository
│   │       │   └── drizzle-row.repository.ts      # Implements RowRepository
│   │       └── schema/
│   │           ├── batches.schema.ts    # Drizzle schema for batches table
│   │           └── rows.schema.ts       # Drizzle schema for rows table
│   └── ingestion/
│       ├── ingestion.module.ts          # Feature module for ingestion
│       ├── ingestion.service.ts         # Strategy context (selects + executes)
│       └── strategies/
│           ├── list-mode.strategy.ts    # Concrete strategy for list mode
│           └── profile-mode.strategy.ts # Concrete strategy for profile mode
│
└── presentation/
    ├── controllers/
    │   └── batches.controller.ts        # POST /projects/:projectId/batches
    └── dto/
        └── batch.dto.ts                 # CreateBatchDto with Zod schema
```

### Structure Rationale

- **`core/strategies/`**: Strategy interface lives in Core because it defines a domain-level abstraction (how to parse files). Concrete implementations depend on infrastructure (xlsx library), so they live in Infrastructure.
- **`infrastructure/ingestion/`**: Feature module pattern — all ingestion-related services and strategies are co-located. This makes it easy to add new strategies without modifying existing modules.
- **`infrastructure/database/drizzle/`**: All database-related code stays under `drizzle/`, maintaining consistency with existing ProjectRepository pattern.
- **Repositories in DrizzleModule**: Following the existing pattern, `BatchRepository` and `RowRepository` are registered in `DrizzleModule` with `@Global()` decorator, making them available throughout the application without explicit imports.

## Architectural Patterns

### Pattern 1: Strategy Interface in Core, Implementations in Infrastructure

**What:** The `IngestionStrategy` interface is defined in `core/strategies/` as a domain abstraction. Concrete implementations (`ListModeStrategy`, `ProfileModeStrategy`) live in `infrastructure/ingestion/strategies/` because they depend on external libraries (SheetJS).

**When to use:** Always — this is the Dependency Inversion Principle in action. Core defines the contract, Infrastructure provides the implementation.

**Trade-offs:**
- **Pro:** Core layer remains pure, no dependencies on xlsx or other parsing libraries
- **Pro:** Easy to add new strategies (PDF, Notion) without modifying Core
- **Con:** More files to manage (interface + implementations)

**Example:**

```typescript
// core/strategies/ingestion-strategy.interface.ts
export interface ParsedRow {
  data: Record<string, unknown>; // JSONB-compatible
  sourceFileName: string;
  sourceSheetName?: string;
}

export interface IngestionStrategy {
  /**
   * Parse uploaded files into normalized rows
   */
  parseFiles(files: Express.Multer.File[]): Promise<ParsedRow[]>;

  /**
   * Validate input files (count, size, etc.)
   * @throws BadRequestException if validation fails
   */
  validateInput(files: Express.Multer.File[]): void;
}
```

```typescript
// infrastructure/ingestion/strategies/list-mode.strategy.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { IngestionStrategy, ParsedRow } from '../../../core/strategies/ingestion-strategy.interface';

@Injectable()
export class ListModeStrategy implements IngestionStrategy {
  public validateInput(files: Express.Multer.File[]): void {
    if (files.length !== 1) {
      throw new BadRequestException('list_mode requires exactly 1 file');
    }
  }

  public async parseFiles(files: Express.Multer.File[]): Promise<ParsedRow[]> {
    const file = files[0];
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Parse with headers as keys
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    return rows.map((row) => ({
      data: row as Record<string, unknown>,
      sourceFileName: file.originalname,
      sourceSheetName: sheetName,
    }));
  }
}
```

### Pattern 2: Service as Strategy Context

**What:** `IngestionService` acts as the Strategy context. It selects the appropriate strategy based on request mode and executes it. The service lives in Infrastructure because it coordinates Infrastructure-layer strategies.

**When to use:** When you need to dynamically select between multiple implementations of an interface.

**Trade-offs:**
- **Pro:** Open/Closed principle — add new strategies without modifying the service
- **Pro:** Single place to manage strategy selection logic
- **Con:** Service becomes a dependency for the use case (but this is acceptable since use cases can depend on Infrastructure services in this pattern)

**Example:**

```typescript
// infrastructure/ingestion/ingestion.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { BatchRepository } from '../../core/repositories/batch.repository';
import { RowRepository } from '../../core/repositories/row.repository';
import { IngestionStrategy, ParsedRow } from '../../core/strategies/ingestion-strategy.interface';
import { ListModeStrategy } from './strategies/list-mode.strategy';
import { ProfileModeStrategy } from './strategies/profile-mode.strategy';

export enum IngestionMode {
  List = 'list_mode',
  Profile = 'profile_mode',
}

@Injectable()
export class IngestionService {
  public constructor(
    private readonly listModeStrategy: ListModeStrategy,
    private readonly profileModeStrategy: ProfileModeStrategy,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  /**
   * Select strategy based on mode
   */
  private selectStrategy(mode: IngestionMode): IngestionStrategy {
    switch (mode) {
      case IngestionMode.List:
        return this.listModeStrategy;
      case IngestionMode.Profile:
        return this.profileModeStrategy;
      default:
        throw new BadRequestException(`Unknown ingestion mode: ${mode}`);
    }
  }

  /**
   * Execute ingestion with selected strategy
   * NOTE: This method is called from CreateBatchUseCase within a @Transactional context
   */
  public async execute(
    mode: IngestionMode,
    files: Express.Multer.File[],
    projectId: string,
    userId: string,
  ): Promise<{ batchId: string; rowCount: number }> {
    const strategy = this.selectStrategy(mode);

    // Validate input with strategy
    strategy.validateInput(files);

    // Parse files with strategy
    const parsedRows = await strategy.parseFiles(files);

    // Create batch
    const batch = await this.batchRepository.create({
      projectId,
      userId,
      mode,
      fileCount: files.length,
      rowCount: parsedRows.length,
    });

    // Insert all rows
    await this.rowRepository.createMany(
      parsedRows.map((row) => ({
        batchId: batch.id,
        data: row.data,
        sourceFileName: row.sourceFileName,
        sourceSheetName: row.sourceSheetName,
      })),
    );

    return { batchId: batch.id, rowCount: parsedRows.length };
  }
}
```

### Pattern 3: Use Case with @Transactional Decorator

**What:** The use case orchestrates the ingestion operation and wraps it in a database transaction using the `@Transactional()` decorator from `@nestjs-cls/transactional`. This ensures atomic batch+row insertion.

**When to use:** When you need multiple repository operations to succeed or fail together.

**Trade-offs:**
- **Pro:** Automatic transaction management without manual `txHost.withTransaction` calls
- **Pro:** Transaction propagates to all repository methods via TransactionHost
- **Pro:** Clean code — no transaction boilerplate in use case
- **Con:** Requires `@nestjs-cls/transactional` dependency
- **Con:** Slightly more complex module setup (ClsModule configuration)

**Example:**

```typescript
// core/use-cases/batch/create-batch.use-case.ts
import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ProjectRepository } from '../../repositories/project.repository';
import { IngestionService, IngestionMode } from '../../../infrastructure/ingestion/ingestion.service';

export interface CreateBatchInput {
  projectId: string;
  userId: string;
  mode: IngestionMode;
  files: Express.Multer.File[];
}

@Injectable()
export class CreateBatchUseCase {
  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly ingestionService: IngestionService,
  ) {}

  /**
   * Create batch with atomic transaction
   * If any step fails, entire batch is rolled back
   */
  @Transactional()
  public async execute(input: CreateBatchInput): Promise<{ batchId: string; rowCount: number }> {
    // 1. Verify project exists and belongs to user
    const project = await this.projectRepository.findById(input.projectId, input.userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 2. Execute ingestion (all DB operations inside this are transactional)
    return this.ingestionService.execute(
      input.mode,
      input.files,
      input.projectId,
      input.userId,
    );
  }
}
```

### Pattern 4: Repository with TransactionHost

**What:** Repositories inject `TransactionHost<DrizzleClient>` and use `txHost.tx` for all database operations. This makes them automatically participate in active transactions without requiring transaction objects in method signatures.

**When to use:** Always when using `@nestjs-cls/transactional` with Drizzle ORM.

**Trade-offs:**
- **Pro:** Repositories work both inside and outside transactions transparently
- **Pro:** No transaction parameter pollution in method signatures
- **Pro:** Type-safe database client access
- **Con:** Requires understanding of CLS (Continuation Local Storage) concept

**Example:**

```typescript
// infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts
import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { eq } from 'drizzle-orm';
import { BatchRepository } from '../../../../core/repositories/batch.repository';
import { Batch, CreateBatchData } from '../../../../core/entities/batch.entity';
import { batches } from '../schema/batches.schema';
import { BatchMapper } from '../mappers/batch.mapper';
import type { DrizzleClient } from '../drizzle.types';

@Injectable()
export class DrizzleBatchRepository extends BatchRepository {
  public constructor(
    private readonly txHost: TransactionHost<DrizzleClient>,
  ) {
    super();
  }

  public async create(data: CreateBatchData): Promise<Batch> {
    // Uses transaction if active, otherwise normal connection
    const result = await this.txHost.tx
      .insert(batches)
      .values({
        projectId: data.projectId,
        userId: data.userId,
        mode: data.mode,
        fileCount: data.fileCount,
        rowCount: data.rowCount,
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Failed to create batch');
    }

    return BatchMapper.toDomain(row);
  }

  public async findById(id: string): Promise<Batch | null> {
    const result = await this.txHost.tx
      .select()
      .from(batches)
      .where(eq(batches.id, id))
      .limit(1);

    const row = result[0];
    return row ? BatchMapper.toDomain(row) : null;
  }
}
```

### Pattern 5: Feature Module with Strategy Factory

**What:** `IngestionModule` is a feature module that provides all ingestion-related services and strategies. It uses provider factories to register strategies and make them available for injection.

**When to use:** When you have a cohesive set of services that belong to a specific feature domain (ingestion, in this case).

**Trade-offs:**
- **Pro:** Clear feature boundaries — all ingestion code is co-located
- **Pro:** Easy to test in isolation
- **Pro:** Can be extracted to a separate package if needed
- **Con:** More modules to manage (but this is a good problem — better than monolithic modules)

**Example:**

```typescript
// infrastructure/ingestion/ingestion.module.ts
import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { ListModeStrategy } from './strategies/list-mode.strategy';
import { ProfileModeStrategy } from './strategies/profile-mode.strategy';

@Module({
  providers: [
    IngestionService,
    ListModeStrategy,
    ProfileModeStrategy,
  ],
  exports: [IngestionService], // Available for use case injection
})
export class IngestionModule {}
```

## Data Flow

### Complete Request Flow

```
1. HTTP POST /projects/:projectId/batches
   Content-Type: multipart/form-data
   Body: { mode: "list_mode", files: [File] }
         |
         v
2. BatchesController
   - @UseInterceptors(FilesInterceptor('files', 50)) extracts files
   - ZodValidationPipe validates DTO
   - @CurrentUser() extracts authenticated user
         |
         v
3. CreateBatchUseCase.execute() [@Transactional]
   ┌─────────────────────────────────────────┐
   │ TRANSACTION STARTS                       │
   │                                         │
   │ 3a. Verify project exists                │
   │     ProjectRepository.findById()         │
   │                                         │
   │ 3b. IngestionService.execute()           │
   │     ├── selectStrategy(mode)             │
   │     ├── strategy.validateInput(files)    │
   │     ├── strategy.parseFiles(files)       │
   │     │   └── SheetJS parses Excel → JSON  │
   │     ├── BatchRepository.create()         │
   │     │   └── INSERT INTO batches          │
   │     └── RowRepository.createMany()       │
   │         └── INSERT INTO rows (bulk)      │
   │                                         │
   │ TRANSACTION COMMITS (all succeeded)      │
   │ OR                                      │
   │ TRANSACTION ROLLS BACK (any failed)      │
   └─────────────────────────────────────────┘
         |
         v
4. Response
   { batchId: "uuid", rowCount: 42 }
```

### Transaction Boundary

```
┌─────────────────────────────────────────────┐
│ @Transactional() wraps entire use case       │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ USE CASE: CreateBatchUseCase            │ │
│ │                                         │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ TRANSACTION STARTS                   │ │ │
│ │ │                                     │ │ │
│ │ │ 1. ProjectRepository.findById()      │ │ │
│ │ │    (SELECT * FROM projects...)       │ │ │
│ │ │                                     │ │ │
│ │ │ 2. BatchRepository.create()          │ │ │
│ │ │    (INSERT INTO batches...)          │ │ │
│ │ │                                     │ │ │
│ │ │ 3. RowRepository.createMany()        │ │ │
│ │ │    (INSERT INTO rows... 100 rows)    │ │ │
│ │ │                                     │ │ │
│ │ │ COMMIT (if all succeed)              │ │ │
│ │ │ OR                                  │ │ │
│ │ │ ROLLBACK (if any fail)               │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Key insight:** Transaction propagation is automatic via `TransactionHost`. All repositories use `txHost.tx`, which provides:
- The active transaction client inside `@Transactional()` context
- The normal database client outside any transaction

### Strategy Selection Flow

```
IngestionService.execute(mode, files, ...)
    |
    v
selectStrategy(mode)
    |
    ├── mode === 'list_mode'
    │   └── return ListModeStrategy
    │
    └── mode === 'profile_mode'
        └── return ProfileModeStrategy

strategy.validateInput(files)
    |
    ├── ListModeStrategy: files.length === 1
    │   └── throw BadRequestException if not 1 file
    │
    └── ProfileModeStrategy: files.length >= 1
        └── throw BadRequestException if 0 files

strategy.parseFiles(files)
    |
    ├── ListModeStrategy
    │   └── XLSX.read(file.buffer)
    │       └── XLSX.utils.sheet_to_json(sheet)
    │           └── [{ "Name": "John", "Age": 30 }, ...]
    │
    └── ProfileModeStrategy
        └── For each file:
            └── XLSX.read(file.buffer)
                └── Parse cells with addresses as keys
                    └── { "A1": "Name", "B1": "John", ... }
```

## Integration with Existing Architecture

### Existing Modules

| Module | Location | Purpose | How Ingestion Integrates |
|--------|----------|---------|---------------------------|
| `DrizzleModule` | `infrastructure/database/drizzle/` | Provides database client + repositories | Extended with `BatchRepository` and `RowRepository` |
| `ProjectModule` | `infrastructure/project/` | Project CRUD operations | CreateBatchUseCase validates projectId via ProjectRepository |
| `AuthModule` | `infrastructure/auth/` | Clerk authentication | BatchesController uses `@UseGuards(ClerkAuthGuard)` |
| `HealthModule` | `infrastructure/health/` | Health monitoring | No integration needed |

### DrizzleModule Extension

```typescript
// infrastructure/database/drizzle/drizzle.module.ts (UPDATED)
import { Global, Module } from '@nestjs/common';

import { ProjectRepository } from '../../../core/repositories/project.repository';
import { UserRepository } from '../../../core/repositories/user.repository';
import { BatchRepository } from '../../../core/repositories/batch.repository'; // NEW
import { RowRepository } from '../../../core/repositories/row.repository';     // NEW

import { DrizzleService } from './drizzle.service';
import { DrizzleProjectRepository } from './repositories/drizzle-project.repository';
import { DrizzleUserRepository } from './repositories/drizzle-user.repository';
import { DrizzleBatchRepository } from './repositories/drizzle-batch.repository';     // NEW
import { DrizzleRowRepository } from './repositories/drizzle-row.repository';         // NEW

@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: UserRepository,
      useClass: DrizzleUserRepository,
    },
    {
      provide: ProjectRepository,
      useClass: DrizzleProjectRepository,
    },
    {
      provide: BatchRepository,           // NEW
      useClass: DrizzleBatchRepository,   // NEW
    },
    {
      provide: RowRepository,             // NEW
      useClass: DrizzleRowRepository,     // NEW
    },
  ],
  exports: [
    DrizzleService,
    UserRepository,
    ProjectRepository,
    BatchRepository,    // NEW
    RowRepository,      // NEW
  ],
})
export class DrizzleModule {}
```

### AppModule Integration

```typescript
// app.module.ts (UPDATED)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';

import { AuthModule } from './infrastructure/auth/auth.module';
import { DrizzleModule } from './infrastructure/database/drizzle/drizzle.module';
import { HealthModule } from './infrastructure/health/health.module';
import { ProjectModule } from './infrastructure/project/project.module';
import { IngestionModule } from './infrastructure/ingestion/ingestion.module'; // NEW

@Module({
  imports: [
    ConfigModule.forRoot({ /* existing config */ }),

    // NEW: ClsModule with Drizzle transaction support
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
      plugins: [
        new ClsPluginTransactional({
          imports: [DrizzleModule],
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: 'DRIZZLE_CLIENT', // Match your DrizzleService token
          }),
        }),
      ],
    }),

    DrizzleModule,
    AuthModule,
    HealthModule,
    ProjectModule,
    IngestionModule, // NEW
  ],
  controllers: [/* existing controllers */],
  providers: [/* existing providers */],
})
export class AppModule {}
```

### Controller Integration

```typescript
// presentation/controllers/batches.controller.ts (NEW)
import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ClerkAuthGuard } from '../../infrastructure/auth/guards/clerk-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { CreateBatchUseCase } from '../../core/use-cases/batch/create-batch.use-case';
import { createBatchSchema, CreateBatchDto } from '../dto/batch.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller('projects/:projectId/batches')
@UseGuards(ClerkAuthGuard)
export class BatchesController {
  public constructor(
    private readonly createBatch: CreateBatchUseCase,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 50, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  }))
  public async create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createBatchSchema)) body: CreateBatchDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    return this.createBatch.execute({
      projectId,
      userId: user.id,
      mode: body.mode,
      files,
    });
  }
}
```

## Clean Architecture Compliance

### Layer Dependencies (Correct Direction)

```
┌─────────────────────────────────────────┐
│ PRESENTATION                             │
│ - BatchesController depends on:         │
│   → CreateBatchUseCase (CORE)           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ CORE                                     │
│ - CreateBatchUseCase depends on:        │
│   → ProjectRepository (CORE interface)  │
│   → IngestionService (INFRASTRUCTURE)   │
│ - IngestionStrategy (interface only)    │
│ - BatchRepository (abstract class)      │
│ - RowRepository (abstract class)        │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│ INFRASTRUCTURE                           │
│ - IngestionService depends on:          │
│   → IngestionStrategy (CORE interface)  │
│   → BatchRepository (CORE interface)    │
│   → RowRepository (CORE interface)      │
│ - Concrete strategies implement:        │
│   → IngestionStrategy (CORE interface)  │
│ - Repositories implement:                │
│   → BatchRepository (CORE)               │
│   → RowRepository (CORE)                 │
└─────────────────────────────────────────┘
```

**Key compliance points:**

1. **Core defines abstractions**: `IngestionStrategy`, `BatchRepository`, `RowRepository` are all defined in Core as interfaces/abstract classes.
2. **Infrastructure implements abstractions**: Concrete strategies and repositories live in Infrastructure.
3. **Core use case can depend on Infrastructure service**: `CreateBatchUseCase` depends on `IngestionService` (Infrastructure). This is acceptable because the use case is orchestrating infrastructure-level operations. The service itself depends on Core interfaces, maintaining the dependency direction.
4. **No Core → Infrastructure imports for types**: Core never imports concrete implementations, only its own interfaces.

### Strategy Pattern Layer Placement Justification

**Question:** Should `IngestionStrategy` be in Core or Infrastructure?

**Answer:** **Core** — because it represents a domain-level abstraction (how to parse files), not a technical implementation detail.

**Supporting principle:** From Clean Architecture research, "when the Strategy Pattern encapsulates business rules or domain logic, it belongs in the domain/core layer. The interface/abstraction would typically be defined in the core/application layer, while the concrete strategy implementations would be in the infrastructure layer." ([Source](https://www.techtarget.com/searchapparchitecture/tip/A-primer-on-the-clean-architecture-pattern-and-its-principles))

**In our case:**
- `IngestionStrategy` defines **what** it means to parse files (domain concern)
- `ListModeStrategy` and `ProfileModeStrategy` define **how** to parse with xlsx (infrastructure concern)

### File Placement Summary

| Component | Path | Layer | Rationale |
|-----------|------|-------|-----------|
| `IngestionStrategy` | `core/strategies/ingestion-strategy.interface.ts` | Core | Domain abstraction |
| `ListModeStrategy` | `infrastructure/ingestion/strategies/list-mode.strategy.ts` | Infrastructure | Depends on xlsx library |
| `ProfileModeStrategy` | `infrastructure/ingestion/strategies/profile-mode.strategy.ts` | Infrastructure | Depends on xlsx library |
| `IngestionService` | `infrastructure/ingestion/ingestion.service.ts` | Infrastructure | Orchestrates infrastructure strategies |
| `CreateBatchUseCase` | `core/use-cases/batch/create-batch.use-case.ts` | Core | Business logic orchestration |
| `BatchRepository` | `core/repositories/batch.repository.ts` | Core (interface) | Domain repository contract |
| `DrizzleBatchRepository` | `infrastructure/database/drizzle/repositories/drizzle-batch.repository.ts` | Infrastructure | Database implementation |
| `BatchesController` | `presentation/controllers/batches.controller.ts` | Presentation | HTTP handling |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Strategy Selection Logic in Controller

**What people do:** Put `if (mode === 'list_mode')` logic directly in the controller.

**Why it's wrong:**
- Violates Single Responsibility — controller becomes parsing logic aware
- Not extensible — adding new strategies requires modifying controller
- Makes testing harder — controller tests need to know about all strategies

**Do this instead:** Controller calls use case, use case calls `IngestionService`, service selects strategy.

### Anti-Pattern 2: Transaction in Repository

**What people do:** Wrap repository methods with `txHost.withTransaction()`.

**Why it's wrong:**
- Transaction boundaries should be at the use case level (business operation), not data access level
- Multiple repository calls in a use case wouldn't share the same transaction
- Violates separation of concerns — repositories should just do CRUD

**Do this instead:** Use `@Transactional()` on the use case method. Repositories automatically participate via `TransactionHost`.

### Anti-Pattern 3: Strategies Depending on Repositories

**What people do:** Inject `BatchRepository` into `ListModeStrategy` to save parsed data.

**Why it's wrong:**
- Strategy's job is parsing, not persistence — violates Single Responsibility
- Makes strategies harder to test (need to mock repositories)
- Couples parsing logic to database schema

**Do this instead:** Strategies return `ParsedRow[]`, `IngestionService` handles persistence.

### Anti-Pattern 4: Manual Transaction Management

**What people do:** Pass around `tx` parameter to every repository method.

```typescript
// ❌ WRONG
async execute(input) {
  await this.txHost.withTransaction(async (tx) => {
    await this.batchRepository.create(data, tx);
    await this.rowRepository.createMany(rows, tx);
  });
}
```

**Why it's wrong:**
- Pollutes method signatures throughout the codebase
- Error-prone — easy to forget to pass `tx` somewhere
- Verbose — lots of boilerplate for every transactional operation

**Do this instead:** Use `@Transactional()` decorator + `TransactionHost` pattern.

```typescript
// ✅ CORRECT
@Transactional()
async execute(input) {
  await this.batchRepository.create(data); // Automatically uses transaction
  await this.rowRepository.createMany(rows); // Automatically uses transaction
}
```

### Anti-Pattern 5: if/else Blocks for Strategy Selection in Service

**What people do:**
```typescript
// ❌ WRONG
async execute(mode, files, projectId) {
  if (mode === 'list_mode') {
    // List mode parsing logic here
  } else if (mode === 'profile_mode') {
    // Profile mode parsing logic here
  }
}
```

**Why it's wrong:**
- Violates Open/Closed Principle — adding new strategies requires modifying service
- Service method becomes huge with all parsing logic
- Hard to test individual strategies

**Do this instead:** Use Strategy Pattern with polymorphism.

```typescript
// ✅ CORRECT
private selectStrategy(mode: IngestionMode): IngestionStrategy {
  switch (mode) {
    case IngestionMode.List: return this.listModeStrategy;
    case IngestionMode.Profile: return this.profileModeStrategy;
  }
}

async execute(mode, files, projectId) {
  const strategy = this.selectStrategy(mode);
  const parsedRows = await strategy.parseFiles(files);
  // ... persistence logic ...
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture is perfect — single transaction per upload, synchronous processing |
| 1k-100k users | Add upload validation improvements: streaming validation for large files, pre-parse file count/size checks before transaction |
| 100k+ users | Consider async processing: Upload → S3, queue job → background worker parses → database; Transaction only for batch+rows insert, not parsing |

### Scaling Priorities

1. **First bottleneck:** Large file parsing blocks request thread
   - **Solution:** Add file size limits (5MB per file already planned), stream parsing for very large files
   - **When to implement:** When average upload > 2MB and parsing takes > 5 seconds

2. **Second bottleneck:** Database transaction locks during bulk insert
   - **Solution:** Batch inserts in chunks (e.g., 1000 rows at a time instead of all at once)
   - **When to implement:** When row count per batch > 10,000 rows

3. **Third bottleneck:** Synchronous processing blocks user
   - **Solution:** Move to async processing (upload to S3, background worker, webhook notification)
   - **When to implement:** When parsing + insert > 10 seconds

## Module Dependencies and Build Order

### Module Dependency Graph

```
AppModule
    |
    ├── ConfigModule (NestJS)
    ├── ClsModule (NEW: nestjs-cls with Drizzle adapter)
    |       └── depends on: DrizzleModule
    |
    ├── DrizzleModule (@Global)
    |       └── provides: DrizzleService, BatchRepository, RowRepository
    |
    ├── AuthModule
    ├── HealthModule
    ├── ProjectModule
    |       └── depends on: DrizzleModule (via @Global)
    |
    └── IngestionModule (NEW)
            └── depends on: DrizzleModule (via @Global)
```

### Build Order Implications

**Phase 1: Core Entities and Interfaces**
1. Create `Batch` entity in `core/entities/`
2. Create `Row` entity in `core/entities/`
3. Create `BatchRepository` abstract class in `core/repositories/`
4. Create `RowRepository` abstract class in `core/repositories/`
5. Create `IngestionStrategy` interface in `core/strategies/`

**Dependencies:** None
**Enables:** Repository implementations, strategies

**Phase 2: Database Schema and Repositories**
1. Create Drizzle schema for `batches` table
2. Create Drizzle schema for `rows` table
3. Create `DrizzleBatchRepository` in `infrastructure/database/drizzle/repositories/`
4. Create `DrizzleRowRepository` in `infrastructure/database/drizzle/repositories/`
5. Update `DrizzleModule` to provide new repositories

**Dependencies:** Phase 1
**Enables:** Use case and service can persist data

**Phase 3: Transaction Support**
1. Install `nestjs-cls`, `@nestjs-cls/transactional`, `@nestjs-cls/transactional-adapter-drizzle-orm`
2. Configure `ClsModule` in `AppModule` with Drizzle adapter
3. Update existing repositories to use `TransactionHost` instead of `DrizzleService.getClient()`

**Dependencies:** Phase 2
**Enables:** @Transactional decorator works

**Phase 4: Strategies**
1. Create `ListModeStrategy` in `infrastructure/ingestion/strategies/`
2. Create `ProfileModeStrategy` in `infrastructure/ingestion/strategies/`
3. Write unit tests for each strategy

**Dependencies:** Phase 1 (IngestionStrategy interface)
**Enables:** IngestionService can use strategies

**Phase 5: Ingestion Service and Module**
1. Create `IngestionService` in `infrastructure/ingestion/`
2. Create `IngestionModule` in `infrastructure/ingestion/`
3. Register strategies as providers in module

**Dependencies:** Phase 2 (repositories), Phase 4 (strategies)
**Enables:** Use case can call service

**Phase 6: Use Case**
1. Create `CreateBatchUseCase` in `core/use-cases/batch/`
2. Add `@Transactional()` decorator
3. Write integration tests with transactions

**Dependencies:** Phase 3 (transaction support), Phase 5 (IngestionService)
**Enables:** Controller can orchestrate batch creation

**Phase 7: Presentation Layer**
1. Create `CreateBatchDto` with Zod schema
2. Create `BatchesController` with file upload
3. Register controller in AppModule
4. Write E2E tests

**Dependencies:** Phase 6 (use case)
**Enables:** HTTP API for batch creation

## Transaction Configuration Details

### Required Dependencies

```json
{
  "dependencies": {
    "nestjs-cls": "^4.6.3",
    "@nestjs-cls/transactional": "^3.2.0",
    "@nestjs-cls/transactional-adapter-drizzle-orm": "^3.2.0"
  }
}
```

### ClsModule Configuration

```typescript
// app.module.ts
import { ClsModule } from 'nestjs-cls';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';

ClsModule.forRoot({
  global: true, // Make CLS available globally
  middleware: { mount: true }, // Enable middleware for request context
  plugins: [
    new ClsPluginTransactional({
      imports: [DrizzleModule], // Import module that provides database client
      adapter: new TransactionalAdapterDrizzleOrm({
        drizzleInstanceToken: DrizzleService, // Token used by DrizzleService provider
      }),
    }),
  ],
})
```

### TransactionHost Type Configuration

```typescript
// infrastructure/database/drizzle/drizzle.types.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
```

### Repository Type-Safe Injection

```typescript
import { TransactionHost } from '@nestjs-cls/transactional';
import type { DrizzleClient } from '../drizzle.types';

@Injectable()
export class DrizzleBatchRepository extends BatchRepository {
  public constructor(
    private readonly txHost: TransactionHost<DrizzleClient>,
  ) {
    super();
  }

  // Now txHost.tx is properly typed as DrizzleClient
}
```

## Summary

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Where does IngestionStrategy belong? | **Core** (interface only) | Domain abstraction, not technical detail |
| Where do concrete strategies belong? | **Infrastructure** | Depend on xlsx library |
| Where does IngestionService belong? | **Infrastructure** | Orchestrates Infrastructure strategies |
| Transaction boundary? | **Use case** with `@Transactional()` | Business operation scope, automatic propagation |
| Transaction implementation? | **@nestjs-cls/transactional** with Drizzle adapter | Clean code, no boilerplate, type-safe |
| Repository transaction access? | **TransactionHost.tx** | Automatic participation, no parameter pollution |
| Module organization? | **IngestionModule** (feature module) | Clear boundaries, co-located code |
| Repository registration? | **DrizzleModule** (@Global) | Consistent with existing pattern |

## Sources

### HIGH Confidence (Official Documentation)
- [NestJS Modules Documentation](https://docs.nestjs.com/modules) - Module organization patterns
- [@nestjs-cls/transactional Documentation](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional) - Transaction management with CLS
- [Drizzle ORM Adapter Documentation](https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional/drizzle-orm-adapter) - Drizzle-specific transaction configuration
- [SheetJS Documentation](https://docs.sheetjs.com/docs/demos/net/server/nestjs/) - NestJS integration for Excel parsing

### MEDIUM Confidence (Community Verified)
- [Repository Pattern in NestJS with Drizzle ORM](https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae) - Repository + transaction patterns
- [Clean Architecture Strategy Pattern Layer Placement](https://www.techtarget.com/searchapparchitecture/tip/A-primer-on-the-clean-architecture-pattern-and-its-principles) - Where Strategy Pattern belongs
- [NestJS + Drizzle: A Great Match](https://trilon.io/blog/nestjs-drizzleorm-a-great-match) - Integration patterns
- [Creating Shared Module in NestJS](https://medium.com/@briankworld/creating-a-shared-module-in-nestjs-benefits-and-use-cases-6292a1dcd200) - Feature vs Shared module organization
- [NestJS in 2026: Modular Monolith](https://tyronneratcliff.com/nestjs-for-scaling-backend-systems/) - 2026 architecture trends

### Context from Existing Codebase
- `apps/api/src/infrastructure/database/drizzle/drizzle.module.ts` - Existing @Global repository pattern
- `apps/api/src/core/use-cases/project/create-project.use-case.ts` - Existing use case pattern
- `apps/api/src/infrastructure/project/project.module.ts` - Existing feature module pattern

---
*Architecture research for: Data Ingestion with Strategy Pattern*
*Researched: 2026-01-29*
