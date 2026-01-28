# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.7+ - Used across all applications and packages for type safety and compile-time checking

**Secondary:**
- JavaScript - Supporting files (config, build scripts)

## Runtime

**Environment:**
- Node.js >= 22.0.0 - Required by all applications (see README.md)

**Package Manager:**
- pnpm >= 9.0.0 - Monorepo package manager for workspace dependency management
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Backend:**
- NestJS 11.0.1 - Web framework for `apps/api`
  - `@nestjs/common` - Core decorators and utilities
  - `@nestjs/core` - NestJS runtime
  - `@nestjs/config` - Configuration management with validation
  - `@nestjs/platform-express` - Express adapter for HTTP
  - `@nestjs/testing` - Testing utilities

**Frontend:**
- Next.js 16.0.5 - React framework for `apps/web` (App Router)
  - `@tailwindcss/postcss` ^4 - CSS framework integration
  - `react` 19.2.0 - UI library
  - `react-dom` 19.2.0 - React DOM rendering
  - `next-themes` ^0.4.6 - Light/dark mode support

**UI Components:**
- shadcn/ui - Component library built on Radix UI primitives
  - `@radix-ui/react-dialog` ^1.1.15 - Dialog components
  - `@radix-ui/react-dropdown-menu` ^2.1.16 - Dropdown menu
  - `@radix-ui/react-separator` ^1.1.8 - Visual separator
  - `@radix-ui/react-slot` ^1.2.4 - Slot utility
  - `@radix-ui/react-tooltip` ^1.2.8 - Tooltip

**Testing:**
- Jest 30.0.0 - Test runner for `apps/api`
  - `@nestjs/testing` ^11.0.1 - NestJS testing utilities
  - `ts-jest` ^29.2.5 - Jest transformer for TypeScript
  - `supertest` ^7.0.0 - HTTP assertion library
- ESLint 9.18.0 - Code quality with `typescript-eslint`
- Prettier 3.4.2 - Code formatter

**Build/Dev Tools:**
- Drizzle ORM 0.45.1 - Database ORM for PostgreSQL schema management
- Drizzle Kit 0.31.8 - Migration and schema generation CLI
- ts-loader 9.5.2 - TypeScript loader for webpack
- ts-node 10.9.2 - Execute TypeScript directly
- ts-jest 29.2.5 - Jest TypeScript integration
- tsconfig-paths 4.2.0 - TypeScript path resolution for monorepo

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework for `apps/web`
- class-variance-authority 0.7.1 - Type-safe CSS class composition
- clsx 2.1.1 - Dynamic class name builder
- tailwind-merge 3.4.0 - Tailwind class conflict resolution
- lucide-react 0.555.0 - Icon library

## Key Dependencies

**Critical Infrastructure:**
- `pg` 8.17.1 - PostgreSQL driver for Drizzle ORM and connection pooling
- `drizzle-orm` 0.45.1 - Type-safe ORM for PostgreSQL queries and migrations

**Authentication & Identity:**
- `@clerk/backend` 2.29.3 - Clerk backend SDK for JWT token verification and user management
- `@clerk/nextjs` 6.35.5 - Clerk integration for Next.js (middleware, hooks, components)

**Webhooks & Events:**
- `svix` 1.84.1 - Webhook framework for receiving and verifying Clerk webhooks via Svix

**Runtime Utilities:**
- `reflect-metadata` 0.2.2 - Metadata reflection for NestJS decorators
- `rxjs` 7.8.1 - Reactive programming library used by NestJS

**Build Configuration:**
- `@nestjs/cli` 11.0.0 - NestJS build and development CLI
- `@nestjs/schematics` 11.0.0 - Code generation templates

## Configuration

**Environment Variables (Required):**

**API (`apps/api`):**
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string (used by Drizzle Kit and Drizzle ORM)
- `CLERK_SECRET_KEY` - Clerk backend secret for token verification
- `CLERK_PUBLISHABLE_KEY` - Clerk public key for configuration
- `CLERK_WEBHOOK_SIGNING_SECRET` - Svix webhook signing secret from Clerk
- `SUPABASE_URL` - Supabase project URL (currently mapped to database config but may be deprecated)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Web (`apps/web`):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key (exposed to browser)
- `CLERK_SECRET_KEY` - Clerk backend secret for middleware
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Route for sign-in page (default: /sign-in)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Route for sign-up page (default: /sign-up)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` - Redirect after sign-in (default: /dashboard)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` - Redirect after sign-up (default: /dashboard)

**Build Artifacts:**
- `apps/api/dist/` - Compiled NestJS application
- `apps/api/drizzle/` - Generated migrations and snapshots
- `apps/web/.next/` - Next.js build output
- `node_modules/` - Installed dependencies

## Platform Requirements

**Development:**
- Node.js >= 22.0.0
- pnpm >= 9.0.0
- PostgreSQL database (for Drizzle ORM migrations and local development)

**Production:**
- Node.js >= 22.0.0
- PostgreSQL database
- Clerk application for authentication (https://clerk.com)
- Supabase project for database hosting (or alternative PostgreSQL provider)

**Database:**
- PostgreSQL dialect specified in `apps/api/drizzle.config.ts`
- Connection pooling via `pg` driver with configurable pool size (default: 10, max 30 seconds idle timeout, 10 seconds connection timeout)
- Drizzle ORM with schema defined in `apps/api/src/infrastructure/database/drizzle/schema/`

---

*Stack analysis: 2026-01-28*
