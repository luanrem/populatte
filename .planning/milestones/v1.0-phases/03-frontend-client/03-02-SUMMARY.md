---
phase: 03
plan: 02
subsystem: frontend-client
tags: [zod, validation, tanstack-query, error-handling, ux, toasts]
requires: [03-01]
provides: [runtime-validation, data-hooks, error-ux]
affects: [future-features]
tech-stack:
  added: []
  patterns: [zod-validation, query-hooks, error-boundaries]
key-files:
  created:
    - apps/web/lib/api/schemas/user.schema.ts
    - apps/web/lib/api/endpoints/users.ts
    - apps/web/lib/query/client.ts
    - apps/web/lib/query/provider.tsx
    - apps/web/lib/query/hooks/use-me.ts
    - apps/web/components/error/error-toast.tsx
    - apps/web/components/error/global-loading.tsx
    - apps/web/app/error.tsx
    - apps/web/app/not-found.tsx
    - apps/web/app/unauthorized/page.tsx
  modified:
    - apps/web/app/layout.tsx
key-decisions:
  - decision: "Zod safeParse for runtime validation"
    rationale: "Throws on schema mismatch to catch API contract violations early"
    phase: "03"
    plan: "02"
    alternatives: ["parse() with try/catch", "TypeScript-only validation"]
  - decision: "Factory pattern for endpoint functions"
    rationale: "createUserEndpoints(fetchFn) allows composition with both hook and non-hook clients"
    phase: "03"
    plan: "02"
    alternatives: ["Direct hook dependency", "Separate implementations"]
  - decision: "Smart retry in QueryClient"
    rationale: "No retry on 4xx (client errors), exponential backoff for 5xx/network"
    phase: "03"
    plan: "02"
    alternatives: ["Uniform retry", "No retry", "Per-endpoint configuration"]
  - decision: "useState for stable QueryClient"
    rationale: "Prevents cache loss on re-render (critical for QueryProvider)"
    phase: "03"
    plan: "02"
    alternatives: ["useMemo", "Global singleton"]
  - decision: "richColors prop on Toaster"
    rationale: "Better visual distinction for error/success/warning states"
    phase: "03"
    plan: "02"
    alternatives: ["Default colors", "Custom theme"]
metrics:
  duration: "3min 11s"
  started: "2026-01-28T20:16:28Z"
  completed: "2026-01-28T20:19:42Z"
---

# Phase 3 Plan 2: Runtime Validation & Error UX Summary

**One-liner:** Zod-validated API responses, TanStack Query data layer with smart retry, toast notifications, error boundaries, and custom 404/403 pages.

## Performance

- **Started:** 2026-01-28 20:16:28 UTC
- **Completed:** 2026-01-28 20:19:42 UTC
- **Duration:** 3min 11s
- **Tasks completed:** 2/2 (100%)
- **Files modified:** 11 files (10 created, 1 modified)

## Accomplishments

### Runtime Response Validation
- Created `userResponseSchema` with Zod for validating User API responses
- Schema validates all fields including nullable fields and ISO string dates
- `createUserEndpoints` factory uses `safeParse` and throws on validation failure
- Logs validation errors to console for debugging contract violations

### TanStack Query Integration
- Created `createQueryClient()` factory with smart retry logic:
  - No retry for 4xx errors (client errors are not transient)
  - Up to 3 retries for 5xx and network errors with exponential backoff (1s, 2s, 4s, 8s max)
- Created `QueryProvider` component with stable QueryClient (uses `useState` to prevent cache loss)
- Includes React Query DevTools for development visibility

### Data Fetching Hooks
- Created `useMe()` hook for fetching current user profile
- Returns typed `UserResponse` data via TanStack Query
- 5-minute stale time (user profile changes infrequently)
- Automatically handles loading states, errors, and caching

### Error UX Components
- **useApiErrorToast:** Hook for displaying API errors as toast notifications
- **GlobalLoadingIndicator:** Top viewport progress bar during active TanStack Query fetches
- **Error boundaries:** Global error.tsx catches render errors with retry functionality
- **Custom pages:** 404 not-found.tsx and 403 unauthorized/page.tsx with dashboard navigation

### Layout Integration
- Wired `QueryProvider`, `Toaster` (with richColors), and `GlobalLoadingIndicator` into root layout
- Structure: ClerkProvider > ThemeProvider > QueryProvider > (GlobalLoadingIndicator + SignedIn/Out + Toaster)
- QueryProvider wraps entire app (inside ThemeProvider, outside auth guards)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Zod schemas, endpoint functions, and TanStack Query hooks | 8e6e349 | 8 files (schemas, endpoints, query client/provider/hooks) |
| 2 | Create error UX components, error pages, and wire into layout | 8587178 | 6 files (error components, error/404/403 pages, layout) |

## Files Created

**Schemas:**
- `apps/web/lib/api/schemas/user.schema.ts` - Zod schema for User response validation
- `apps/web/lib/api/schemas/index.ts` - Barrel export for schemas

**Endpoints:**
- `apps/web/lib/api/endpoints/users.ts` - createUserEndpoints factory with getMe()
- `apps/web/lib/api/endpoints/index.ts` - Barrel export for endpoints

**TanStack Query:**
- `apps/web/lib/query/client.ts` - QueryClient factory with smart retry defaults
- `apps/web/lib/query/provider.tsx` - QueryProvider with stable client instance
- `apps/web/lib/query/hooks/use-me.ts` - useMe() hook for user profile fetching
- `apps/web/lib/query/hooks/index.ts` - Barrel export for hooks

**Error UX:**
- `apps/web/components/error/error-toast.tsx` - useApiErrorToast hook for toast notifications
- `apps/web/components/error/global-loading.tsx` - GlobalLoadingIndicator component
- `apps/web/app/error.tsx` - Global error boundary with reset functionality
- `apps/web/app/not-found.tsx` - Custom 404 page
- `apps/web/app/unauthorized/page.tsx` - Custom 403 page

## Files Modified

- `apps/web/app/layout.tsx` - Added QueryProvider, Toaster, GlobalLoadingIndicator imports and wiring

## Decisions Made

### 1. Zod safeParse for Runtime Validation
**Context:** Need to validate API responses at runtime to catch contract violations.

**Decision:** Use `safeParse()` instead of `parse()` to handle validation errors explicitly.

**Rationale:**
- `safeParse` returns a result object with success flag (no exceptions)
- Allows logging detailed validation errors before throwing
- Provides better debugging experience for API contract mismatches
- Keeps error handling explicit and controlled

**Alternatives considered:**
- `parse()` with try/catch: Less explicit, harder to log details
- TypeScript-only validation: No runtime protection against API changes

### 2. Factory Pattern for Endpoint Functions
**Context:** Endpoints need to work with both hook-based client (useApiClient) and factory-based client (createApiClient).

**Decision:** Export `createUserEndpoints(fetchFn)` factory that accepts a fetch function.

**Rationale:**
- Allows composition with any fetch implementation
- Hooks can construct endpoints internally: `const endpoints = createUserEndpoints(client.fetch)`
- No direct hook dependency in endpoint functions (can be used in non-React contexts)
- Testable: easy to mock fetchFn

**Alternatives considered:**
- Direct hook dependency: Limits usage to React components
- Separate implementations: Code duplication

### 3. Smart Retry in QueryClient
**Context:** Not all errors should be retried (4xx are permanent, 5xx might recover).

**Decision:** Custom retry function that never retries 4xx, retries 5xx/network up to 3 times with exponential backoff.

**Rationale:**
- 4xx errors (Bad Request, Unauthorized, Forbidden, Not Found) are client errors - retrying won't fix them
- 5xx errors (Internal Server Error, Bad Gateway) are server errors - might be transient
- Network errors (TypeError) should be retried (temporary connectivity issues)
- Exponential backoff prevents overwhelming failing servers

**Alternatives considered:**
- Uniform retry for all errors: Wastes requests on permanent failures
- No retry: Poor UX for transient errors
- Per-endpoint configuration: Too complex for current needs

### 4. useState for Stable QueryClient
**Context:** QueryProvider must maintain same QueryClient instance across re-renders.

**Decision:** Use `useState(() => createQueryClient())` to create stable instance.

**Rationale:**
- useState initializer runs only once (on mount)
- Prevents QueryClient re-creation on parent re-renders
- Preserves query cache across component updates
- React-idiomatic pattern for stable instances

**Alternatives considered:**
- useMemo: Doesn't guarantee stability (React can discard memoized values)
- Global singleton: Harder to test, breaks SSR compatibility

### 5. richColors Prop on Toaster
**Context:** Need visual distinction between error/success/warning toast types.

**Decision:** Pass `richColors` prop to Toaster component.

**Rationale:**
- Sonner's richColors provides semantic color coding (red for errors, green for success, yellow for warnings)
- Better visual feedback for users
- Consistent with modern UX patterns
- No additional styling required

**Alternatives considered:**
- Default colors: Less visually distinct
- Custom theme: More work, Sonner's colors already good

## Deviations from Plan

None - plan executed exactly as written. All features implemented as specified.

## Issues Encountered

None - all tasks completed without blockers.

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Dependencies satisfied:**
- ✅ Zod validation layer complete
- ✅ TanStack Query data layer complete
- ✅ Error UX (toasts, boundaries, pages) complete
- ✅ Root layout properly configured

**Ready for:** Phase completion (03-02 is the final plan in phase 03).

**Next steps:**
- Frontend client infrastructure is complete and production-ready
- Future feature development can use:
  - `createUserEndpoints` pattern for new API endpoints
  - `useQuery` hooks for data fetching
  - `useApiErrorToast` for error display
  - Zod schemas for response validation
