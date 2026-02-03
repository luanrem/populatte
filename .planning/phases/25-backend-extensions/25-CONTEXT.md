# Phase 25: Backend Extensions - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

API endpoints to support extension authentication via connection codes and row status tracking. Web app generates codes, extension exchanges for JWT, extension updates row statuses during fill operations. No UI implementation in this phase — that's Phase 26/27.

</domain>

<decisions>
## Implementation Decisions

### Connection Code Flow
- Code displayed on dedicated settings page in web app
- 6-digit numeric format (123456) — familiar from 2FA apps
- Only one active code per user at a time (generating new invalidates old)
- Static expiration notice ("Code expires in 5 minutes") — no live countdown
- Copy button with "Copied!" confirmation feedback
- Web app doesn't need real-time connection status — shows "Extension connected" on next settings page visit if active token exists
- No web-based revocation — extension manages its own logout
- Unlimited connections per user (multiple browsers/machines each get own token)
- No visibility of connected extensions needed in web app

### Token Lifecycle
- 30-day JWT expiration
- On expiry, extension shows "Session expired, reconnect?" with link to web app settings
- 5 invalid code attempts triggers 15-minute lockout (brute-force protection)
- Extension "Connect" button opens web app settings page in new tab

### Row Status Model
- Three statuses: PENDING, VALID, ERROR (minimal set per requirements)
- ERROR stores: error message + failed step identifier
- VALID is final (no reset)
- ERROR can be reset to PENDING for retry
- Timestamp tracked on status change (no user attribution needed)

### Claude's Discretion
- Connection code storage mechanism (database table vs cache)
- JWT payload structure and signing approach
- API endpoint naming conventions
- Error response format details
- Rate limiting implementation approach

</decisions>

<specifics>
## Specific Ideas

- Extension flow: user clicks "Connect" in extension → opens web app settings → generates code → pastes in extension → authenticated
- Keep the code simple and familiar — like entering a 2FA code

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-backend-extensions*
*Context gathered: 2026-02-03*
