---
status: diagnosed
phase: 26-extension-auth-flow
source: [26-01-SUMMARY.md, 26-02-SUMMARY.md]
started: 2026-02-04T01:05:00Z
updated: 2026-02-04T01:11:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Disconnected State Shows Connect UI
expected: When not authenticated, popup shows "Open Populatte" button, 6-digit code input, and "Connect" button
result: pass

### 2. Open Populatte Button Works
expected: Clicking "Open Populatte" opens the web app (localhost:3000) in a new tab
result: issue
reported: "it opened in a new tab, but it's a page that doesn't exist"
severity: major

### 3. Code Input Validates 6 Digits
expected: Connect button only enables when exactly 6 digits are entered. Non-digit characters are rejected or ignored.
result: pass

### 4. Connection Code Exchange
expected: Enter a valid connection code from the web app, click Connect. Extension authenticates and switches to connected state.
result: skipped
reason: Blocked by Test 2 - web app connection page doesn't exist (404), cannot generate valid code

### 5. Connected State Shows Indicator
expected: After successful authentication, popup shows a green checkmark with "Connected" text instead of the connect form.
result: skipped
reason: Blocked by Test 2 - cannot authenticate without valid code from web app

### 6. Invalid Code Shows Error
expected: Enter an invalid 6-digit code (e.g., "000000"), click Connect. Error message displays explaining the code is invalid.
result: pass

## Summary

total: 6
passed: 3
issues: 1
pending: 0
skipped: 2

## Gaps

- truth: "Clicking Open Populatte opens the web app (localhost:3000) in a new tab"
  status: failed
  reason: "User reported: it opened in a new tab, but it's a page that doesn't exist"
  severity: major
  test: 2
  root_cause: "Web app page at /extension/connect was never created. Extension opens this URL but no Next.js page exists. Backend endpoint POST /auth/extension-code exists but has no frontend."
  artifacts:
    - path: "apps/extension/entrypoints/popup/components/ConnectView.tsx"
      issue: "Opens http://localhost:3000/extension/connect which doesn't exist"
  missing:
    - "Create apps/web/app/extension/connect/page.tsx"
    - "Page must be authenticated (Clerk)"
    - "Page calls POST /auth/extension-code to generate 6-digit code"
    - "Page displays code with copy button and 5-minute expiry notice"
  debug_session: ""
