# Monorepo Architecture Guide

A comprehensive guide to understanding and implementing a monorepo with Turborepo for the Populatte project.

---

## Table of Contents

1. [What is a Monorepo?](#what-is-a-monorepo)
2. [The Problem: Multiple Repositories](#the-problem-multiple-repositories)
3. [The Solution: Monorepo](#the-solution-monorepo)
4. [What is Turborepo?](#what-is-turborepo)
5. [Implementation Guide](#implementation-guide)
6. [Practical Examples](#practical-examples)
7. [When to Use (and Not Use) Monorepo](#when-to-use-and-not-use-monorepo)

---

## What is a Monorepo?

A **monorepo** (monolithic repository) is a software development strategy where code for multiple projects is stored in a single repository.

### Simple Analogy

**Without Monorepo (Multi-repo):** 🏘️ Multiple houses (one per family)
- Each project = separate repository
- Each has its own dependencies, configs, versions

**With Monorepo:** 🏢 One apartment building (multiple families, shared facilities)
- All projects = single repository
- Shared dependencies, configs, and utilities
- Centralized management

---

## The Problem: Multiple Repositories

### Scenario: Populatte with 3 Separate Repos

```
📁 populatte-web/        (Repository 1 - Next.js)
📁 populatte-api/        (Repository 2 - NestJS)
📁 populatte-extension/  (Repository 3 - React)
```

### Real-World Example: Adding a Field to User Type

#### Step 1: Update API

```typescript
// populatte-api/src/types/user.ts
interface User {
  id: string;
  name: string;
  email: string;
  role: string;  // ← NEW FIELD
}
```

#### Step 2: Update Web (Copy/Paste)

```typescript
// populatte-web/src/types/user.ts
interface User {  // ❌ DUPLICATED!
  id: string;
  name: string;
  email: string;
  role: string;  // ← MUST COPY MANUALLY
}
```

#### Step 3: Update Extension (Copy/Paste Again)

```typescript
// populatte-extension/src/types/user.ts
interface User {  // ❌ TRIPLED!
  id: string;
  name: string;
  email: string;
  role: string;  // ← MUST COPY MANUALLY
}
```

### Problems

❌ **3 commits** in 3 different repositories
❌ **Manual synchronization** required
❌ **High risk** of forgetting to update one repo
❌ **Bugs in production** if types are out of sync
❌ **3 terminal windows** to run everything
❌ **3 separate clones** for new developers

---

## The Solution: Monorepo

### Same Scenario with Monorepo

```
populatte/                        ← ONE REPOSITORY
├── apps/
│   ├── web/                     ← Next.js app
│   ├── api/                     ← NestJS app
│   └── extension/               ← React extension
│
└── packages/                    ← SHARED CODE
    └── types/
        └── src/user.types.ts    ← SINGLE SOURCE OF TRUTH
```

### Adding a Field (Monorepo Way)

#### Step 1: Update ONE file

```typescript
// packages/types/src/user.types.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;  // ✅ Add here ONCE
}
```

#### Step 2: All apps see it instantly

```typescript
// apps/api/src/controller.ts
import { User } from '@populatte/types';  // ✅ Has "role"

// apps/web/src/page.tsx
import { User } from '@populatte/types';  // ✅ Has "role"

// apps/extension/src/popup.tsx
import { User } from '@populatte/types';  // ✅ Has "role"
```

#### Step 3: TypeScript validates everywhere

```bash
$ pnpm type-check
❌ Error in apps/web/UserCard.tsx:15
   Property 'role' is missing in type 'User'
```

### Benefits

✅ **1 commit** to change shared code
✅ **Automatic sync** across all apps
✅ **Impossible** to have out-of-sync types
✅ **TypeScript catches** breaking changes
✅ **1 terminal** to run everything
✅ **1 clone** for new developers

---

## What is Turborepo?

**Turborepo** is a high-performance build system for JavaScript/TypeScript monorepos.

### What It Does

1. **Task Orchestration** - Runs commands (dev, build, lint) across multiple projects
2. **Intelligent Caching** - Never rebuilds unchanged code
3. **Parallel Execution** - Runs independent tasks simultaneously
4. **Dependency Management** - Builds projects in the correct order

### Key Features

#### 1. Smart Caching

```bash
# First build: 2 minutes
$ turbo build

# Change only apps/web, rebuild: 10 seconds
$ turbo build
# ✓ packages/types (cached)
# ✓ packages/commons (cached)
# ● apps/web (rebuilt)
# ✓ apps/api (cached)
```

#### 2. Parallel Execution

```bash
$ turbo run dev

# Runs simultaneously:
apps/web:      ✓ Ready on http://localhost:3000
apps/api:      ✓ Ready on http://localhost:3001
apps/extension: ✓ Vite dev server started
```

#### 3. Dependency Order

```bash
$ turbo build

# Automatically builds in order:
1. packages/types      (no dependencies)
2. packages/commons    (depends on types)
3. apps/web           (depends on types + commons)
4. apps/api           (depends on types + commons)
5. apps/extension     (depends on types + commons)
```

---

## Implementation Guide

### Step 1: Root Package.json

Create `package.json` at the root:

```json
{
  "name": "populatte",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^1.11.3"
  }
}
```

**Key points:**
- `workspaces: ["apps/*", "packages/*"]` - Tells pnpm these are workspaces
- `turbo run dev` - Runs `dev` script in all packages that have it

### Step 2: Turbo Configuration

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

**Understanding `dependsOn`:**
- `"^build"` - Build dependencies FIRST (the `^` means "upstream dependencies")
- Without `^`: Build all packages in parallel
- With `^`: Build dependencies before dependents

### Step 3: Create Shared Package (types)

```
packages/types/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── user.types.ts
    └── project.types.ts
```

**packages/types/package.json:**

```json
{
  "name": "@populatte/types",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

**packages/types/src/index.ts:**

```typescript
export * from './user.types';
export * from './project.types';
```

**packages/types/src/user.types.ts:**

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}
```

### Step 4: Use Shared Package in Apps

**apps/web/package.json:**

```json
{
  "name": "@populatte/web",
  "dependencies": {
    "@populatte/types": "*",    // ← Use local workspace
    "next": "^16.0.5",
    "react": "^19.2.0"
  }
}
```

**Note:** The `"*"` means "use whatever version is in the workspace"

**apps/web/app/page.tsx:**

```typescript
import { User, UserRole } from '@populatte/types';

export default function Page() {
  const user: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.ADMIN,
  };

  return <div>{user.name}</div>;
}
```

### Step 5: TypeScript Configuration

**apps/web/tsconfig.json:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@populatte/types": ["../../packages/types/src"]
    }
  }
}
```

---

## Practical Examples

### Example 1: Adding a New Shared Utility

#### Create in packages/commons

```typescript
// packages/commons/src/utils/date.utils.ts
export class DateUtils {
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
```

#### Use in Multiple Apps

```typescript
// apps/web/app/page.tsx
import { DateUtils } from '@populatte/commons';
const formatted = DateUtils.formatDate(new Date());

// apps/api/src/controllers/user.controller.ts
import { DateUtils } from '@populatte/commons';
const formatted = DateUtils.formatDate(user.createdAt);
```

### Example 2: Running All Apps

```bash
# Install everything
$ pnpm install

# Run all apps in dev mode
$ pnpm dev

Output:
@populatte/web: Ready on http://localhost:3000
@populatte/api: Listening on http://localhost:3001
@populatte/extension: Vite dev server started
```

### Example 3: Building for Production

```bash
$ pnpm build

Output:
@populatte/types: Build succeeded
@populatte/commons: Build succeeded (uses @populatte/types)
@populatte/web: Build succeeded (uses types + commons)
@populatte/api: Build succeeded (uses types + commons)
@populatte/extension: Build succeeded (uses types + commons)
```

### Example 4: Type Safety Across Apps

```typescript
// packages/types/src/project.types.ts
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;  // ← Change from string to enum
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}
```

```bash
$ pnpm type-check

❌ apps/web/app/projects/page.tsx:25
   Type 'string' is not assignable to type 'ProjectStatus'

❌ apps/api/src/services/project.service.ts:42
   Type 'string' is not assignable to type 'ProjectStatus'
```

TypeScript **forces** you to update all usages!

---

## When to Use (and Not Use) Monorepo

### ✅ Use Monorepo When

1. **Multiple related apps** share code (types, utilities, components)
   - Example: Web dashboard + API + Mobile app

2. **Single team** works across multiple projects
   - Makes coordination easier

3. **Atomic changes** needed across projects
   - Change API contract + update all consumers in 1 commit

4. **Type safety** is important
   - Share TypeScript types between frontend/backend

5. **Consistent tooling** across projects
   - Same ESLint, TypeScript, Prettier configs

### ❌ Don't Use Monorepo When

1. **Completely independent projects**
   - E-commerce site + Hospital management system
   - No shared code = no benefit

2. **Different tech stacks**
   - Flutter mobile app + Go backend
   - Can't share much code anyway

3. **Separate teams** with different release cycles
   - Team A deploys 10x/day, Team B deploys 1x/month
   - Monorepo adds unnecessary coupling

4. **Very large scale** (50+ projects)
   - Git operations become slow
   - CI/CD takes too long

5. **Strict access control** needed
   - Some code must be isolated from certain developers
   - Separate repos provide better security

### 🎯 Perfect Use Case: Populatte

Populatte is **ideal** for a monorepo because:

✅ **Three related apps** (Web + API + Extension)
✅ **Heavy code sharing** (User types, Project types, validation schemas)
✅ **Single developer/small team**
✅ **Features span multiple apps** (Excel upload affects all three)
✅ **Type safety is critical** (API responses must match frontend expectations)

---

## Comparison Table

| Aspect | Multi-Repo | Monorepo |
|--------|-----------|----------|
| **Setup** | Simple | Moderate |
| **Code Sharing** | Hard (NPM packages) | Easy (workspaces) |
| **Type Safety** | Manual sync | Automatic |
| **Versioning** | Independent | Coordinated |
| **Dependencies** | Duplicated | Deduplicated |
| **Onboarding** | Clone N repos | Clone 1 repo |
| **Refactoring** | Risky | Safe (TypeScript checks) |
| **CI/CD** | N pipelines | 1 pipeline |
| **Git History** | Separate | Unified |

---

## Further Reading

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Why Google, Meta, and Microsoft use Monorepos](https://monorepo.tools/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

**Ready to implement?** Start with the [Implementation Guide](#implementation-guide) section and follow step-by-step!
