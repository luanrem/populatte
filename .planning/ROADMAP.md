# Roadmap: Populatte v4.0 Extension Core

## Overview

This roadmap delivers the Chrome Extension MVP with COPILOTO mode — a manual row-advancement workflow where users fill forms from Excel data and confirm success before proceeding. The journey starts with extension infrastructure (WXT + Manifest V3), establishes backend support (extension auth + row status), implements auth flow and popup controls, builds the DOM manipulation layer, and culminates in the integrated fill cycle that orchestrates all components.

## Milestones

- 📋 **v4.0 Extension Core** - Phases 24-29 (current)

## Phases

**Phase Numbering:**
- Integer phases (24, 25, 26...): Planned milestone work
- Decimal phases (25.1, 25.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 24: Extension Foundation** - WXT scaffold, storage abstraction, message bus, type integration
- [x] **Phase 25: Backend Extensions** - Extension auth endpoints, row status tracking
- [ ] **Phase 26: Extension Auth Flow** - Connection code exchange, token storage, auth UI
- [ ] **Phase 27: Popup UI** - Project/batch selectors, row navigation, fill controls
- [ ] **Phase 28: Content Script** - Selector engine (CSS/XPath), step executor, DOM manipulation
- [ ] **Phase 29: Fill Cycle Integration** - Mapping detection, step orchestration, success monitoring

## Phase Details

### Phase 24: Extension Foundation
**Goal**: Extension loads in Chrome with working infrastructure for storage, messaging, and shared types
**Depends on**: Nothing (first phase of milestone)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Extension loads in Chrome developer mode without errors
  2. Service worker initializes and responds to basic messages
  3. Popup opens and renders React UI
  4. Storage operations persist and retrieve data across popup closes
  5. TypeScript compilation succeeds with @populatte/types integration
**Plans**: 3 plans

Plans:
- [x] 24-01-PLAN.md — WXT scaffold with React popup, background, and content script
- [x] 24-02-PLAN.md — Storage abstraction layer with typed accessors
- [x] 24-03-PLAN.md — Type-safe message bus between all contexts

### Phase 25: Backend Extensions
**Goal**: API supports extension authentication and row status tracking
**Depends on**: Nothing (parallel with Phase 24)
**Requirements**: BAUTH-01, BAUTH-02, BAUTH-03, BAUTH-04, BAUTH-05, BROW-01, BROW-02, BROW-03, BROW-04
**Success Criteria** (what must be TRUE):
  1. Web app can generate a connection code that expires in 5 minutes
  2. Extension can exchange valid code for 30-day JWT (code becomes invalid after use)
  3. Extension can validate token and retrieve user info via /auth/me
  4. Extension can update row status to PENDING, VALID, or ERROR with optional message
  5. All endpoints follow existing ownership validation patterns
**Plans**: 2 plans

Plans:
- [x] 25-01-PLAN.md — Extension auth infrastructure and endpoints (code generation, JWT exchange, /auth/me)
- [x] 25-02-PLAN.md — Row status update endpoint with ownership validation

### Phase 26: Extension Auth Flow
**Goal**: Users can authenticate the extension via connection code from web app
**Depends on**: Phase 24, Phase 25
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User sees "Connect" button in disconnected state
  2. Clicking Connect opens web app connection page in new tab
  3. User can paste code from web app and extension validates it
  4. After successful auth, extension shows authenticated state with user indicator
  5. On 401 response, extension clears token and prompts reconnection
**Plans**: 2 plans

Plans:
- [ ] 26-01-PLAN.md — Background auth handler and API client layer
- [ ] 26-02-PLAN.md — Auth UI components with connect flow

### Phase 27: Popup UI
**Goal**: Users can select project, batch, and navigate rows with fill controls
**Depends on**: Phase 26
**Requirements**: POP-01, POP-02, POP-03, POP-04, POP-05, POP-06, POP-07, POP-08
**Success Criteria** (what must be TRUE):
  1. Project dropdown loads and displays user's projects from API
  2. Batch dropdown filters by selected project and shows batch list
  3. Row indicator shows current position (e.g., "Row 3 of 150")
  4. Fill/Next/Stop buttons enable based on current state
  5. Selections persist when popup closes and restore on reopen
**Plans**: TBD

Plans:
- [ ] 27-01: TBD

### Phase 28: Content Script
**Goal**: Content script can find elements and execute fill/click/wait actions on any page
**Depends on**: Phase 24
**Requirements**: CS-01, CS-02, CS-03, CS-04, CS-05, CS-06, CS-07, CS-08
**Success Criteria** (what must be TRUE):
  1. Selector engine finds elements via CSS selectors
  2. Selector engine finds elements via XPath expressions
  3. When primary selector fails, engine tries fallback selectors in order
  4. Fill action populates inputs/textareas/selects and triggers framework reactivity
  5. Step executor processes ordered steps and reports success/failure per step
**Plans**: TBD

Plans:
- [ ] 28-01: TBD

### Phase 29: Fill Cycle Integration
**Goal**: Complete fill-to-confirm cycle where user fills form, verifies, and advances to next row
**Depends on**: Phase 27, Phase 28
**Requirements**: SUCC-01, SUCC-02, SUCC-03, SUCC-04, FILL-01, FILL-02, FILL-03, FILL-04, FILL-05, FILL-06, FILL-07, FILL-08
**Success Criteria** (what must be TRUE):
  1. Background detects when user navigates to mapped URL and shows mapping indicator
  2. Clicking Fill executes all steps for current row and updates popup with progress
  3. Success monitor detects form submission via configured trigger (URL/text/element)
  4. Row status updates to VALID or ERROR in database after fill attempt
  5. User can manually advance to next row after verifying fill success
**Plans**: TBD

Plans:
- [ ] 29-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 24 → 25 → 26 → 27 → 28 → 29

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 24. Extension Foundation | 3/3 | ✓ Complete | 2026-02-03 |
| 25. Backend Extensions | 2/2 | ✓ Complete | 2026-02-03 |
| 26. Extension Auth Flow | 0/2 | Not started | - |
| 27. Popup UI | 0/TBD | Not started | - |
| 28. Content Script | 0/TBD | Not started | - |
| 29. Fill Cycle Integration | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-03*
*Last updated: 2026-02-03 — Phase 26 planned (2 plans)*
