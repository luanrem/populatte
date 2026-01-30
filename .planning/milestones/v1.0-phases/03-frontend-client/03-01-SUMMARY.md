---
phase: 03-frontend-client
plan: 01
subsystem: frontend-api
tags:
  - api-client
  - authentication
  - fetch-wrapper
  - error-handling
  - clerk-integration
  - tanstack-query
requires:
  - 02-01-backend-auth-guard
  - 02-02-backend-user-sync
provides:
  - client-side-fetch-wrapper
  - server-side-fetch-wrapper
  - api-error-types
  - error-classification-utils
  - toast-notifications
affects:
  - 03-02-react-query-hooks
tech-stack:
  added:
    - "@tanstack/react-query@5.90.20"
    - "@tanstack/react-query-devtools@5.91.2"
    - "zod@4.3.6"
    - "sonner@2.0.7 (via shadcn/ui)"
  patterns:
    - "Dual client pattern (CSR/SSR)"
    - "401 retry with token refresh"
    - "Pure function error handlers"
    - "Factory pattern for API clients"
key-files:
  created:
    - apps/web/lib/api/types.ts
    - apps/web/lib/api/error-handler.ts
    - apps/web/lib/api/client.ts
    - apps/web/lib/api/client.server.ts
    - apps/web/components/ui/sonner.tsx
  modified:
    - apps/web/package.json
    - apps/web/.env.local
    - apps/web/.env.example
key-decisions:
  - decision: "Use Clerk's skipCache instead of forceRefresh"
    rationale: "Clerk's GetTokenOptions uses skipCache to force fresh tokens"
    impact: "Token refresh logic uses correct Clerk API"
  - decision: "Separate client-side and server-side fetch wrappers"
    rationale: "Different token acquisition methods (useAuth vs auth), different env vars, different retry strategies"
    impact: "Clean separation of concerns, type-safe for both environments"
  - decision: "No 401 retry on server-side"
    rationale: "Server tokens are always fresh from Clerk per-request"
    impact: "Simpler server implementation, no unnecessary retry logic"
  - decision: "Pure function error handlers (not a class)"
    rationale: "Error classification is stateless, functional approach is simpler"
    impact: "Easier to test, more composable"
duration: 12min 15s
completed: 2026-01-28
---

# Phase 3 Plan 1: API Client Infrastructure Summary

**One-liner:** Dual fetch wrappers (client/server) with automatic Clerk Bearer token injection, 401 retry with skipCache token refresh, and typed error classification utilities.

## Performance

- **Duration:** 12 minutes 15 seconds
- **Started:** 2026-01-28 17:58
- **Completed:** 2026-01-28 18:10
- **Tasks completed:** 2/2
- **Files created:** 5
- **Files modified:** 3

## Accomplishments

### Core Infrastructure Delivered

1. **API Error Types** - Custom `ApiError` class extends Error with HTTP status, statusText, and optional response data. Factory method `fromResponse(response, data)` simplifies error creation.

2. **Error Handler Utilities** - Four pure functions for error classification:
   - `isAuthError(error)` - Detects 401 authentication failures
   - `isSyncError(error)` - Detects 503 sync failures from ClerkAuthGuard
   - `isRetryableError(error)` - Identifies 5xx and network errors for retry
   - `getErrorMessage(error)` - Maps technical errors to user-friendly messages

3. **Client-side Fetch Wrapper** - React hook `useApiClient()` and factory function `createApiClient(getToken)` for browser-based API calls:
   - Automatic Bearer token injection from Clerk's `useAuth()`
   - 401 retry with `skipCache: true` token refresh
   - Throws typed `ApiError` for non-ok responses
   - Uses `NEXT_PUBLIC_API_URL` environment variable

4. **Server-side Fetch Wrapper** - Async factory `createServerApiClient()` for Server Components/Actions:
   - Automatic Bearer token injection from Clerk's `auth()`
   - No retry logic (tokens are fresh per-request)
   - Throws typed `ApiError` for non-ok responses
   - Uses `API_URL` environment variable (server-only)

5. **Dependencies Installed** - Foundation for Phase 3 Plan 2:
   - TanStack Query v5.90.20 for data fetching/caching
   - TanStack Query DevTools v5.91.2 for debugging
   - Zod v4.3.6 for runtime validation
   - Sonner v2.0.7 (via shadcn/ui) for toast notifications

### Environment Configuration

Added API URL configuration to `.env.local` and `.env.example`:
- `NEXT_PUBLIC_API_URL=http://localhost:3001` (client-side)
- `API_URL=http://localhost:3001` (server-side)

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Install dependencies and create API error types | 95af318 | package.json, types.ts, error-handler.ts, .env.local, .env.example, sonner.tsx |
| 2 | Create dual fetch wrappers with token injection and 401 retry | b2a08dc | client.ts, client.server.ts |

## Files Created/Modified

### Created (5 files)

1. **apps/web/lib/api/types.ts** - `ApiError` class and `ApiRequestOptions` interface
2. **apps/web/lib/api/error-handler.ts** - Error classification utilities (isAuthError, isSyncError, isRetryableError, getErrorMessage)
3. **apps/web/lib/api/client.ts** - Client-side fetch wrapper with `useApiClient` hook and `createApiClient` factory
4. **apps/web/lib/api/client.server.ts** - Server-side fetch wrapper with `createServerApiClient` function
5. **apps/web/components/ui/sonner.tsx** - Toast notification component (shadcn/ui)

### Modified (3 files)

1. **apps/web/package.json** - Added @tanstack/react-query, zod, sonner dependencies
2. **apps/web/.env.local** - Added NEXT_PUBLIC_API_URL and API_URL
3. **apps/web/.env.example** - Added NEXT_PUBLIC_API_URL and API_URL

## Decisions Made

### 1. Use Clerk's skipCache instead of forceRefresh

**Context:** Initial implementation attempted to use `forceRefresh: true` for token refresh on 401 errors.

**Decision:** Use Clerk's `skipCache: true` option instead.

**Rationale:** Clerk's `GetTokenOptions` interface uses `skipCache` to bypass the token cache and fetch a fresh token from Clerk's servers. The `forceRefresh` API doesn't exist in Clerk.

**Impact:** Token refresh logic uses the correct Clerk API. Documentation and code comments accurately reflect Clerk's behavior.

### 2. Separate client-side and server-side fetch wrappers

**Context:** Client and server environments have different token acquisition methods and requirements.

**Decision:** Create two separate implementations: `client.ts` with `'use client'` directive and `client.server.ts` without.

**Rationale:**
- Client uses `useAuth()` from `@clerk/nextjs` (React hook), server uses `auth()` from `@clerk/nextjs/server` (async function)
- Client uses `NEXT_PUBLIC_API_URL` (browser-accessible), server uses `API_URL` (server-only)
- Client needs 401 retry (tokens can expire), server doesn't (tokens are fresh per-request)

**Impact:** Clean separation of concerns, type-safe for both environments, no runtime overhead from unused code.

### 3. No 401 retry on server-side

**Context:** Server-side API calls could potentially receive 401 errors.

**Decision:** No retry logic on server-side wrapper.

**Rationale:** Server tokens are fetched fresh from Clerk's `auth()` on every request. If a 401 occurs on the server, it indicates a deeper authentication issue that retry won't solve.

**Impact:** Simpler server implementation, no unnecessary retry logic, faster failure feedback for auth issues.

### 4. Pure function error handlers (not a class)

**Context:** Error handling utilities could be implemented as static methods on a class or as standalone functions.

**Decision:** Implement as pure standalone functions.

**Rationale:** Error classification is stateless - no need for encapsulation or shared state. Functional approach is simpler, more composable, and easier to test.

**Impact:** Cleaner import syntax (`import { isAuthError } from './error-handler'`), easier to tree-shake unused functions, better testability.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm peer dependency conflicts during dependency installation**

- **Found during:** Task 1
- **Issue:** Initial `npm install` commands failed with ERESOLVE peer dependency conflicts between Clerk packages and the monorepo's knip dependency.
- **Fix:** Switched to `pnpm` for package installation (already used by shadcn CLI). Pnpm's stricter dependency resolution handled the conflicts correctly.
- **Files modified:** apps/web/package.json, apps/web/pnpm-lock.yaml
- **Commit:** 95af318 (included in Task 1 commit)
- **Rationale:** Rule 3 (auto-fix blocking issues) - couldn't complete task without installing dependencies.

**2. [Rule 1 - Bug] Incorrect Clerk token refresh API usage**

- **Found during:** Task 2 (TypeScript type checking)
- **Issue:** Initial implementation used `getToken({ forceRefresh: true })` for token refresh, but Clerk's `GetTokenOptions` doesn't have a `forceRefresh` property. This caused TypeScript compilation errors.
- **Fix:** Updated to use `getToken({ skipCache: true })` which is the correct Clerk API for forcing a fresh token.
- **Files modified:** apps/web/lib/api/client.ts
- **Commit:** b2a08dc (included in Task 2 commit)
- **Rationale:** Rule 1 (auto-fix bugs) - code didn't work with Clerk's actual API, TypeScript compiler blocked the error.

## Issues Encountered

### Dependency Installation Challenges

**Issue:** npm install failed with peer dependency resolution conflicts.

**Root cause:** The monorepo uses knip as a dev dependency, which has strict peer dependencies. npm's default resolution strategy couldn't resolve the conflict between Clerk's transitive dependencies and knip.

**Resolution:** Switched to pnpm which handles peer dependency resolution more gracefully. Pnpm was already available (used by shadcn CLI) and successfully installed all dependencies.

**Lesson learned:** For monorepos with complex dependency trees, pnpm's stricter resolution can prevent phantom dependency issues.

### Clerk API Documentation Gap

**Issue:** Plan specified using `getToken({ forceRefresh: true })` but this API doesn't exist in Clerk.

**Root cause:** Clerk's actual API uses `skipCache: true` to force fresh tokens, not `forceRefresh`.

**Resolution:** Examined Clerk's TypeScript type definitions to find the correct `GetTokenOptions` interface. Updated implementation to use `skipCache: true`.

**Lesson learned:** When working with third-party SDKs, verify API surface via TypeScript types rather than relying solely on documentation or assumptions.

## Next Phase Readiness

### What's Ready

- ✅ Fetch wrappers are production-ready and type-safe
- ✅ Error classification utilities handle all expected backend error types (401, 403, 404, 503, 5xx)
- ✅ TanStack Query dependencies installed for Plan 03-02
- ✅ Toast notification component (Sonner) ready for error UX
- ✅ Environment variables configured for local development
- ✅ Zero TypeScript errors, no `any` types used

### Phase 3 Plan 2 Dependencies Met

All prerequisites for building TanStack Query hooks are in place:

1. **Fetch wrappers** - Plan 2 will wrap these with `useQuery` and `useMutation`
2. **Error types** - Plan 2's error boundaries can classify errors using our utilities
3. **TanStack Query** - Installed and ready to use
4. **Zod** - Ready for response validation schemas
5. **Sonner** - Ready for toast notifications on errors

### No Blockers

No issues or concerns affecting Phase 3 Plan 2 execution.
