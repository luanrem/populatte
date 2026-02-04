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

- [ ] **POP-01**: Project selector dropdown fetches and displays user's projects
- [ ] **POP-02**: Batch selector dropdown fetches batches for selected project
- [ ] **POP-03**: Row indicator shows current row number and total rows
- [ ] **POP-04**: Fill button triggers form fill for current row
- [ ] **POP-05**: Next button advances to next row after fill
- [ ] **POP-06**: Stop button aborts ongoing fill operation
- [ ] **POP-07**: Mapping indicator shows when current URL has available mapping
- [ ] **POP-08**: State persists and restores when popup closes and reopens

### Content Script

- [ ] **CS-01**: Selector engine finds elements via CSS selector
- [ ] **CS-02**: Selector engine finds elements via XPath
- [ ] **CS-03**: Fallback chain tries alternative selectors when primary fails
- [ ] **CS-04**: Fill action populates input/textarea/select elements
- [ ] **CS-05**: Fill action uses native setters to trigger React/Vue reactivity
- [ ] **CS-06**: Click action clicks buttons and links
- [ ] **CS-07**: Wait action pauses execution for specified duration
- [ ] **CS-08**: Step executor processes steps in order and reports results

### Success Monitor

- [ ] **SUCC-01**: URL change trigger detects when page navigates to success URL pattern
- [ ] **SUCC-02**: Text appears trigger detects when success message appears on page
- [ ] **SUCC-03**: Element disappears trigger detects when form/modal is removed
- [ ] **SUCC-04**: Timeout prevents infinite waiting (configurable, default 30s)

### Fill Cycle Integration

- [ ] **FILL-01**: Background detects URL change and checks for matching mappings
- [ ] **FILL-02**: Background fetches mapping detail with steps for current URL
- [ ] **FILL-03**: Background sends steps and row data to content script for execution
- [ ] **FILL-04**: Content script reports fill success/failure to background
- [ ] **FILL-05**: Background updates row status via API after fill attempt
- [ ] **FILL-06**: Popup shows fill progress (current step, status)
- [ ] **FILL-07**: Error state shows retry option for failed fills
- [ ] **FILL-08**: User can manually advance to next row after verification

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
| POP-01 | 27 | Pending |
| POP-02 | 27 | Pending |
| POP-03 | 27 | Pending |
| POP-04 | 27 | Pending |
| POP-05 | 27 | Pending |
| POP-06 | 27 | Pending |
| POP-07 | 27 | Pending |
| POP-08 | 27 | Pending |
| CS-01 | 28 | Pending |
| CS-02 | 28 | Pending |
| CS-03 | 28 | Pending |
| CS-04 | 28 | Pending |
| CS-05 | 28 | Pending |
| CS-06 | 28 | Pending |
| CS-07 | 28 | Pending |
| CS-08 | 28 | Pending |
| SUCC-01 | 29 | Pending |
| SUCC-02 | 29 | Pending |
| SUCC-03 | 29 | Pending |
| SUCC-04 | 29 | Pending |
| FILL-01 | 29 | Pending |
| FILL-02 | 29 | Pending |
| FILL-03 | 29 | Pending |
| FILL-04 | 29 | Pending |
| FILL-05 | 29 | Pending |
| FILL-06 | 29 | Pending |
| FILL-07 | 29 | Pending |
| FILL-08 | 29 | Pending |

**Coverage:**
- v4.0 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0

---
*Requirements defined: 2026-02-03*
*Last updated: 2026-02-04 — Phase 26 requirements complete*
