# Phase 3: Frontend Client - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Type-safe API client with automatic Clerk token injection, 401 retry logic, and Zod-validated responses. Includes route protection setup and error handling UX. Does not include building actual feature pages or API endpoints beyond the client infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Client API surface
- React hooks layer using **TanStack Query** for data fetching, caching, and mutations
- Underlying fetch wrapper (not Axios) with token injection — hooks wrap this
- **Dual client**: separate client-side (uses Clerk `useAuth()`) and server-side (uses Clerk `auth()`) implementations
- API functions organized as **flat exports**: `getMe()`, `listProjects()` — no nested resource objects
- Hooks like `useQuery(() => getMe())` compose the flat functions with TanStack Query

### Error handling UX
- **Toasts for global errors** (network failures, auth issues, 503 sync) using shadcn/ui's toast component (Sonner-based)
- **Inline errors for form/validation** errors — displayed in context near the triggering component
- **Contextual error messages**: "Could not load your projects" — describes what failed, no status codes or technical details
- **Network errors retry with backoff** (2-3 attempts) before showing error toast
- **503 sync failure** (from ClerkAuthGuard): show toast "Syncing your account, please wait..." then auto-retry
- **Loading states**: TanStack Query manages component-level state (isLoading, isError) + global loading indicator for navigation
- Error boundary granularity: Claude's discretion
- 5xx vs 4xx differentiation: Claude's discretion

### Token refresh flow
- **Reactive only** — no preemptive token refresh; only refresh when 401 is received
- On 401: refresh token silently, retry request once, redirect to sign-in if retry fails
- Multiple simultaneous 401s handling: Claude's discretion (queue vs independent)
- Retry visibility to user: Claude's discretion (silent vs brief indicator)
- Redirect destination on auth failure: Claude's discretion (based on current Clerk config)

### Response validation
- Zod schemas validate API responses — **throw error** on schema mismatch (treat as failed request, log the mismatch)
- TypeScript types come from `@populatte/types` (source of truth) — Zod schemas validate against those types, not the other way around
- Schema location: Claude's discretion (packages/commons vs apps/web)
- Which endpoints to validate: Claude's discretion

### Routing
- Route protection approach: Claude's discretion (Clerk middleware vs client-side)
- Public routes: Claude's discretion (based on current route structure)
- After sign-in redirect: **/dashboard**
- Custom **404 page** (not found) and **403 page** (unauthorized) with navigation back

### Claude's Discretion
- Error boundary granularity (full-page vs per-section)
- 5xx vs 4xx error differentiation strategy
- Token refresh queue vs independent retries for simultaneous 401s
- Silent vs brief indicator during 401 retry
- Redirect destination on auth failure (Clerk hosted vs app route)
- Zod schema file location (shared package vs web-only)
- Which endpoints get Zod validation (all vs critical only)
- Route protection mechanism (Clerk middleware vs client guards)
- Public route definitions
- Global loading indicator implementation (NProgress or similar)

</decisions>

<specifics>
## Specific Ideas

- Toast library must be shadcn/ui's built-in component (Sonner-based) — user explicitly requested "pick one from shadcn"
- Fetch wrapper aligns with existing decision to use fetch over Axios (from Phase 2 decisions)
- TanStack Query chosen over SWR for full-featured caching, mutations, and devtools

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-frontend-client*
*Context gathered: 2026-01-28*
