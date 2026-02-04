# Phase 26: Extension Auth Flow - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can authenticate the extension via connection code from web app. This includes the connect UI, code input, token exchange, and displaying auth state. The backend endpoints already exist (Phase 25) — this phase implements the extension-side flow.

</domain>

<decisions>
## Implementation Decisions

### Connection flow UX
- Single text field for code entry (not split digit boxes)
- Validation triggers on submit button click, not auto-submit
- Button shows spinner during API call, disabled state
- Errors display inline below input field with specific message

### Auth state display
- Connected state shows simple indicator: green dot/checkmark with "Connected" text
- No user avatar or name displayed in connected state
- Disconnect option lives in settings/gear menu, not prominently visible
- Disconnected state shows clear connect prompt with prominent Connect button

### Session expiration handling
- On 401 response: show inline "Session expired, please reconnect" message
- Then redirect to connect UI (clear stored token first)
- No modal dialogs for session expiration

### Claude's Discretion
- Exact styling and spacing of connect UI
- Animation/transition when state changes
- Settings menu implementation details
- Copy/instructions text on connect screen

</decisions>

<specifics>
## Specific Ideas

- Keep the auth UI minimal — users just need to connect quickly and move on to the actual work
- Connect button should open web app in new tab where they can generate the code

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-extension-auth-flow*
*Context gathered: 2026-02-03*
