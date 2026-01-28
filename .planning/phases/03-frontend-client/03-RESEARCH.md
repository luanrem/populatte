# Phase 03: Frontend Client - Research

**Researched:** 2026-01-28
**Domain:** Next.js 16 App Router with TanStack Query, Clerk authentication, and type-safe API client
**Confidence:** HIGH

## Summary

This phase implements a type-safe API client for the Next.js web dashboard with automatic Clerk token injection, intelligent 401 retry logic, and Zod-validated responses. The architecture follows a dual-client pattern (separate server-side and client-side implementations) with TanStack Query providing data caching, mutations, and background refetch capabilities. Error handling uses shadcn/ui's Sonner toast for global errors and inline components for form validation. Route protection leverages Clerk middleware (already configured).

The modern stack combines React Server Components for initial loads with TanStack Query for interactive client-side data management, achieving "lightning fast initial loads from the server plus smart, optimistic client-side caching" as noted in current best practices. This hybrid approach is documented as "the 2026 data-fetching power duo" for Next.js applications.

**Primary recommendation:** Use TanStack Query v5+ with Next.js App Router for data layer, native fetch wrapper (not Axios) with dual client pattern, Sonner toast for error UX, and Zod schemas in shared packages/commons for API response validation.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | v5.40.0+ | Client-side data fetching, caching, mutations | v5+ has better RSC support and suspense integration. Official Next.js App Router examples. Industry standard for React data fetching (40-70% faster TTI vs legacy patterns) |
| @clerk/nextjs | v6.35.5 (current) | Authentication with automatic token refresh | Already installed. Native Next.js App Router integration with both server (auth(), currentUser()) and client (useAuth(), getToken()) primitives |
| zod | v3.24.2+ | Runtime API response validation | TypeScript-first validation library (92.7 benchmark score on Context7). Allows static type inference from schemas |
| sonner | via shadcn/ui | Toast notifications for global errors | Built and maintained by emilkowalski. Opinionated, minimal setup. User explicitly requested shadcn/ui toast component |
| native fetch | Built-in | HTTP client with custom wrapper | Aligns with Next.js patterns, no external dependencies. Prior decision: "Fetch wrapper over Axios" |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query-devtools | v5+ | Query cache inspection during development | Dev-only. Essential for debugging cache state and refetch behavior |
| @tanstack/react-query-persist-client | v5+ (optional) | Persist query cache to localStorage | Optional optimization for offline-first UX (deferred to future phase) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TanStack Query | SWR | SWR is simpler but lacks mutation management, query cancellation, and devtools. TanStack Query provides full-featured caching and is the documented standard for Next.js 14+ |
| native fetch wrapper | axios | Axios is heavier (11kb vs 0kb), interceptor pattern less idiomatic for RSC. Prior decision explicitly chose fetch |
| native fetch wrapper | wretch | Wretch has elegant API (.unauthorized() method) but adds dependency. Fetch wrapper is ~50 LOC with full control |
| Sonner (shadcn) | react-hot-toast | User explicitly requested "pick one from shadcn" - decision already locked |

**Installation:**

```bash
# From apps/web directory
cd apps/web

# TanStack Query core
npm install @tanstack/react-query@latest
npm install -D @tanstack/react-query-devtools@latest

# Sonner toast (via shadcn CLI)
pnpm dlx shadcn@latest add sonner

# Zod (for shared packages/commons - if not already installed)
cd ../../packages/commons
npm install zod@latest
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── lib/
│   ├── api/
│   │   ├── client.ts              # Fetch wrapper with token injection
│   │   ├── client.server.ts       # Server-side client (uses auth())
│   │   ├── endpoints/
│   │   │   ├── users.ts           # User endpoints: getMe()
│   │   │   └── index.ts           # Re-export all endpoints as flat exports
│   │   ├── error-handler.ts       # Central error mapping and logging
│   │   └── types.ts               # API client types (ApiError, ApiResponse<T>)
│   ├── query/
│   │   ├── provider.tsx           # QueryClientProvider wrapper (client component)
│   │   ├── client.ts              # QueryClient factory with defaults
│   │   └── hooks/
│   │       ├── use-me.ts          # useQuery wrapper for getMe()
│   │       └── index.ts           # Re-export all hooks
│   └── utils/
│       └── request-queue.ts       # 401 retry queue for concurrent requests
├── components/
│   ├── providers/
│   │   └── query-provider.tsx     # Hydration boundary for RSC->client
│   ├── ui/
│   │   ├── sonner.tsx             # shadcn Sonner component
│   │   └── ...                    # Other shadcn components
│   └── error/
│       ├── error-toast.tsx        # Reusable error toast logic
│       └── global-loading.tsx     # useIsFetching indicator
├── app/
│   ├── layout.tsx                 # Add QueryProvider + Toaster here
│   ├── error.tsx                  # Error boundary (client component)
│   ├── not-found.tsx              # Custom 404 page
│   └── unauthorized/
│       └── page.tsx               # Custom 403 page (for non-Clerk auth errors)
└── packages/commons/              # Shared across apps
    └── src/
        └── schemas/
            ├── api/
            │   └── user.schema.ts # Zod schemas for User API responses
            └── index.ts           # Re-export all schemas
```

### Pattern 1: Dual Client Pattern (Server vs Client)

**What:** Separate API client instances for server-side (RSC, Route Handlers) and client-side (React hooks) with different token providers.

**When to use:** When using Next.js App Router with both Server Components and Client Components.

**Example:**

```typescript
// lib/api/client.ts (CLIENT-SIDE)
'use client'

import { useAuth } from '@clerk/nextjs'

export function createApiClient() {
  const { getToken } = useAuth()

  return {
    async fetch(endpoint: string, options?: RequestInit) {
      const token = await getToken()

      return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
    }
  }
}

// lib/api/client.server.ts (SERVER-SIDE)
import { auth } from '@clerk/nextjs/server'

export async function createServerApiClient() {
  const { getToken } = await auth()

  return {
    async fetch(endpoint: string, options?: RequestInit) {
      const token = await getToken()

      return fetch(`${process.env.API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
    }
  }
}
```

**Source:** [Fetch Wrapper for Next.js: A Deep Dive into Best Practices](https://dev.to/dmitrevnik/fetch-wrapper-for-nextjs-a-deep-dive-into-best-practices-53dh) - Context-aware API client pattern

### Pattern 2: TanStack Query with RSC Prefetching

**What:** Prefetch data in Server Components, dehydrate to client, hydrate with TanStack Query for interactive updates.

**When to use:** For initial page loads that need SEO/performance (server) plus live updates (client).

**Example:**

```typescript
// app/dashboard/page.tsx (Server Component)
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query'
import { DashboardClient } from './dashboard-client'
import { createServerApiClient } from '@/lib/api/client.server'

export default async function DashboardPage() {
  const queryClient = new QueryClient()
  const apiClient = await createServerApiClient()

  // Prefetch on server
  await queryClient.prefetchQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.fetch('/users/me').then(r => r.json()),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  )
}

// app/dashboard/dashboard-client.tsx (Client Component)
'use client'

import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/lib/api/endpoints/users'

export function DashboardClient() {
  // Uses server-prefetched data initially, then manages updates
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  return <div>Welcome, {user?.firstName}!</div>
}
```

**Source:** [TanStack Query Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) - Official docs

### Pattern 3: 401 Retry with Request Queue

**What:** Queue concurrent 401 requests during token refresh, retry all after new token obtained.

**When to use:** When multiple simultaneous requests can fail with 401 (prevents token refresh race conditions).

**Example:**

```typescript
// lib/utils/request-queue.ts
type QueuedRequest = {
  endpoint: string
  options: RequestInit
  resolve: (value: Response) => void
  reject: (error: Error) => void
}

let isRefreshing = false
let refreshPromise: Promise<string> | null = null
const requestQueue: QueuedRequest[] = []

export async function fetchWithRetry(
  getToken: () => Promise<string | null>,
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const token = await getToken()

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  // Handle 401 - refresh and retry
  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = getToken().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }

    // Wait for refresh, then retry
    await refreshPromise
    const newToken = await getToken()

    return fetch(endpoint, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: newToken ? `Bearer ${newToken}` : '',
      },
    })
  }

  return response
}
```

**Source:** [Advanced JWT Interceptor to Handle Concurrent 401 Requests](https://medium.com/tenantcloud-engineering/advanced-jwt-interceptor-to-handle-concurrent-401-requests-in-angular-28acd3cadb2e) - Request queue pattern (adapted from Angular to React)

### Pattern 4: Zod Response Validation with Type Inference

**What:** Validate API responses at runtime with Zod, throw on schema mismatch, infer TypeScript types from schemas.

**When to use:** For all API responses where data shape matters (critical endpoints, user data, lists).

**Example:**

```typescript
// packages/commons/src/schemas/api/user.schema.ts
import { z } from 'zod'

export const userResponseSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type UserResponse = z.infer<typeof userResponseSchema>

// lib/api/endpoints/users.ts
import { userResponseSchema } from '@populatte/commons/schemas'
import { createApiClient } from '../client'

export async function getMe(): Promise<UserResponse> {
  const client = createApiClient()
  const response = await client.fetch('/users/me')

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`)
  }

  const data = await response.json()

  // Validate and parse - throws ZodError if invalid
  return userResponseSchema.parse(data)
}
```

**Source:** [Zod documentation - Basic usage](https://zod.dev/basics) and [Building Robust API Clients with TypeScript and Zod](https://leapcell.io/blog/building-robust-api-clients-with-typescript-and-zod)

### Pattern 5: Sonner Toast for Contextual Errors

**What:** Use toast.error() for global errors (network, auth, 503 sync), inline errors for validation.

**When to use:** Network failures, authentication issues, background operation failures.

**Example:**

```typescript
// components/error/error-toast.tsx
'use client'

import { toast } from 'sonner'
import { useEffect } from 'react'

export function useApiErrorToast(error: Error | null, message: string) {
  useEffect(() => {
    if (error) {
      toast.error(message, {
        description: error.message,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload(),
        },
      })
    }
  }, [error, message])
}

// Usage in component
import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/lib/api/endpoints/users'
import { useApiErrorToast } from '@/components/error/error-toast'

export function UserProfile() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  useApiErrorToast(error, 'Could not load your profile')

  if (isLoading) return <div>Loading...</div>
  if (!data) return null

  return <div>{data.firstName}</div>
}
```

**Source:** [shadcn/ui Sonner documentation](https://ui.shadcn.com/docs/components/sonner) - Official setup and usage

### Pattern 6: Global Loading Indicator with useIsFetching

**What:** Show app-wide loading indicator when any TanStack Query fetches are in progress.

**When to use:** For navigation-level loading states (top bar indicator, progress bar).

**Example:**

```typescript
// components/error/global-loading.tsx
'use client'

import { useIsFetching, useIsMutating } from '@tanstack/react-query'

export function GlobalLoadingIndicator() {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  const isLoading = isFetching > 0 || isMutating > 0

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-primary animate-pulse z-50" />
  )
}

// app/layout.tsx
import { GlobalLoadingIndicator } from '@/components/error/global-loading'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          <GlobalLoadingIndicator />
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

**Source:** [TanStack Query - Background Fetching Indicators](https://tanstack.com/query/v4/docs/framework/react/guides/background-fetching-indicators) - Official useIsFetching docs

### Anti-Patterns to Avoid

- **Don't use axios interceptors in App Router**: Interceptors are global and don't play well with RSC dual-client pattern. Use fetch wrapper with explicit token injection.
- **Don't put QueryClient in global scope**: Creates memory leaks in RSC. Always instantiate per-request in Server Components or use singleton only for client-side.
- **Don't retry 4xx errors**: 400-level errors are client mistakes (bad request, validation). Only retry 5xx (server errors) or network failures.
- **Don't store tokens in localStorage**: Vulnerable to XSS. Clerk handles token storage securely - just call getToken() when needed.
- **Don't parse response without Zod**: Runtime data from APIs can mismatch TypeScript types. Always validate critical responses with Zod.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request caching/deduplication | Custom cache with Map/WeakMap | TanStack Query | Handles cache invalidation, background refetch, stale-while-revalidate, garbage collection. 1000+ edge cases solved |
| Token refresh queue | Promise array + setTimeout | Request queue pattern (50 LOC) | Race conditions with concurrent requests, retry logic, error propagation all need handling |
| API response parsing | Manual JSON.parse + type assertion | Zod schema.parse() | Runtime validation catches mismatches, provides detailed error messages, infers types automatically |
| Toast notifications | Custom toast context + state | Sonner (via shadcn) | Handles stacking, positioning, animations, accessibility, auto-dismiss. 300+ LOC saved |
| Loading states | useState + useEffect per component | TanStack Query isLoading/isFetching | Automatic state management, prevents race conditions, handles cleanup on unmount |
| Error boundaries | Try/catch in every component | Next.js error.tsx files | Automatic error catching during render, reset functionality, granular error UI per route segment |

**Key insight:** Data fetching is deceptively complex. TanStack Query is the industry standard because it solves problems you haven't encountered yet (request cancellation on unmount, dependent queries, optimistic updates, cache persistence). Don't build a worse version from scratch.

## Common Pitfalls

### Pitfall 1: Calling useAuth() hooks in Server Components

**What goes wrong:** `useAuth()`, `useUser()` are React hooks - they only work in Client Components. Calling them in Server Components causes "hooks can only be called inside the body of a function component" error.

**Why it happens:** Next.js App Router defaults to Server Components. Developers forget to add `'use client'` directive when using Clerk hooks.

**How to avoid:**
- Use `auth()` and `currentUser()` from `@clerk/nextjs/server` in Server Components
- Use `useAuth()` and `useUser()` hooks only in Client Components (with `'use client'`)
- Create dual client pattern: client.ts for browser, client.server.ts for server

**Warning signs:**
- Import from `@clerk/nextjs` without `'use client'` directive
- Error message mentioning "hooks" in server-rendered component

**Source:** [Clerk Next.js Quickstart - Server-Side Authentication](https://context7.com/clerk/clerk-nextjs-app-quickstart/llms.txt)

### Pitfall 2: Creating New QueryClient on Every Render

**What goes wrong:** Instantiating `new QueryClient()` inside a component body causes cache to reset on every render. Queries re-run unnecessarily, data flickers.

**Why it happens:** Developers treat QueryClient like a lightweight object. It's actually a cache store that should be stable across renders.

**How to avoid:**
- In Client Components: Create QueryClient with `useState` or outside component scope
- In Server Components: Create new instance per request (they don't re-render)
- Use factory function in `lib/query/client.ts` with proper defaults

**Warning signs:**
- Data flashes/resets when component re-renders
- Queries showing "loading" state even when data should be cached
- DevTools showing cache constantly clearing

**Example (correct):**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }) {
  // useState ensures same instance across renders
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
          // Don't retry 4xx errors
          if (error instanceof Error && error.message.includes('4')) {
            return false
          }
          return failureCount < 3
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Source:** [TanStack Query Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr) - Official RSC setup

### Pitfall 3: Forgetting to Handle Zod Parsing Errors

**What goes wrong:** `schema.parse(data)` throws `ZodError` when validation fails. If uncaught, it crashes the app or shows generic error boundaries.

**Why it happens:** Developers assume API responses always match schema (they don't - APIs change, bugs happen, network issues truncate data).

**How to avoid:**
- Use `.safeParse()` for graceful error handling when you want to show UI errors
- Use `.parse()` inside try/catch for critical data (let it bubble to error boundary)
- Log schema mismatches to error tracking service (Sentry, LogRocket)
- In TanStack Query: errors automatically caught and exposed via `error` property

**Warning signs:**
- "ZodError: [...]" showing in error boundaries without context
- No error reporting when API response format changes
- Users seeing generic "Something went wrong" for data validation issues

**Example (correct):**

```typescript
// lib/api/endpoints/users.ts
import { userResponseSchema } from '@populatte/commons/schemas'

export async function getMe(): Promise<UserResponse> {
  const response = await fetch('/api/users/me')

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  // Use safeParse for better error handling
  const result = userResponseSchema.safeParse(data)

  if (!result.success) {
    console.error('API response validation failed:', result.error)
    // Log to error tracking
    // Sentry.captureException(result.error, { extra: { response: data } })
    throw new Error('Invalid user data received from server')
  }

  return result.data
}
```

**Source:** [Zod Error Customization](https://zod.dev/error-customization) and [Mastering Zod Validation](https://blog.codeminer42.com/zod-validation-101/)

### Pitfall 4: Not Configuring Retry Strategy for 503 Sync Failures

**What goes wrong:** Backend returns 503 during ClerkAuthGuard user sync (SyncFailureIndicator prevents retries), frontend shows permanent error instead of retrying.

**Why it happens:** TanStack Query default retry logic doesn't distinguish between temporary (503) and permanent (400, 404) failures.

**How to avoid:**
- Configure custom retry function that retries 5xx errors but not 4xx
- For 503 specifically: retry with exponential backoff (1s, 2s, 4s)
- Show "Syncing your account, please wait..." toast during 503 retries
- After 3 retries (8s total), show "Sync taking longer than expected" with manual retry button

**Warning signs:**
- Users seeing "Could not load data" immediately after sign-up (503 during first sync)
- No automatic retry when backend is temporarily unavailable
- Error toasts for transient network issues

**Example (correct):**

```typescript
// lib/query/client.ts
import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Don't retry client errors (4xx)
          if (error instanceof Error) {
            const status = parseInt(error.message.match(/HTTP (\d{3})/)?.[1] || '0')
            if (status >= 400 && status < 500) {
              return false // Client error - don't retry
            }
          }

          // Retry server errors (5xx) up to 3 times
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => {
          // Exponential backoff: 1s, 2s, 4s
          return Math.min(1000 * 2 ** attemptIndex, 8000)
        },
      },
    },
  })
}
```

**Source:** [TanStack Query Retry Documentation](https://tanstack.com/query/latest/docs/react/guides/query-retries) and [React Query Retry Strategies](https://www.dhiwise.com/blog/design-converter/react-query-retry-strategies-for-better-error-handling)

### Pitfall 5: Missing NEXT_PUBLIC_ Prefix for Client-Side API URL

**What goes wrong:** Environment variables without `NEXT_PUBLIC_` prefix are undefined in browser (client-side fetch fails with "undefined/api/users/me").

**Why it happens:** Next.js only exposes server-side env vars to Server Components. Browser needs explicit opt-in via NEXT_PUBLIC_ prefix.

**How to avoid:**
- Use `NEXT_PUBLIC_API_URL` for client-side API calls
- Use `API_URL` (without prefix) for server-side API calls
- Document in .env.example which variables need public prefix

**Warning signs:**
- API calls work in Server Components but fail in Client Components
- Console shows `fetch("undefined/api/...")` errors
- Different behavior between SSR and client-side hydration

**Example (correct):**

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001  # Client-side (browser)
API_URL=http://localhost:3001               # Server-side only
```

```typescript
// lib/api/client.ts (CLIENT)
'use client'

export function createApiClient() {
  return {
    fetch(endpoint: string, options?: RequestInit) {
      return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, options)
    }
  }
}

// lib/api/client.server.ts (SERVER)
export function createServerApiClient() {
  return {
    fetch(endpoint: string, options?: RequestInit) {
      return fetch(`${process.env.API_URL}${endpoint}`, options)
    }
  }
}
```

**Source:** [Next.js Environment Variables documentation](https://nextjs.org/docs/app/api-reference/config/typescript) - Official env var scoping rules

## Code Examples

Verified patterns from official sources:

### Setting Up TanStack Query Provider

```typescript
// app/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
          // Don't retry 4xx client errors
          if (error instanceof Error && error.message.includes('HTTP 4')) {
            return false
          }
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// app/layout.tsx
import { QueryProvider } from './providers/query-provider'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <QueryProvider>
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

**Source:** [TanStack Query Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr)

### Clerk Token Injection in Fetch Wrapper (Client-Side)

```typescript
// lib/api/client.ts
'use client'

import { useAuth } from '@clerk/nextjs'

export function useApiClient() {
  const { getToken } = useAuth()

  return {
    async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
      const token = await getToken()

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    },
  }
}
```

**Source:** [Clerk Next.js Quickstart - Client-Side Authentication Hooks](https://context7.com/clerk/clerk-nextjs-app-quickstart/llms.txt)

### Sonner Toast Setup

```typescript
// app/layout.tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}

// Usage in any component
'use client'

import { toast } from "sonner"

export function MyComponent() {
  const handleError = () => {
    toast.error("Could not load your projects", {
      description: "Please check your connection and try again",
      action: {
        label: "Retry",
        onClick: () => window.location.reload(),
      },
    })
  }

  return <button onClick={handleError}>Trigger Error</button>
}
```

**Source:** [shadcn/ui Sonner Documentation](https://ui.shadcn.com/docs/components/sonner)

### Custom 404 Page (Next.js App Router)

```typescript
// app/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <p className="mt-4 text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}

// app/unauthorized/page.tsx
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">403 - Unauthorized</h1>
      <p className="mt-4 text-muted-foreground">
        You don't have permission to access this page.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  )
}
```

**Source:** [Next.js Error Handling Documentation](https://nextjs.org/docs/app/getting-started/error-handling) - Custom 404 pages

### TanStack Query Hook with Zod Validation

```typescript
// lib/api/hooks/use-me.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '../client'
import { userResponseSchema, type UserResponse } from '@populatte/commons/schemas'

export function useMe() {
  const client = useApiClient()

  return useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<UserResponse> => {
      const data = await client.fetch('/users/me')

      // Validate with Zod
      const result = userResponseSchema.safeParse(data)

      if (!result.success) {
        console.error('User response validation failed:', result.error)
        throw new Error('Invalid user data received')
      }

      return result.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
  })
}

// Usage in component
'use client'

import { useMe } from '@/lib/api/hooks/use-me'
import { useApiErrorToast } from '@/components/error/error-toast'

export function UserProfile() {
  const { data: user, isLoading, error } = useMe()

  useApiErrorToast(error, 'Could not load your profile')

  if (isLoading) return <div>Loading...</div>
  if (!user) return null

  return (
    <div>
      <p>Email: {user.email}</p>
      <p>Name: {user.firstName} {user.lastName}</p>
    </div>
  )
}
```

**Source:** Combined from [Zod API Response Validation](https://laniewski.me/blog/2023-11-19-api-response-validation-with-zod/) and [TanStack Query Basic Usage](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SWR for Next.js data fetching | TanStack Query v5+ | 2024-2025 | TanStack Query has better RSC support, more features (mutations, devtools), and is recommended in Next.js 14+ examples |
| Axios interceptors | Native fetch wrappers | 2023-2024 | Fetch is built-in, lighter, and more idiomatic for App Router. Interceptors don't work well with dual-client pattern |
| Custom toast implementations | Sonner (via shadcn) | 2024-2025 | Sonner provides production-quality UX with minimal setup. Built by emilkowalski, maintained by shadcn ecosystem |
| Manual token storage in localStorage | Clerk managed tokens | 2023-2024 | Clerk handles secure token storage and refresh automatically. No manual localStorage management needed |
| Type assertions for API responses | Zod runtime validation | 2022-2023 | Runtime validation prevents production bugs from API changes. Zod v3+ has excellent TypeScript integration |
| Pages Router with getServerSideProps | App Router with RSC | 2023-2024 | App Router provides better streaming, nested layouts, and Server Components. TanStack Query v5 designed for this |

**Deprecated/outdated:**
- **react-query v3**: Lacks RSC support and suspense integration. Use v5+ only.
- **next/legacy/image**: Use next/image (modern Image component with automatic optimization).
- **SWR for new projects**: Great library but TanStack Query is more feature-complete and has better Next.js 14+ integration.
- **Axios for Next.js App Router**: Adds 11kb bundle size and interceptor pattern doesn't fit dual-client needs.

## Open Questions

Things that couldn't be fully resolved:

1. **Should we queue concurrent 401 requests or let them retry independently?**
   - What we know: Request queue prevents token refresh race conditions (multiple simultaneous 401s trigger one refresh)
   - What's unclear: Whether the added complexity (50 LOC queue logic) is worth it vs. letting Clerk's getToken() handle locking internally
   - Recommendation: Start without queue, add if we observe duplicate token refresh calls in production logs

2. **Which endpoints should get Zod validation?**
   - What we know: All critical endpoints (user data, auth, payments) need validation. Non-critical (analytics, logs) can skip
   - What's unclear: Where to draw the line for "critical" in this app's context
   - Recommendation: Validate all GET endpoints initially, measure performance impact, then decide if we need selective validation

3. **Should error boundaries be per-page or per-section?**
   - What we know: Next.js supports error.tsx at any route segment level. More granular = better UX but more files
   - What's unclear: What granularity makes sense for this app's route structure
   - Recommendation: Start with one error.tsx at app/ level (global), add granular boundaries if specific routes need custom error handling

4. **Should we use NProgress or a custom loading indicator?**
   - What we know: useIsFetching() provides global loading state. NProgress is popular (5.8k stars) but adds dependency
   - What's unclear: Whether the polished UX of NProgress justifies the ~2kb bundle cost
   - Recommendation: Start with simple CSS progress bar (0kb), upgrade to NProgress if users request better loading UX

## Sources

### Primary (HIGH confidence)

- [TanStack Query Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) - RSC prefetching and hydration patterns
- [TanStack Query Background Fetching Indicators](https://tanstack.com/query/v4/docs/framework/react/guides/background-fetching-indicators) - useIsFetching for global loading
- [TanStack Query Retry Documentation](https://tanstack.com/query/latest/docs/react/guides/query-retries) - Exponential backoff configuration
- [Clerk Next.js App Quickstart](https://context7.com/clerk/clerk-nextjs-app-quickstart/llms.txt) - Server and client authentication patterns
- [Zod Official Documentation](https://zod.dev/basics) - Schema definition and validation
- [shadcn/ui Sonner Component](https://ui.shadcn.com/docs/components/sonner) - Toast setup and usage
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - Error boundaries and not-found pages

### Secondary (MEDIUM confidence)

- [React Server Components + TanStack Query: The 2026 Data-Fetching Power Duo](https://dev.to/krish_kakadiya_5f0eaf6342/react-server-components-tanstack-query-the-2026-data-fetching-power-duo-you-cant-ignore-21fj) - Hybrid architecture benefits
- [Fetch Wrapper for Next.js: Best Practices](https://dev.to/dmitrevnik/fetch-wrapper-for-nextjs-a-deep-dive-into-best-practices-53dh) - Dual client pattern
- [Building Robust API Clients with TypeScript and Zod](https://leapcell.io/blog/building-robust-api-clients-with-typescript-and-zod) - Response validation patterns
- [Advanced JWT Interceptor for Concurrent 401 Requests](https://medium.com/tenantcloud-engineering/advanced-jwt-interceptor-to-handle-concurrent-401-requests-in-angular-28acd3cadb2e) - Request queue pattern
- [React Query Retry Strategies](https://www.dhiwise.com/blog/design-converter/react-query-retry-strategies-for-better-error-handling) - Smart retry configuration
- [Next.js Error Boundary Best Practices](https://www.dhiwise.com/post/nextjs-error-boundary-best-practices) - Granular error handling
- [API Response Validation with Zod](https://laniewski.me/blog/2023-11-19-api-response-validation-with-zod/) - Real-world validation patterns

### Tertiary (LOW confidence)

- GitHub discussions and issue threads (various) - Community patterns for token refresh queuing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via Context7, official docs, and current Next.js examples
- Architecture: HIGH - Dual client pattern documented in multiple authoritative sources, TanStack Query RSC patterns from official docs
- Pitfalls: HIGH - Common issues well-documented in official docs and error reporting services
- Open questions: MEDIUM - Requires project-specific decisions based on requirements

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable ecosystem, minimal breaking changes expected in this period)
