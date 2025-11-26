# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Populatte** is a B2B SaaS product designed to automate form-filling from Excel data via a browser extension. The monorepo contains three applications (NestJS API, Next.js web dashboard, React browser extension) sharing common packages for types, utilities, and configurations.

**Key Concept:** "Do Excel para a Web, num gole de café" - Transforms tedious manual data entry into automated form population.

## Monorepo Architecture

This is a **Turborepo + NPM Workspaces** monorepo with strict TypeScript and centralized configurations.

### Workspace Organization

```
apps/
├── api/          - NestJS backend with Clean Architecture (Core/Infrastructure/Presentation)
├── web/          - Next.js dashboard (App Router) for project management and data uploads
└── extension/    - Chrome extension (React + Vite + CRXJS) for form field mapping and population

packages/
├── types/        - Shared TypeScript interfaces (source of truth for all types)
├── commons/      - Shared utilities (StringUtils, DateUtils) and Zod validation schemas
├── eslint-config/- ESLint configurations (base, nest, next, react) to prevent rule conflicts
└── tsconfig/     - TypeScript configurations (base, nest, next, react) with strict mode
```

### Critical Architectural Decisions

1. **Strict TypeScript Everywhere**: All packages use `noUncheckedIndexedAccess`, `noUnusedLocals`, `exactOptionalPropertyTypes`. Never disable these without discussion.

2. **Framework-Specific ESLint Configs**: Each app extends a specific config to prevent rule bleeding:
   - `apps/api` uses `@populatte/eslint-config/nest` (enforces explicit member accessibility, decorators)
   - `apps/web` uses `@populatte/eslint-config/next` (React hooks, Next.js rules)
   - `apps/extension` uses `@populatte/eslint-config/react` (React-only rules, no Next.js)

3. **Clean Architecture in API**: The `apps/api` follows strict layering:
   - `src/core/` - Domain logic (entities, use cases, repository interfaces)
   - `src/infrastructure/` - External concerns (database, API clients, repository implementations)
   - `src/presentation/` - HTTP layer (controllers, DTOs, middleware)
   - **Dependency Rule**: Core never imports from Infrastructure or Presentation

4. **Type Sharing Strategy**:
   - Define all shared types in `packages/types`
   - Never duplicate type definitions across apps
   - Use Zod schemas in `packages/commons/schemas` for runtime validation
   - The pattern: TypeScript types for compile-time, Zod schemas for runtime

## Essential Commands

### Development Workflow

```bash
# Install all workspace dependencies
npm install

# Run all apps in parallel (API, Web, Extension)
npm run dev

# Run single app
npm run dev --filter=@populatte/api
npm run dev --filter=@populatte/web
npm run dev --filter=@populatte/extension

# Build all apps (Turborepo handles dependency order)
npm run build

# Build single app with dependencies
npm run build --filter=@populatte/api

# Clean all build artifacts and node_modules
npm run clean
```

### Code Quality

```bash
# Lint entire monorepo
npm run lint

# Lint specific workspace
npm run lint --filter=@populatte/api

# Type check everything
npm run type-check

# Format all code with Prettier
npm run format

# Check formatting without writing
npm run format:check
```

### Testing

```bash
# Run all tests across workspaces
npm run test

# Run tests for specific workspace
npm run test --filter=@populatte/api

# Watch mode for tests (run from app directory)
cd apps/api && npm run test:watch

# Coverage report
cd apps/api && npm run test:cov
```

## How to Add New Code

### Adding Shared Types

**When to add**: Types used by 2+ apps (User, Project, FormField, etc.)

```typescript
// packages/types/src/project.types.ts
import type { BaseEntity } from './common.types';

export interface Project extends BaseEntity {
  name: string;
  status: ProjectStatus;
  excelDataUrl: string;
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

// Export in packages/types/src/index.ts
export * from './project.types';
```

**Consume in any app:**
```typescript
import { Project, ProjectStatus } from '@populatte/types';
```

### Adding Shared Utilities

**When to add**: Reusable logic needed by 2+ apps (validation, formatting, parsing)

```typescript
// packages/commons/src/utils/excel.utils.ts
export class ExcelUtils {
  public static parseDate(excelValue: number | string): Date {
    // Implementation
  }
}

// Export in packages/commons/src/utils/index.ts
export * from './excel.utils';
```

### Adding Zod Schemas

**When to add**: Runtime validation for API requests, form inputs, external data

```typescript
// packages/commons/src/schemas/project.schema.ts
import { z } from 'zod';
import { ProjectStatus } from '@populatte/types';

export const createProjectSchema = z.object({
  name: z.string().min(3).max(100),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.DRAFT),
  excelFile: z.instanceof(File),
});

// Use in NestJS controller
import { createProjectSchema } from '@populatte/commons';

async createProject(body: unknown) {
  const validated = createProjectSchema.parse(body); // throws ZodError if invalid
  // validated is now type-safe
}
```

### Adding New Apps

1. Create app directory in `apps/`
2. Add `package.json` with appropriate dependencies
3. Extend correct ESLint config: `@populatte/eslint-config/{nest|next|react}`
4. Extend correct tsconfig: `@populatte/tsconfig/{nest|next|react}.json`
5. Add workspace paths for shared packages:
   ```json
   "paths": {
     "@populatte/types": ["../../packages/types/src"],
     "@populatte/commons": ["../../packages/commons/src"]
   }
   ```

## Turborepo Pipeline Behavior

The `turbo.json` defines task dependencies:

- `build` runs dependent package builds first (`"dependsOn": ["^build"]`)
- `dev` never caches, runs persistently
- `lint` and `type-check` run on dependent packages first
- `test` requires packages to be built first

**Important**: When you modify `packages/types`, Turborepo automatically rebuilds apps that depend on it.

## SOLID Principles Enforcement

This codebase strictly follows SOLID:

1. **Single Responsibility**: Each utility class has one job (StringUtils only for strings)
2. **Open/Closed**: Shared configs can be extended, not modified (apps extend base configs)
3. **Liskov Substitution**: All entities extend BaseEntity consistently
4. **Interface Segregation**: Multiple focused ESLint configs instead of one monolithic config
5. **Dependency Inversion**: API core layer depends on abstractions (repository interfaces), not implementations

When adding code, ask: "Does this violate SOLID?" If a class does multiple things, split it.

## Language and Code Style

- **All code, comments, and filenames MUST be in English**
- Use PascalCase for classes, interfaces, enums
- Use camelCase for functions, variables
- No `I` prefix for interfaces (TypeScript convention)
- Utilities are static classes (e.g., `StringUtils.capitalize()`)
- Prefer explicit types over inference in function signatures
- Never use `any` - this is enforced by ESLint

## Common Patterns

### Import Organization (Enforced by ESLint)

```typescript
// 1. Node built-ins
import { readFile } from 'fs/promises';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

// 3. Internal shared packages
import { User } from '@populatte/types';
import { StringUtils } from '@populatte/commons';

// 4. Relative imports (parent/sibling)
import { UserRepository } from '../repositories/user.repository';

// Blank line between groups (automatic via ESLint)
```

### NestJS Clean Architecture Pattern

```typescript
// Core layer (domain logic)
export interface UserRepository {
  findById(id: string): Promise<User | null>;
}

// Infrastructure layer (implementation)
@Injectable()
export class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    // Database logic
  }
}

// Presentation layer (HTTP)
@Controller('users')
export class UserController {
  constructor(
    @Inject('UserRepository') private userRepo: UserRepository // ← Depends on abstraction
  ) {}
}
```

## Product Context (for feature development)

**User Journey:**
1. User uploads Excel with client data to Web Dashboard
2. User opens target website (e.g., government form)
3. User activates Chrome Extension
4. Extension shows sidebar with Excel columns
5. User clicks column → clicks form field to create mapping
6. AI suggests obvious mappings (CNPJ column → #txtCnpj field)
7. User clicks "Populate" to auto-fill form
8. Extension marks record as completed

When implementing features, reference this flow to maintain product coherence.

## Critical Files to Preserve

- `turbo.json` - Pipeline definitions, do not modify without understanding caching implications
- `packages/tsconfig/base.json` - Strict mode foundation for entire monorepo
- `packages/eslint-config/base.js` - Linting foundation
- All `package.json` files with `"private": true` - Internal packages, never publish

## Browser Extension Specifics

The extension (`apps/extension`) uses Manifest V3:
- `src/background/` - Service worker (persistent background tasks)
- `src/content/` - Scripts injected into web pages (DOM manipulation)
- `src/popup/` - Extension popup UI (React component)
- `src/options/` - Settings page
- `public/manifest.json` - Chrome extension configuration

**Important**: Content scripts have restricted API access. Use message passing to background script for sensitive operations.

## Getting Help

If the codebase structure is unclear:
1. Check `README.md` for high-level architecture
2. Check `IDEA.md` for product vision and context
3. Examine `turbo.json` for task orchestration
4. Review shared package `package.json` files to understand dependency relationships
