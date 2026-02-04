---
phase: 26-extension-auth-flow
plan: 01
subsystem: auth
tags: [api-client, fetch, jwt, extension, chrome-storage]

# Dependency graph
requires:
  - phase: 24-extension-scaffold
    provides: storage and messaging modules
  - phase: 25-backend-extensions
    provides: extension-token and extension-me endpoints
provides:
  - API client layer with fetchWithAuth utility
  - Auth API functions (exchangeCode, getMe)
  - AUTH_LOGIN message handler in background
affects: [26-02, popup-ui, authenticated-api-calls]

# Tech tracking
tech-stack:
  added: []
  patterns: [fetchWithAuth for authenticated requests, 401 auto-logout]

key-files:
  created:
    - apps/extension/src/api/client.ts
    - apps/extension/src/api/auth.ts
    - apps/extension/src/api/index.ts
  modified:
    - apps/extension/entrypoints/background.ts

key-decisions:
  - "fetchWithAuth clears auth and broadcasts on 401"
  - "Auth functions use plain fetch since they're for initial auth"
  - "30-day token expiry set during AUTH_LOGIN"

patterns-established:
  - "API functions organized in src/api module"
  - "Background handles auth by calling API then updating storage"

# Metrics
duration: 2min
completed: 2026-02-04
---

# Phase 26 Plan 01: Background Auth Handler Summary

**API client layer with fetchWithAuth utility and AUTH_LOGIN handler that exchanges connection codes for JWT tokens**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-04T00:51:01Z
- **Completed:** 2026-02-04T00:53:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created API client layer with `fetchWithAuth` utility for authenticated requests
- Implemented `exchangeCode` and `getMe` auth functions for connection flow
- Added AUTH_LOGIN handler in background.ts that exchanges codes for tokens
- fetchWithAuth handles 401 responses by clearing auth and broadcasting state update

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API client layer** - `970f58d` (feat)
2. **Task 2: Implement AUTH_LOGIN handler** - `9a8162a` (feat)

## Files Created/Modified

- `apps/extension/src/api/client.ts` - API_BASE_URL constant and fetchWithAuth utility with 401 handling
- `apps/extension/src/api/auth.ts` - exchangeCode and getMe functions for auth flow
- `apps/extension/src/api/index.ts` - Module exports for API functions
- `apps/extension/entrypoints/background.ts` - Added AUTH_LOGIN case that exchanges code, stores token/user, broadcasts state

## Decisions Made

- **fetchWithAuth clears auth on 401:** When API returns 401, auth is cleared from storage and STATE_UPDATED is broadcast to update popup UI
- **Plain fetch for auth functions:** exchangeCode and getMe use regular fetch since they're called before authentication is established
- **30-day token expiry:** Token expiration is set to 30 days from login time, matching typical session duration for browser extensions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- API client layer complete with authenticated request support
- AUTH_LOGIN handler ready to receive messages from popup
- Ready for Plan 26-02: Popup connection UI implementation

---
*Phase: 26-extension-auth-flow*
*Completed: 2026-02-04*
