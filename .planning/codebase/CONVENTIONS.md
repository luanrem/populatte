# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- Use kebab-case for file names: `app.controller.ts`, `user.repository.ts`, `drizzle-user.repository.ts`
- Use `.spec.ts` suffix for test files: `app.controller.spec.ts`
- Use `.use-case.ts` suffix for use case classes: `sync-user.use-case.ts`, `delete-user.use-case.ts`
- Use domain-specific suffixes: `.controller.ts`, `.service.ts`, `.module.ts`, `.guard.ts`, `.mapper.ts`, `.repository.ts`, `.dto.ts`

**Functions:**
- Use camelCase for function names
- Constructor parameters use camelCase: `private readonly userRepository: UserRepository`
- Method parameters use camelCase: `findByClerkId(clerkId: string)`
- Utility functions are typically static methods: `UserMapper.toDomain(row)`

**Variables:**
- Use camelCase for local variables and properties
- Use const for module-level constants
- Prefix boolean variables for clarity: `existingUser`, `row` for query results
- Use descriptive names for query results: `result` for database query arrays

**Types:**
- Use PascalCase for classes, interfaces, and types: `User`, `CreateUserData`, `UpdateUserData`
- No `I` prefix for interfaces (TypeScript convention): `UserRepository` not `IUserRepository`
- Use descriptive suffixes: `Data` for input/output types (`CreateUserData`, `UpdateUserData`), `Dto` for presentation DTOs (`ClerkWebhookDto`)

## Code Style

**Formatting:**
- Prettier with configuration in `apps/api/.prettierrc`:
  - Single quotes: `'string'` instead of `"string"`
  - Trailing commas: Always include in multi-line objects/arrays
- Run formatting: `npm run format`

**Linting:**
- ESLint configured per-app (Next.js, NestJS, React)
- API: Uses typescript-eslint with recommended + type-checked rules via `apps/api/eslint.config.mjs`
- Web: Uses ESLint config-next with Next.js-specific rules via `apps/web/eslint.config.mjs`
- Run linting: `npm run lint --filter=@populatte/api`

## Import Organization

**Order:**
1. Node.js built-in modules: `import { readFile } from 'fs/promises'`
2. External packages: `import { Injectable } from '@nestjs/common'`
3. Internal shared packages: `import { User } from '@populatte/types'`
4. Relative imports: `import { UserRepository } from '../repositories/user.repository'`

**Path Aliases:**
- Next.js web app: `@/*` maps to `./` in `apps/web/tsconfig.json`
- Use `@/components/ui/button` for imports, `@/lib/utils` for utilities

**Blank Lines:**
- ESLint enforces blank line between import groups (enforced automatically)

## Error Handling

**Patterns:**
- Return `null` for not-found queries: `async findById(id: string): Promise<User | null>`
- Throw `Error` with descriptive message for invalid operations: `throw new Error('Failed to create user')`
- Include context in error messages: `throw new Error(\`User not found: ${clerkId}\`)`
- Use nullish coalescing for defaults: `firstName ?? null`

**Validation:**
- Use Zod schemas (from `@populatte/commons`) for runtime validation of incoming data
- Parse and validate at presentation layer (controllers) before passing to core

## Logging

**Framework:** Console methods (built-in), no external logging library currently configured

**Patterns:**
- Not heavily used in current codebase
- When logging, use console methods: `console.log()`, `console.error()`
- Log at critical decision points and error scenarios

## Comments

**When to Comment:**
- Inline comments minimal—prefer clear naming
- Comments document the "why" not the "what"
- Comments for complex business logic or non-obvious decisions

**JSDoc/TSDoc:**
- Not consistently used across codebase
- When adding documentation, use JSDoc format for class methods

## Function Design

**Size:** Keep functions focused and under 30 lines where possible

**Parameters:**
- Use specific parameter types, never `any`
- Use interface parameters for multiple related parameters: `SyncUserInput` interface instead of separate parameters
- Function methods: Use `public` modifier explicitly on all class methods (NestJS convention)

**Return Values:**
- Explicit return types on all public methods
- Use `Promise<T>` for async operations
- Use `Promise<T | null>` for operations that may return nothing
- Use `Promise<void>` for operations with no return value

## Module Design

**Exports:**
- Export classes, interfaces, and types using `export class`, `export interface`
- Create index files (`index.ts`) for barrel exports in core modules:
  - `apps/api/src/core/entities/index.ts` exports all entities
  - `apps/api/src/core/use-cases/index.ts` exports all use cases

**Barrel Files:**
- Location: `apps/api/src/core/use-cases/user/index.ts`
- Pattern: Export public classes from subdirectory

Example barrel file:
```typescript
export { SyncUserUseCase } from './sync-user.use-case';
export { DeleteUserUseCase } from './delete-user.use-case';
```

## Class Design

**Constructors:**
- Use `public constructor(private readonly ...)` for dependency injection (NestJS pattern)
- All dependencies marked `readonly` to prevent mutation
- Single responsibility—one job per class

**Static Methods:**
- Use static methods for utility operations: `UserMapper.toDomain(row)`
- Static methods on mapper classes for entity transformations

## TypeScript Strict Modes

**Current Settings (`apps/api/tsconfig.json`):**
- `strictNullChecks: true` - Enforce null/undefined handling
- `forceConsistentCasingInFileNames: true` - Prevent file casing issues
- `noImplicitAny: false` - Allow implicit any (relaxed from CLAUDE.md recommendation)
- `noFallthroughCasesInSwitch: false` - Allow fallthrough cases

**Current Settings (`apps/web/tsconfig.json`):**
- `strict: true` - Enforce all strict checks
- `isolatedModules: true` - Ensure each file can be type-checked independently

## NestJS-Specific Conventions

**Decorators:**
- Use explicit decorators: `@Controller()`, `@Injectable()`, `@Module()`, `@Get()`, `@Post()`
- Place decorators on classes and methods directly above definition

**Dependency Injection:**
- Inject via constructor: `constructor(private readonly service: ServiceName)`
- Use `@Inject('token')` for string-based injection
- Mark all injected dependencies `readonly`

**Module Structure:**
- `@Module()` decorator lists imports, controllers, providers
- Global modules marked with `@Global()`
- Modules provide providers to consumers

## React/Next.js Conventions

**Components:**
- Use functional components with hooks
- PascalCase component names: `AppSidebar`, `ModeToggle`, `ThemeProvider`
- Use `"use client"` directive for client components in Next.js App Router
- One component per file

**Hooks:**
- Custom hooks use `use` prefix: `useMobile()` in `apps/web/hooks/use-mobile.ts`
- React hooks for state: `useState()`, `useEffect()`, `useContext()`
- Third-party hooks: `useTheme()` from `next-themes`, `useUser()` from `@clerk/nextjs`

**Props:**
- Explicitly type component props
- Use `type` keyword for prop interfaces

**Styling:**
- Use Tailwind CSS classes
- Use `cn()` utility from `@/lib/utils` to merge Tailwind classes with shadcn overrides
- Import shadcn/ui components from `@/components/ui/`

---

*Convention analysis: 2026-01-28*
