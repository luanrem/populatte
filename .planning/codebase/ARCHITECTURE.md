# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Monorepo (Turborepo + NPM Workspaces) with three applications following domain-driven design principles. The API uses Clean Architecture (Core/Infrastructure/Presentation separation), while the web application follows Next.js App Router patterns with component-based composition.

**Key Characteristics:**
- Strict separation of concerns across three architectural tiers (Core, Infrastructure, Presentation)
- Dependency inversion through abstract repository interfaces
- Configuration management via NestJS ConfigModule with environment-based loading
- Client-side state management via React hooks with Clerk authentication
- Webhook-based user synchronization between Clerk and internal database

## Layers

**Core Layer (Domain Logic):**
- Purpose: Contains business logic and domain entities independent of external concerns
- Location: `apps/api/src/core/`
- Contains: Entity interfaces, repository abstractions, use case implementations
- Depends on: Nothing (pure domain logic)
- Used by: Infrastructure layer (for implementation), Presentation layer (for orchestration)

**Infrastructure Layer (External Concerns):**
- Purpose: Implements technical details like database access, authentication, configuration
- Location: `apps/api/src/infrastructure/`
- Contains: Database service (Drizzle ORM), auth guards, repository implementations, config loading
- Depends on: Core layer (implements abstract interfaces), External libraries (drizzle-orm, pg, @clerk/backend)
- Used by: App module for dependency injection

**Presentation Layer (HTTP/API):**
- Purpose: Handles incoming HTTP requests, webhook verification, response formatting
- Location: `apps/api/src/presentation/`
- Contains: Controllers (WebhookController, UserController), DTOs (data transfer objects)
- Depends on: Core layer (uses entities and use cases)
- Used by: NestJS routing system

**Frontend Layer (Web Dashboard):**
- Purpose: Next.js App Router based UI for user interaction and data management
- Location: `apps/web/`
- Contains: App Router pages, React components (layout, theme, ui), hooks, middleware
- Depends on: Clerk authentication, Next.js framework, shadcn/ui components
- Used by: Browser clients

## Data Flow

**User Creation/Update (Clerk Webhook Flow):**

1. User creates/updates account in Clerk
2. Clerk sends webhook to `POST /webhooks/clerk` endpoint
3. WebhookController receives event with svix signature headers
4. ClerkService verifies webhook signature using Svix secret
5. SyncUserUseCase executes with user data from webhook payload
6. DrizzleUserRepository checks if user exists by clerkId
7. If exists: update via `update(clerkId, data)` method
8. If not exists: create via `create(data)` method
9. UserMapper converts database row to domain entity
10. Response returns success status

**Deletion Flow:**

1. User deletes account in Clerk
2. Webhook event triggers webhook controller
3. DeleteUserUseCase executes with clerkId
4. DrizzleUserRepository deletes record by clerkId
5. Confirmation returned

**Web Dashboard Authentication Flow:**

1. User accesses Next.js app
2. ClerkMiddleware validates protected routes (`/dashboard.*`, `/projects.*`, etc)
3. If accessing protected route: `auth.protect()` redirects to `/sign-in` if not authenticated
4. Public routes (`/`, `/sign-in`, `/sign-up`) bypass authentication
5. Authenticated user sees SidebarProvider with AppSidebar and content
6. Theme context provides light/dark mode toggling

**State Management:**

- User authentication: Managed by Clerk (token stored in session/cookies)
- UI theme: Managed by next-themes context provider
- Sidebar state: Managed by SidebarProvider component
- Component-level state: React hooks (useState, useContext)

## Key Abstractions

**Repository Pattern (Core Abstraction):**
- Purpose: Abstract database operations from business logic
- Examples: `UserRepository` abstract class in `apps/api/src/core/repositories/user.repository.ts`
- Pattern: Abstract class with public methods (findById, findByClerkId, create, update, delete)
- Implementation: `DrizzleUserRepository` extends abstract repository, uses Drizzle ORM

**Use Case Pattern:**
- Purpose: Encapsulate specific business operations
- Examples: `SyncUserUseCase`, `DeleteUserUseCase` in `apps/api/src/core/use-cases/user/`
- Pattern: @Injectable() class with single execute() method taking input interface
- Responsibility: Orchestrate repository calls, handle business logic, return domain entity

**Entity Types:**
- Purpose: Represent domain objects with strong typing
- Examples: `User` interface in `apps/api/src/core/entities/user.entity.ts`
- Pattern: TypeScript interfaces (not classes) with properties and optional fields
- Separation: `CreateUserData`, `UpdateUserData` interfaces for operation-specific inputs

**Mapper Pattern:**
- Purpose: Convert between database rows and domain entities
- Examples: `UserMapper` in `apps/api/src/infrastructure/database/drizzle/mappers/user.mapper.ts`
- Method: `toDomain(row: UserRow): User` converts database rows to entities

**Guard Pattern (HTTP Guards):**
- Purpose: Protect routes with authentication logic
- Examples: `ClerkAuthGuard` in `apps/api/src/infrastructure/auth/guards/clerk-auth.guard.ts`
- Pattern: Implements NestJS `CanActivate` interface, validates Bearer token

## Entry Points

**API Application:**
- Location: `apps/api/src/main.ts`
- Triggers: Server startup (npm run start:dev)
- Responsibilities:
  - Create NestJS application instance with rawBody enabled (for webhook signature verification)
  - Enable CORS with whitelisted origins (localhost:3000, localhost:3001, WEB_URL env var)
  - Listen on port from env or default 3001

**Web Application:**
- Location: `apps/web/app/layout.tsx` (Root layout)
- Triggers: Browser navigation
- Responsibilities:
  - Wrap app with ClerkProvider for authentication
  - Wrap with ThemeProvider for dark/light mode
  - Conditionally render SidebarProvider + AppSidebar for authenticated users
  - Manage fonts (Geist Sans/Mono) and global styles

**Landing Page:**
- Location: `apps/web/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities:
  - Show marketing content with feature highlights
  - Display auth buttons (Sign Up/Sign In) for unauthenticated users
  - Show link to `/dashboard` for authenticated users

**Protected Routes:**
- Location: `apps/web/app/(platform)/` (grouped routes)
- Contains: `/dashboard`, `/projects`, `/mappings`, `/team`, `/billing`, `/onboarding`
- Triggers: Authenticated user navigation
- Responsibilities: Render page placeholders (PagePlaceholder component)

## Error Handling

**Strategy:** Explicit error handling with typed exceptions and logging at boundaries

**Patterns:**

- **Controller-level validation:** BadRequestException for missing headers/bodies in webhook controller
- **Authentication guards:** UnauthorizedException for missing/invalid tokens
- **Database operations:** Error thrown if expected rows not found (e.g., "User not found: {clerkId}")
- **Webhook verification:** BadRequestException if Svix signature verification fails
- **Logging:** Logger instance in WebhookController tracks:
  - Successful event processing: "User synced: {clerkId}"
  - Unhandled event types: "Unhandled webhook event type: {type}"
  - Processing errors: Logs error object and event type
- **Graceful degradation:** Webhook returns 200 success after logging errors (prevents Clerk retries)

## Cross-Cutting Concerns

**Logging:**
- Framework: NestJS Logger class
- Usage: WebhookController logs webhook events, signature verification, and errors
- Approach: inject Logger in constructor, call logger.log/warn/error for different levels

**Validation:**
- Route-level: Decorator validation via HTTP parameter decorators (@Headers, @Req)
- Schema-level: Not yet implemented (future: Zod schemas in presentation/dto)
- Type-level: TypeScript strict mode enforces compile-time type safety

**Authentication:**
- Provider: Clerk (external auth service)
- Web: ClerkMiddleware guards protected routes, ClerkProvider wraps React tree
- API: ClerkAuthGuard validates Bearer tokens from Authorization header
- Webhook: Svix signature verification for Clerk webhooks
- Token validation: ClerkService.verifySessionToken() decodes and validates JWT

**CORS:**
- Enabled globally in main.ts
- Whitelisted origins: localhost:3000, localhost:3001, process.env.WEB_URL
- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization
- Credentials: Enabled for cookie-based auth

---

*Architecture analysis: 2026-01-28*
