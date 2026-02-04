# Requirements: Populatte v4.0 Extension Core

**Defined:** 2026-02-03
**Core Value:** Transform tedious manual data entry into automated form population

## v4.0 Requirements

Requirements for Chrome Extension MVP (COPILOTO mode). Each maps to roadmap phases.

### Extension Foundation

- [x] **FOUND-01**: Extension builds with WXT + Vite + Manifest V3
- [x] **FOUND-02**: TypeScript configured for all contexts (popup, background, content script)
- [x] **FOUND-03**: Type-safe message bus enables communication between all contexts
- [x] **FOUND-04**: chrome.storage abstraction layer handles session and local persistence
- [x] **FOUND-05**: Shared types integrated from @populatte/types package
- [x] **FOUND-06**: Extension loads successfully in Chrome developer mode

### Backend Extension Auth

- [x] **BAUTH-01**: Web app generates 5-minute connection code via POST /auth/extension-code
- [x] **BAUTH-02**: Extension exchanges code for 30-day JWT via POST /auth/extension-token
- [x] **BAUTH-03**: GET /auth/me validates token and returns user info
- [x] **BAUTH-04**: Extension code is single-use (invalidated after exchange)
- [x] **BAUTH-05**: Endpoints follow existing Clean Architecture patterns

### Backend Row Status

- [x] **BROW-01**: PATCH /projects/:projectId/batches/:batchId/rows/:rowId updates row status
- [x] **BROW-02**: Status field supports values: PENDING, VALID, ERROR
- [x] **BROW-03**: Optional errorMessage field stores failure reason
- [x] **BROW-04**: Ownership validation follows existing 404/403 pattern

### Extension Authentication

- [x] **AUTH-01**: User clicks "Connect" in popup to start auth flow
- [x] **AUTH-02**: Extension opens web app connection page in new tab
- [x] **AUTH-03**: User copies code from web app and pastes in extension
- [x] **AUTH-04**: Extension exchanges code for JWT and stores in chrome.storage.local
- [x] **AUTH-05**: Connection status indicator shows authenticated/disconnected state
- [x] **AUTH-06**: On 401 response, extension prompts user to reconnect

### Popup UI

- [x] **POP-01**: Project selector dropdown fetches and displays user's projects
- [x] **POP-02**: Batch selector dropdown fetches batches for selected project
- [x] **POP-03**: Row indicator shows current row number and total rows
- [x] **POP-04**: Fill button triggers form fill for current row
- [x] **POP-05**: Next button advances to next row after fill
- [x] **POP-06**: Stop button aborts ongoing fill operation
- [x] **POP-07**: Mapping indicator shows when current URL has available mapping
- [x] **POP-08**: State persists and restores when popup closes and reopens

### Content Script

- [x] **CS-01**: Selector engine finds elements via CSS selector
- [x] **CS-02**: Selector engine finds elements via XPath
- [x] **CS-03**: Fallback chain tries alternative selectors when primary fails
- [x] **CS-04**: Fill action populates input/textarea/select elements
- [x] **CS-05**: Fill action uses native setters to trigger React/Vue reactivity
- [x] **CS-06**: Click action clicks buttons and links
- [x] **CS-07**: Wait action pauses execution for specified duration
- [x] **CS-08**: Step executor processes steps in order and reports results

### Success Monitor

- [x] **SUCC-01**: URL change trigger detects when page navigates to success URL pattern
- [x] **SUCC-02**: Text appears trigger detects when success message appears on page
- [x] **SUCC-03**: Element disappears trigger detects when form/modal is removed
- [x] **SUCC-04**: Timeout prevents infinite waiting (configurable, default 30s)

### Fill Cycle Integration

- [x] **FILL-01**: Background detects URL change and checks for matching mappings
- [x] **FILL-02**: Background fetches mapping detail with steps for current URL
- [x] **FILL-03**: Background sends steps and row data to content script for execution
- [x] **FILL-04**: Content script reports fill success/failure to background
- [x] **FILL-05**: Background updates row status via API after fill attempt
- [x] **FILL-06**: Popup shows fill progress (current step, status)
- [x] **FILL-07**: Error state shows retry option for failed fills
- [x] **FILL-08**: User can manually advance to next row after verification

## Future Requirements

Deferred to subsequent milestones. Tracked but not in v4.0 roadmap.

### Polish & UX Enhancements

- **POL-01**: Keyboard shortcuts for fill (Ctrl+Shift+F) and next row (Ctrl+Shift+N)
- **POL-02**: Field highlighting during fill shows which field is being populated
- **POL-03**: Batch progress dashboard shows completed/remaining/failed counts
- **POL-04**: Step-level retry allows retrying individual failed steps
- **POL-05**: Auto-advance on success moves to next row without manual confirmation

### Advanced Features

- **ADV-01**: Auto-record mapping mode creates mappings by clicking fields
- **ADV-02**: Side panel UI provides persistent extension visibility
- **ADV-03**: Headless/background mode fills forms without user interaction
- **ADV-04**: Multi-tab orchestration fills forms across multiple tabs

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-advance rows without confirmation | COPILOTO mode requires manual verification |
| Batch progress bar with ETA | Polish feature, defer to v4.1 |
| Creating/editing mappings from extension | Dashboard responsibility, not extension |
| Smart field detection (auto-suggest) | High complexity, needs ML/training data |
| Multi-tab support | Race conditions, confusing UX |
| Overlay UI on target page | Significant complexity, popup sufficient for MVP |
| Export fill logs | Nice-to-have, not MVP |
| Offline mode | Data sync complexity, requires cache strategy |
| Direct data editing in extension | Two sources of truth problem |
| Undo fill | Requires DOM state capture, high complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | 24 | Complete |
| FOUND-02 | 24 | Complete |
| FOUND-03 | 24 | Complete |
| FOUND-04 | 24 | Complete |
| FOUND-05 | 24 | Complete |
| FOUND-06 | 24 | Complete |
| BAUTH-01 | 25 | Complete |
| BAUTH-02 | 25 | Complete |
| BAUTH-03 | 25 | Complete |
| BAUTH-04 | 25 | Complete |
| BAUTH-05 | 25 | Complete |
| BROW-01 | 25 | Complete |
| BROW-02 | 25 | Complete |
| BROW-03 | 25 | Complete |
| BROW-04 | 25 | Complete |
| AUTH-01 | 26 | Complete |
| AUTH-02 | 26 | Complete |
| AUTH-03 | 26 | Complete |
| AUTH-04 | 26 | Complete |
| AUTH-05 | 26 | Complete |
| AUTH-06 | 26 | Complete |
| POP-01 | 27 | Complete |
| POP-02 | 27 | Complete |
| POP-03 | 27 | Complete |
| POP-04 | 27 | Complete |
| POP-05 | 27 | Complete |
| POP-06 | 27 | Complete |
| POP-07 | 29 | Complete |
| POP-08 | 27 | Complete |
| CS-01 | 28 | Complete |
| CS-02 | 28 | Complete |
| CS-03 | 28 | Complete |
| CS-04 | 28 | Complete |
| CS-05 | 28 | Complete |
| CS-06 | 28 | Complete |
| CS-07 | 28 | Complete |
| CS-08 | 28 | Complete |
| SUCC-01 | 29 | Complete |
| SUCC-02 | 29 | Complete |
| SUCC-03 | 29 | Complete |
| SUCC-04 | 29 | Complete |
| FILL-01 | 29 | Complete |
| FILL-02 | 29 | Complete |
| FILL-03 | 29 | Complete |
| FILL-04 | 29 | Complete |
| FILL-05 | 29 | Complete |
| FILL-06 | 29 | Complete |
| FILL-07 | 29 | Complete |
| FILL-08 | 29 | Complete |

**Coverage:**
- v4.0 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0

---
*Requirements defined: 2026-02-03*
*Last updated: 2026-02-04 — Phase 29 requirements complete (all v4.0 requirements complete)*
