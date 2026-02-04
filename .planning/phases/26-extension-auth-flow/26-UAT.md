---
status: diagnosed
phase: 26-extension-auth-flow
source: [26-01-SUMMARY.md, 26-02-SUMMARY.md, 26-03-SUMMARY.md]
started: 2026-02-04T01:05:00Z
updated: 2026-02-04T02:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Open Populatte Opens Connect Page
expected: Clicking "Open Populatte" in the extension popup opens /extension/connect. The page loads and shows the connection code interface.
result: issue
reported: "Apareceu a página, só que onde tem o código fica dando um flickering. Ele fica piscando como se estivesse em loading e não deixasse o código mostrar na tela. Toda hora é loading e fica toda hora mudando. Daí eu não consigo ver o código, qual que é."
severity: major

### 2. Connection Code Generated and Displayed
expected: The /extension/connect page shows a 6-digit numeric code, a "Copy" button, and a 5-minute expiry notice.
result: issue
reported: "Não passou, ele fica dando flickering no código, inclusive eu abri um network aqui e ele fica fazendo milhares de chamadas de extension code."
severity: major

### 3. Copy Button Works
expected: Clicking "Copy" copies the code to clipboard and shows "Copied!" feedback.
result: skipped
reason: Blocked by infinite API call bug in Tests 1-2

### 4. Connection Code Exchange
expected: Enter the code from web app into extension popup, click Connect. Extension authenticates and switches to connected state showing "Connected" indicator.
result: skipped
reason: Blocked by infinite API call bug - cannot get stable code

### 5. Connected State Shows Indicator
expected: After successful authentication, popup shows a green checkmark with "Connected" text instead of the connect form.
result: skipped
reason: Blocked by Tests 1-4 - cannot complete auth flow

## Summary

total: 5
passed: 0
issues: 2
pending: 0
skipped: 3

## Gaps

- truth: "The /extension/connect page shows a stable connection code without flickering"
  status: failed
  reason: "User reported: Code flickers constantly, network shows thousands of API calls to /auth/extension-code"
  severity: major
  test: 1
  root_cause: "useApiClient() returns a NEW object on every render (line 161 in apps/web/lib/api/client.ts). The object is not memoized, so apiClient changes every render, triggering useCallback recreation, triggering useEffect, calling API, changing state, re-rendering - infinite loop."
  artifacts:
    - path: "apps/web/lib/api/client.ts"
      issue: "useApiClient returns createApiClient(getToken) without memoization - new object every render"
    - path: "apps/web/app/extension/connect/page.tsx"
      issue: "generateCode useCallback depends on apiClient which changes every render"
  missing:
    - "Memoize return value in useApiClient: return useMemo(() => createApiClient(getToken), [getToken])"
  debug_session: ""
