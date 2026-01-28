# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
populatte/
├── apps/
│   ├── api/                      # NestJS backend application
│   │   ├── src/
│   │   │   ├── core/             # Domain logic (entities, repositories, use cases)
│   │   │   ├── infrastructure/   # External concerns (database, auth, config)
│   │   │   ├── presentation/     # HTTP layer (controllers, DTOs)
│   │   │   ├── main.ts           # Application entry point
│   │   │   ├── app.module.ts     # Root module
│   │   │   ├── app.controller.ts # Health check endpoint
│   │   │   └── app.service.ts    # Root service
│   │   ├── test/                 # E2E test configuration
│   │   ├── dist/                 # Build output (compiled JavaScript)
│   │   ├── package.json          # Dependencies and scripts
│   │   ├── tsconfig.json         # TypeScript configuration
│   │   └── eslint.config.mjs     # ESLint rules
│   │
│   └── web/                      # Next.js dashboard application
│       ├── app/
│       │   ├── (platform)/       # Grouped authenticated routes
│       │   │   ├── dashboard/
│       │   │   ├── projects/
│       │   │   ├── mappings/
│       │   │   ├── team/
│       │   │   ├── billing/
│       │   │   └── onboarding/
│       │   ├── sign-in/          # Clerk sign-in page
│       │   ├── sign-up/          # Clerk sign-up page
│       │   ├── colors/           # Theme testing page
│       │   ├── layout.tsx        # Root layout
│       │   ├── page.tsx          # Landing page
│       │   └── globals.css       # Global styles
│       ├── components/           # Reusable React components
│       │   ├── layout/           # Layout components (header, sidebar)
│       │   ├── theme/            # Theme provider and toggle
│       │   ├── ui/               # shadcn/ui components (auto-generated)
│       │   └── page-placeholder.tsx
│       ├── hooks/                # Custom React hooks
│       ├── lib/                  # Utilities and helpers
│       ├── images/               # Static image assets
│       ├── public/               # Static public assets
│       ├── middleware.ts         # Next.js middleware (Clerk auth)
│       ├── package.json          # Dependencies and scripts
│       ├── tsconfig.json         # TypeScript configuration
│       ├── next.config.ts        # Next.js configuration
│       └── eslint.config.mjs     # ESLint rules
│
├── packages/                     # Shared packages (currently empty)
│   └── (Reserved for future shared code)
│
├── docs/                         # Documentation
├── .planning/
│   └── codebase/                 # This analysis directory
├── CLAUDE.md                     # AI assistant guidance
├── IDEA.md                       # Product vision
├── README.md                     # Project overview
└── package.json                  # Root workspace configuration
```

## Directory Purposes

**`apps/api/src/core/`:**
- Purpose: Domain business logic independent of frameworks
- Contains: Entity interfaces, repository abstractions, use case classes
- Key files:
  - `entities/user.entity.ts`: User domain model (id, clerkId, email, etc.)
  - `repositories/user.repository.ts`: Abstract repository interface
  - `use-cases/user/sync-user.use-case.ts`: Creates/updates user from Clerk webhook
  - `use-cases/user/delete-user.use-case.ts`: Deletes user by clerkId

**`apps/api/src/infrastructure/`:**
- Purpose: Implement technical details and external integrations
- Contains: Database setup, authentication, configuration
- Key directories:
  - `auth/`: Clerk authentication service and guards
  - `config/`: Environment variable configuration (database, clerk)
  - `database/drizzle/`: Drizzle ORM setup, schema, repositories, mappers
- Key files:
  - `database/drizzle/drizzle.service.ts`: Manages database connection pool
  - `database/drizzle/repositories/drizzle-user.repository.ts`: Implements UserRepository
  - `database/drizzle/schema/users.schema.ts`: Database table definition
  - `auth/clerk.service.ts`: Verifies Clerk tokens and webhooks

**`apps/api/src/presentation/`:**
- Purpose: HTTP request handling and response formatting
- Contains: Controllers, DTOs, decorators
- Key files:
  - `controllers/webhook.controller.ts`: Receives and processes Clerk webhooks
  - `controllers/user.controller.ts`: User endpoints (likely future)
  - `dto/clerk-webhook.dto.ts`: Clerk webhook event types

**`apps/web/app/`:**
- Purpose: Next.js App Router pages and layouts
- Uses: File-based routing where file structure = URL structure
- Organization:
  - `layout.tsx`: Root layout with Clerk, theme, sidebar providers
  - `page.tsx`: Landing page (/)
  - `(platform)/`: Grouped routes for authenticated user area
  - `sign-in/`, `sign-up/`: Clerk authentication pages
  - Each `page.tsx` file in nested directories = route path

**`apps/web/components/`:**
- Purpose: Reusable React components
- Organization by responsibility:
  - `layout/`: Layout structure components (AppHeader, AppSidebar)
  - `theme/`: Theme management (ThemeProvider, ModeToggle)
  - `ui/`: shadcn/ui library components (Button, Dialog, Card, etc.) - auto-generated, do not modify
  - Root level: Standalone reusable components (PagePlaceholder)

**`apps/web/middleware.ts`:**
- Purpose: Route protection and request preprocessing
- Functionality:
  - Uses ClerkMiddleware to enforce authentication
  - Defines protected routes (anything under /dashboard, /projects, /mappings, /team, /billing, /onboarding)
  - Redirects unauthenticated users to /sign-in
  - Allows public routes (/, /sign-in, /sign-up, /colors)

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Creates NestJS app, enables CORS, listens on port 3001
- `apps/web/app/layout.tsx`: Root layout wraps entire app with providers
- `apps/web/app/page.tsx`: Landing page (marketing, sign-up buttons)

**Configuration:**
- `apps/api/src/infrastructure/config/database.config.ts`: Database connection settings
- `apps/api/src/infrastructure/config/clerk.config.ts`: Clerk secret for webhook verification
- `apps/web/middleware.ts`: Protected/public route definitions
- `apps/web/next.config.ts`: Next.js configuration (image remotePatterns)

**Core Logic:**
- `apps/api/src/core/entities/user.entity.ts`: User domain model
- `apps/api/src/core/repositories/user.repository.ts`: Repository interface
- `apps/api/src/core/use-cases/user/sync-user.use-case.ts`: Business logic for syncing users

**Database Layer:**
- `apps/api/src/infrastructure/database/drizzle/drizzle.service.ts`: Database connection management
- `apps/api/src/infrastructure/database/drizzle/schema/users.schema.ts`: PostgreSQL table definition
- `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-user.repository.ts`: Implementation

**Authentication:**
- `apps/api/src/infrastructure/auth/clerk.service.ts`: Clerk SDK integration
- `apps/api/src/infrastructure/auth/guards/clerk-auth.guard.ts`: NestJS route guard
- `apps/web/middleware.ts`: Next.js auth middleware
- `apps/web/app/layout.tsx`: ClerkProvider wrapper

**Testing:**
- `apps/api/test/jest-e2e.json`: E2E test configuration
- `apps/api/src/app.controller.spec.ts`: Example test file

## Naming Conventions

**Files:**
- Controllers: `*.controller.ts` (e.g., `user.controller.ts`, `webhook.controller.ts`)
- Services: `*.service.ts` (e.g., `clerk.service.ts`, `drizzle.service.ts`)
- Use cases: `*.use-case.ts` (e.g., `sync-user.use-case.ts`, `delete-user.use-case.ts`)
- Repositories: `*.repository.ts` (e.g., `user.repository.ts`, `drizzle-user.repository.ts`)
- Mappers: `*.mapper.ts` (e.g., `user.mapper.ts`)
- Guards: `*.guard.ts` (e.g., `clerk-auth.guard.ts`)
- DTOs: `*.dto.ts` (e.g., `clerk-webhook.dto.ts`)
- Schemas: `*.schema.ts` (e.g., `users.schema.ts`)
- Config: `*.config.ts` (e.g., `database.config.ts`, `clerk.config.ts`)
- Modules: `*.module.ts` (e.g., `app.module.ts`, `auth.module.ts`)
- Tests: `*.spec.ts` or `*.test.ts` (e.g., `app.controller.spec.ts`)

**Directories:**
- Features: lowercase plural (e.g., `users`, `projects`, `mappings`)
- Technical layers: lowercase (e.g., `core`, `infrastructure`, `presentation`)
- Components: lowercase with hyphens for multi-word (e.g., `app-header`, `app-sidebar`)
- Utilities: `lib`, `utils`, `helpers`

**TypeScript/React:**
- Classes: PascalCase (e.g., `UserRepository`, `SyncUserUseCase`, `ClerkService`)
- Interfaces: PascalCase without `I` prefix (e.g., `User`, `CreateUserData`, `AuthenticatedRequest`)
- Functions/Methods: camelCase (e.g., `findById`, `verifySessionToken`, `execute`)
- Constants: UPPER_SNAKE_CASE
- React Components: PascalCase (e.g., `AppHeader`, `PagePlaceholder`, `ModeToggle`)

## Where to Add New Code

**New API Use Case:**
- Primary code: `apps/api/src/core/use-cases/[domain]/[operation].use-case.ts`
- Interface definition: `apps/api/src/core/use-cases/[domain]/[operation].use-case.ts` (inline interface)
- Repository interface: Add method to `apps/api/src/core/repositories/[domain].repository.ts`
- Implementation: `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-[domain].repository.ts`
- Controller endpoint: Add route to `apps/api/src/presentation/controllers/[domain].controller.ts`
- Tests: `apps/api/src/core/use-cases/[domain]/[operation].use-case.spec.ts`

**New Web Page:**
- Public page: `apps/web/app/[name]/page.tsx`
- Protected page: `apps/web/app/(platform)/[name]/page.tsx`
- Layout (if needed): Create `layout.tsx` in same directory
- Components: Create in `apps/web/components/[domain]/[component].tsx`
- Hooks: `apps/web/hooks/use-[feature].ts`
- Utilities: `apps/web/lib/[utility-name].ts`

**New Component:**
- Layout components: `apps/web/components/layout/[component-name].tsx`
- Theme-related: `apps/web/components/theme/[component-name].tsx`
- Page-specific: `apps/web/components/[page-name]/[component-name].tsx`
- Shared utilities: `apps/web/components/[component-name].tsx` (in root)

**API Database Changes:**
- Table schema: `apps/api/src/infrastructure/database/drizzle/schema/[table-name].schema.ts`
- Mapper: `apps/api/src/infrastructure/database/drizzle/mappers/[domain].mapper.ts`
- Repository method: Add to interface in `apps/api/src/core/repositories/[domain].repository.ts`
- Implementation: Add to `apps/api/src/infrastructure/database/drizzle/repositories/drizzle-[domain].repository.ts`

**Utilities/Helpers:**
- Shared utilities: `apps/web/lib/[utility-name].ts`
- Custom hooks: `apps/web/hooks/use-[hook-name].ts`
- API utilities: `apps/api/src/infrastructure/[service]/[utility-name].ts`

## Special Directories

**`apps/api/dist/`:**
- Purpose: Build output (compiled TypeScript to JavaScript)
- Generated: Yes
- Committed: No (.gitignored)
- Rebuild: Run `npm run build` from api directory

**`apps/web/.next/`:**
- Purpose: Next.js build cache and server-side files
- Generated: Yes
- Committed: No (.gitignored)
- Rebuild: Automatic on dev server restart

**`apps/api/src/infrastructure/database/drizzle/schema/`:**
- Purpose: Drizzle ORM schema definitions (source of truth for database)
- Contents: Table definitions using drizzle-orm API
- Key pattern: Define tables using `pgTable()`, export types with `$inferSelect` and `$inferInsert`

**`apps/web/components/ui/`:**
- Purpose: **EXCLUSIVELY for shadcn/ui components** (auto-generated)
- Rules:
  - Do NOT create custom components here
  - Do NOT manually edit these files
  - Add components: `cd apps/web && pnpm dlx shadcn@latest add [component-name]`
  - Use in other components: `import { Button } from "@/components/ui/button"`

---

*Structure analysis: 2026-01-28*
