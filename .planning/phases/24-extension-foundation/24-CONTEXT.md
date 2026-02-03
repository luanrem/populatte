# Phase 24: Extension Foundation - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Chrome extension infrastructure using WXT framework with Manifest V3. Delivers: scaffold with working service worker, storage abstraction over chrome.storage.local, type-safe message bus between popup/background/content, and integration with @populatte/types. Users will not directly interact with this phase — it provides foundation for auth, popup, and content script phases.

</domain>

<decisions>
## Implementation Decisions

### Storage design
- Use WXT's built-in storage API (defineStorage()) over chrome.storage.local
- No schema migrations — simple key-value, clear on breaking changes
- Single root object structure: `{ auth: {...}, selection: {...}, preferences: {...} }`
- Flat sections (one level deep), not deeply nested domains
- Type-safe accessors: `storage.getAuth()`, `storage.setSelectedProject()` — explicit methods per data type
- Silent fallback on errors: use in-memory defaults, log error, continue working
- Read-on-demand, no reactive subscriptions — components fetch state when needed
- No TTL support — expiry logic lives in auth/business layer
- Eager initialization: load full state into memory when service worker starts
- Last write wins: simple overwrite, no conflict resolution or write queuing
- Minimal API: only core get/set operations, no debug/inspection utilities

### Message patterns
- Use WXT's defineExtensionMessaging() for type-safe handlers
- Strict discriminated unions: `{ type: 'FILL', payload: FillPayload }` — explicit types per message
- Return error objects: `{ success: false, error: 'message' }` — caller decides how to display
- Dev-only logging: log messages in development, silent in production
- Auto-inject then retry: if content script not available, background injects it and retries the message
- Configurable timeouts: messages timeout after N seconds, return timeout error
- Progress messages: background sends incremental progress to popup during long operations (not polling)
- Message types live in extension only: `apps/extension/src/types/` — extension-internal concern

### Extension identity
- Name: "Populatte"
- Description: "Automate web form filling from your data"
- Icon style: Coffee cup matching the brand identity
- Permissions: Full host permissions (access all sites for form filling)
- Action type: Browser action (toolbar icon, always visible)
- Popup dimensions: Standard (350x500)
- Theme: Match web app colors/tokens, light mode only for MVP

### Claude's Discretion
- Exact folder structure within `apps/extension/src/`
- Which WXT templates/starter to use
- Service worker initialization sequence
- TypeScript path aliases configuration

</decisions>

<specifics>
## Specific Ideas

- Storage should feel like a simple state manager, not a database
- Messages should be as type-safe as API endpoints — strict contracts between contexts
- Extension should feel like part of Populatte product family (consistent branding)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-extension-foundation*
*Context gathered: 2026-02-03*
