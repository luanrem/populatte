# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**Authentication & User Management:**
- **Clerk** - Complete authentication and user management platform
  - SDK: `@clerk/backend` (2.29.3) in API, `@clerk/nextjs` (6.35.5) in Web
  - Auth Method: JWT tokens via Bearer header, verified using `verifyToken()` from `@clerk/backend`
  - Public Key: `CLERK_PUBLISHABLE_KEY` (exposed to browser as `NEXT_PUBLIC_` var)
  - Secret Key: `CLERK_SECRET_KEY` (backend only)
  - Webhook: Clerk events delivered via Svix to `POST /webhooks/clerk`
    - Webhook Secret: `CLERK_WEBHOOK_SIGNING_SECRET` (for Svix signature verification)
    - Implementation: `apps/api/src/presentation/controllers/webhook.controller.ts`

**Webhook Delivery:**
- **Svix** - Webhook delivery and verification service (integrated with Clerk)
  - SDK: `svix` (1.84.1)
  - Purpose: Verify webhook signatures from Clerk events
  - Implementation: `apps/api/src/presentation/controllers/webhook.controller.ts` (line 12, 47-56)
  - Event Types Handled:
    - `user.created` - Sync new user to database
    - `user.updated` - Update user information
    - `user.deleted` - Delete user from database

## Data Storage

**Databases:**
- **PostgreSQL** (via Supabase or direct connection)
  - Connection: `DATABASE_URL` environment variable (required for Drizzle migrations and runtime)
  - Client: `pg` driver (8.17.1) with connection pooling
  - ORM: Drizzle ORM (0.45.1) with type-safe queries
  - Schema Location: `apps/api/src/infrastructure/database/drizzle/schema/`
  - Schema Files:
    - `apps/api/src/infrastructure/database/drizzle/schema/users.schema.ts` - User entity definition
    - `apps/api/src/infrastructure/database/drizzle/schema/index.ts` - Schema barrel export
  - Migrations: Auto-generated in `apps/api/drizzle/` directory by Drizzle Kit
  - Connection Management: `apps/api/src/infrastructure/database/drizzle/drizzle.service.ts`
    - Pool Size: Configurable via `DATABASE_POOL_SIZE` (default: 10)
    - Idle Timeout: 30 seconds
    - Connection Timeout: 10 seconds

**Supabase Integration:**
- **Supabase** - Managed PostgreSQL hosting and services
  - Project URL: `SUPABASE_URL` environment variable
  - Service Role Key: `SUPABASE_SERVICE_ROLE_KEY` environment variable
  - Current Usage: Database provider for PostgreSQL
  - Note: Supabase URL configuration present in `apps/api/src/infrastructure/config/database.config.ts` but implementation uses direct PostgreSQL driver

**File Storage:**
- Not currently integrated
- Future: Excel file uploads will require S3, GCS, or Supabase Storage

**Caching:**
- None currently integrated
- Future: Redis or in-memory caching may be added for performance optimization

## Authentication & Identity

**Auth Provider:**
- **Clerk** - Complete authentication platform
  - Implementation Files:
    - `apps/api/src/infrastructure/auth/clerk.service.ts` - Token verification and config management
    - `apps/api/src/infrastructure/auth/auth.module.ts` - NestJS module setup
    - `apps/api/src/infrastructure/auth/guards/clerk-auth.guard.ts` - Request authentication guard
    - `apps/web/middleware.ts` - Next.js middleware for session management
  - Token Verification: `verifyToken()` from `@clerk/backend` (apps/api/src/infrastructure/auth/clerk.service.ts, line 30-32)
  - JWT Claims Extracted:
    - `sub` - User ID (required)
    - `email` - Email address (optional)
    - `firstName` - First name (optional)
    - `lastName` - Last name (optional)
    - `imageUrl` - Profile image URL (optional)
  - Webhook Sync: User data synced from Clerk webhooks to local PostgreSQL database

**Session Management:**
- **Next.js Middleware** - Clerk session validation in web app
  - Middleware: `apps/web/middleware.ts`
  - Strategy: Request-level authentication via Clerk middleware

## Monitoring & Observability

**Error Tracking:**
- Not currently integrated
- Logging framework: NestJS Logger (console-based)

**Logs:**
- NestJS Logger instances in infrastructure and services
  - Example: `apps/api/src/presentation/controllers/webhook.controller.ts` uses `Logger` from `@nestjs/common`
  - Log Levels: error, warn, log (info)

**API Documentation:**
- Not currently implemented
- Future: Swagger/OpenAPI integration recommended for API documentation

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase configuration
- Development: Local Node.js development environment
- Production: Target environment not yet configured in codebase

**CI Pipeline:**
- Not currently configured
- No GitHub Actions, GitLab CI, or other CI/CD files present

**Build Commands:**
- `npm run build` - Build all workspaces (Turborepo)
- `npm run dev` - Run all apps in development mode
- `npm run lint` - Lint all workspaces
- `npm run type-check` - Type check all workspaces

## Environment Configuration

**Required Environment Variables:**

**API Service (apps/api):**
- `PORT` - Application port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database?options`
  - Required for: Drizzle Kit CLI commands, Drizzle ORM at runtime
- `CLERK_SECRET_KEY` - Clerk backend secret (from Clerk dashboard)
- `CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_WEBHOOK_SIGNING_SECRET` - Svix webhook signing secret (from Clerk webhook settings)
- `SUPABASE_URL` - Supabase project URL (currently unused but configured)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (currently unused but configured)
- `DATABASE_POOL_SIZE` - PostgreSQL connection pool size (default: 10)

**Web Service (apps/web):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key (exposed to browser)
- `CLERK_SECRET_KEY` - Clerk secret for middleware
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Sign-in route (default: /sign-in)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Sign-up route (default: /sign-up)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` - Post-sign-in redirect (default: /dashboard)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` - Post-sign-up redirect (default: /dashboard)

**Secrets Location:**
- Development: `.env.example` files provide template structure
  - `apps/api/.env.example` - API environment template
  - `apps/web/.env.example` - Web environment template
- Runtime: Environment variables set via:
  - `.env` files (local development)
  - `.env.local` files (local overrides, not committed)
  - System environment variables (production)
  - CI/CD secrets (deployment pipelines when configured)

## Webhooks & Callbacks

**Incoming Webhooks:**
- **Clerk User Events** - Delivered via Svix
  - Endpoint: `POST /webhooks/clerk` (apps/api/src/presentation/controllers/webhook.controller.ts)
  - Signature Verification: Svix-provided headers (svix-id, svix-timestamp, svix-signature)
  - Events Processed:
    - `user.created` - New user sign-up, syncs to PostgreSQL
    - `user.updated` - User profile changes, updates PostgreSQL
    - `user.deleted` - User deletion, removes from PostgreSQL
  - Sync Logic: `apps/api/src/core/use-cases/user/` (SyncUserUseCase, DeleteUserUseCase)

**Outgoing Webhooks:**
- Not currently implemented
- Future: Project notifications, form population events may require outgoing webhooks

**API Endpoints:**
- `GET /` - Health check (apps/api/src/app.controller.ts)
- `POST /webhooks/clerk` - Clerk webhook receiver
- `GET /users/me` - Get current authenticated user (apps/api/src/presentation/controllers/user.controller.ts)
- CORS enabled for: `http://localhost:3000`, `http://localhost:3001`, `process.env.WEB_URL`

## Third-Party Service Integrations Summary

| Service | Type | Purpose | SDK | Status |
|---------|------|---------|-----|--------|
| Clerk | Auth | User authentication & management | @clerk/backend, @clerk/nextjs | Active |
| Svix | Webhooks | Webhook signature verification | svix | Active |
| PostgreSQL | Database | User and project data storage | pg driver + Drizzle ORM | Active |
| Supabase | Database | Managed PostgreSQL hosting | None (direct pg driver) | Configured, partially used |

---

*Integration audit: 2026-01-28*
