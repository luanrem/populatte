# Feature Research: Chrome Extension Form-Filling MVP

**Domain:** Browser Extension for Form Auto-Fill (COPILOTO Mode)
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

This research covers UX patterns and features for Chrome extensions that fill web forms, specifically for Populatte's COPILOTO mode where the human drives (navigates, verifies, submits) while the extension assists (fills fields, executes steps).

**Key findings:**
1. **Popup vs Sidebar:** Use popup for MVP; closes on click-away but simpler to build. Side panel requires more surface area investment.
2. **State Persistence Critical:** Popup closes frequently; must restore context (project, batch, row) from chrome.storage on every open.
3. **Step-by-Step Feedback:** Users need to see what's being filled; progress indicators and field highlighting reduce anxiety.
4. **Error Recovery:** Retry mechanisms for individual steps; don't force restart of entire fill sequence.
5. **Authentication:** Clerk OAuth via launchWebAuthFlow; signInWithPopup not compatible with Manifest V3.

Research drew from competitor analysis (LastPass, Autofillr, QuickForm, Text Blaze), Chrome extension documentation, and form UX best practices.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project/Batch Selection | Users need to choose which data to use | LOW | Dropdown/list in popup; fetches from existing API endpoints |
| Form Fill Trigger | Core value prop - one-click form population | MEDIUM | Execute steps sequentially via content script; requires event dispatching for React/Vue forms |
| Visual Fill Progress | Users expect feedback during automated actions | LOW | Step-by-step indicator showing current action; badge update on extension icon |
| Success/Failure Feedback | Industry standard for any automation tool | LOW | Toast or status message after fill completes; distinguish partial vs complete success |
| Row Navigation (Next/Previous) | Batch processing requires moving between records | LOW | Simple controls to advance to next row; update badge with remaining count |
| Connection Status Indicator | Users need to know if extension can talk to API | LOW | Red/green indicator; clear messaging when disconnected |
| Manual Login Flow | Authentication required for API access | MEDIUM | Clerk integration via offscreen document or launchWebAuthFlow for OAuth |
| Step Execution Feedback | Users need to see what's being filled | MEDIUM | Highlight current field being filled; show step name and progress |
| Error Recovery Options | When fill fails, users need recourse | MEDIUM | Retry button, skip step option, manual fallback instructions |
| State Persistence | Popup closes on click-away; must remember context | MEDIUM | chrome.storage.local for selected project/batch/row; restore on popup reopen |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not expected, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Mapping Auto-Detection | Know when user is on a mapped target URL | LOW | Compare current tab URL with project mappings; highlight available mappings |
| Step-Level Retry | Retry individual failed steps without restarting entire fill | LOW | Per-step retry button in error state; existing backend supports step isolation |
| Field Highlighting | Visual feedback showing which field is being filled | MEDIUM | Content script injects highlight styles; helps user follow automation |
| Keyboard Shortcuts | Power users expect keyboard-driven workflow | LOW | Ctrl+Shift+F to fill, Ctrl+Shift+N for next row; configurable |
| Batch Progress Summary | Overview of completed/remaining/failed rows | LOW | Simple counter (15/50 complete, 2 failed); visible in popup header |
| Pause/Resume Fill | Stop mid-fill for manual intervention | MEDIUM | State machine in content script; user can pause, fix, resume |
| Success Trigger Detection | Auto-advance when form submission detected | MEDIUM | Use existing Mapping.successTrigger (url_change, text_appears, element_disappears) |
| Selector Fallback Chain | Robust element finding when DOM varies | LOW | Already built into Step.selectorFallbacks; content script tries each until match |
| Optional Step Handling | Skip non-critical steps gracefully | LOW | Already supported via Step.optional flag; content script respects it |
| Clear Before Fill | Handle pre-populated fields | LOW | Already supported via Step.clearBefore flag; select all + delete before typing |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in MVP scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-Record Mapping Mode | "Let me click fields and create mappings" | Core complexity; requires sophisticated DOM analysis, selector generation, storage sync | Defer to v2; use dashboard mapping UI for MVP |
| AI Field Detection | "Automatically figure out what goes where" | Unreliable without training data; false positives worse than no automation | Use explicit step mappings created in dashboard |
| Full Sidebar UI | "I want the extension always visible" | Significant additional surface area; increases maintenance burden 3x | Use popup for MVP; side panel for v2 if validated |
| Multi-Tab Orchestration | "Fill forms in multiple tabs simultaneously" | Race conditions, memory management, confusing UX | Single-tab focus for MVP; clear "active tab" indicator |
| Offline Mode | "Work without internet" | Data sync complexity; conflict resolution; cache invalidation | Require connection; clear offline messaging |
| Direct Data Editing | "Let me fix data in the extension" | Sync conflicts with dashboard; two sources of truth | Read-only display; edit in dashboard, refresh in extension |
| Undo Fill | "Revert the form to previous state" | Requires capturing entire DOM state before fill; significant complexity | Manual clear/refresh; or use browser's undo |
| Background Auto-Fill | "Fill forms automatically when I open pages" | Invasive UX; user loses control; potential data entry on wrong sites | Always require explicit user trigger |
| Custom JavaScript Actions | "Let me write code for complex fills" | Security nightmare; support burden; user education | Use fixed step types (fill, click, wait, verify) |

---

## Feature Dependencies

```
[Authentication]
    |--enables--> [Project/Batch Selection]
                       |--enables--> [Row Selection]
                                          |--enables--> [Form Fill]
                                                            |--enables--> [Success Trigger Detection]
                                                                              |--enables--> [Auto Next Row]

[State Persistence]
    |--enhances--> [Project/Batch Selection] (restore after popup close)
    |--enhances--> [Row Selection] (remember position in batch)

[Connection Status]
    |--enables--> [Authentication]
    |--enables--> [Data Fetching]

[Content Script Injection]
    |--enables--> [Form Fill]
    |--enables--> [Field Highlighting]
    |--enables--> [Success Trigger Detection]

[Mapping Auto-Detection]
    |--enhances--> [Form Fill] (shows available mapping for current URL)
    |--conflicts with--> [Multi-Tab] (which tab is "active"?)

[Visual Fill Progress]
    |--requires--> [Form Fill]
    |--requires--> [Content Script Injection]
```

### Dependency Notes

- **Authentication enables everything:** No API access without login; critical path
- **State Persistence enables good UX:** Without it, every popup open starts fresh
- **Content Script is the execution layer:** All form interaction happens here
- **Mapping Auto-Detection requires tab URL access:** Uses chrome.tabs.query for current URL
- **Success Trigger Detection requires page observation:** MutationObserver for element changes, URL listeners for navigation

---

## MVP Definition

### Launch With (v1)

Minimum viable product for COPILOTO mode - human drives, extension assists.

- [x] **Authentication Flow** - Login with Clerk; store token securely
- [x] **Project Selection** - Dropdown of user's projects from API
- [x] **Batch Selection** - Dropdown of batches for selected project
- [x] **Row Navigation** - Next/Previous/Jump-to-row controls
- [x] **Mapping Detection** - Show available mapping when on target URL
- [x] **Form Fill Execution** - Execute steps sequentially on current page
- [x] **Visual Progress** - Show current step during fill; badge with count
- [x] **Success/Error Feedback** - Clear messaging on fill completion
- [x] **State Persistence** - Remember context across popup sessions
- [x] **Connection Status** - Visual indicator of API connectivity

### Add After Validation (v1.x)

Features to add once core COPILOTO flow is validated with users.

- [ ] **Keyboard Shortcuts** - Trigger: users request faster workflow
- [ ] **Field Highlighting** - Trigger: users struggle to follow what's being filled
- [ ] **Pause/Resume Fill** - Trigger: users need to intervene mid-fill
- [ ] **Step-Level Retry** - Trigger: users complain about restarting entire fill on failure
- [ ] **Auto-Advance on Success** - Trigger: users validate successTrigger works reliably
- [ ] **Batch Progress Dashboard** - Trigger: users processing large batches want overview

### Future Consideration (v2+)

Features to defer until COPILOTO mode is validated and adoption grows.

- [ ] **Side Panel UI** - Defer until popup limitations validated as problem
- [ ] **AI Smart Mapping** - Defer until we have mapping data to train on
- [ ] **Recording Mode** - Defer; significant complexity; dashboard mapping sufficient for MVP
- [ ] **Multi-Form Orchestration** - Defer; single-page focus proves concept first
- [ ] **AUTONOMO Mode** - Defer; COPILOTO must work reliably before automating further

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Authentication Flow | HIGH | MEDIUM | P1 (v1) |
| Project/Batch Selection | HIGH | LOW | P1 (v1) |
| Row Navigation | HIGH | LOW | P1 (v1) |
| Form Fill Execution | HIGH | MEDIUM | P1 (v1) |
| State Persistence | HIGH | LOW | P1 (v1) |
| Connection Status | MEDIUM | LOW | P1 (v1) |
| Visual Progress | MEDIUM | LOW | P1 (v1) |
| Mapping Detection | MEDIUM | LOW | P1 (v1) |
| Success/Error Feedback | HIGH | LOW | P1 (v1) |
| Keyboard Shortcuts | MEDIUM | LOW | P2 (v1.x) |
| Field Highlighting | MEDIUM | MEDIUM | P2 (v1.x) |
| Pause/Resume | LOW | MEDIUM | P2 (v1.x) |
| Step-Level Retry | MEDIUM | LOW | P2 (v1.x) |
| Auto-Advance | MEDIUM | MEDIUM | P2 (v1.x) |
| Side Panel UI | LOW | HIGH | P3 (v2+) |
| Recording Mode | HIGH | HIGH | P3 (v2+) |
| AI Smart Mapping | MEDIUM | HIGH | P3 (v2+) |

**Priority key:**
- P1: Must have for MVP launch
- P2: Should have, add in v1.x based on user feedback
- P3: Nice to have, requires validation before investment

---

## Competitor Feature Analysis

| Feature | LastPass/1Password | Autofillr | QuickForm | Our Approach (Populatte) |
|---------|-------------------|-----------|-----------|--------------------------|
| Data Source | User-entered profiles | AI-detected context | Manual templates | Excel batch data via API |
| Field Mapping | Auto-detect (credentials only) | AI context mapping | Manual rule-based | Explicit step definitions in dashboard |
| Multi-Step Forms | Limited | Yes (AI-driven) | Template-based | Full step orchestration (fill/click/wait/verify) |
| Batch Processing | No | No | No | Yes - core differentiator |
| Progress Tracking | No | No | No | Yes - row-by-row status |
| Error Handling | Simple retry | AI correction | Manual fix | Step-level retry with fallback selectors |
| Authentication | Built-in vault | None | None | Clerk OAuth integration |
| Target Audience | Individual users | Individual users | Developers/testers | B2B teams with bulk data |

**Our Differentiators:**
1. **Batch Data Source**: Competitors fill from user profiles; we fill from uploaded Excel data
2. **Step Orchestration**: Most autofill tools are simple field->value; we support multi-step workflows (fill, click, wait, verify)
3. **Progress Tracking**: Unique ability to track which rows are complete across batch
4. **B2B Focus**: Team-oriented (shared projects) vs individual consumer tools
5. **Explicit Mappings**: Predictable behavior from dashboard-defined steps vs "AI magic"

---

## Backend Dependencies

The extension MVP depends on these existing backend features.

### Already Built (Ready to Consume)

| API Endpoint | Extension Use |
|--------------|---------------|
| `GET /projects` | Project selection dropdown |
| `GET /projects/:id` | Project details with mappings |
| `GET /batches` | Batch selection for project |
| `GET /batches/:id/rows` | Row data for fill operations |
| `GET /mappings/:id` | Mapping details with steps |
| `GET /mappings/:id/steps` | Step definitions for execution |

### Entity Properties Used

**Mapping:**
- `targetUrl` - Match against current tab URL
- `successTrigger` - Detect form submission success
- `successConfig.selector` - Element to watch for success

**Step:**
- `action` - fill/click/wait/verify
- `selector` - Primary CSS/XPath selector
- `selectorFallbacks` - Backup selectors if primary fails
- `sourceFieldKey` - Key in row data for fill value
- `fixedValue` - Static value if no sourceFieldKey
- `optional` - Skip on failure without failing entire fill
- `clearBefore` - Clear field before typing
- `pressEnter` - Submit after fill
- `waitMs` - Delay after action

### May Need to Add

| Feature | Backend Change |
|---------|----------------|
| Row status update | `PATCH /rows/:id` with status (pending/complete/failed) |
| Batch progress summary | `GET /batches/:id/progress` returning counts |
| Extension-specific auth token | Clerk token works, but may need refresh endpoint |

---

## UX Patterns to Follow

### Popup Layout Structure

```
+-------------------------------------+
| [Logo]  Populatte     [*] Connected |  <- Header with status
+---------+---------------------------+
| Project: [Dropdown v]               |  <- Selection area
| Batch:   [Dropdown v]               |
| Row:     [< 15/50 >]                |  <- Navigation
+---------+---------------------------+
| +-----------------------------------+
| | Mapping: "IRPF 2025"              |  <- Current context
| | Target: receita.gov.br/*          |
| | Status: Ready to fill             |
| +-----------------------------------+
+---------+---------------------------+
|       [ Start Fill ]                |  <- Primary action
|                                     |
| [ Skip Row ]        [ Mark Done ]   |  <- Secondary actions
+-------------------------------------+
```

### Progress Feedback Pattern

```
During Fill:
+-------------------------------------+
| Filling form... (3/8 steps)         |
| ████████░░░░░░░░ 37%                |
|                                     |
| Current: Filling CPF field          |
|                                     |
|         [ Pause ]  [ Cancel ]       |
+-------------------------------------+

On Success:
+-------------------------------------+
| [check] Form filled successfully!   |
|                                     |
| 8/8 steps completed                 |
|                                     |
| [ Next Row ]      [ Stay Here ]     |
+-------------------------------------+

On Error:
+-------------------------------------+
| [x] Fill incomplete (5/8 steps)     |
|                                     |
| Failed: Could not find CNPJ field   |
| Selector: #txtCnpj                  |
|                                     |
| [ Retry ]  [ Skip Step ]  [ Cancel ]|
+-------------------------------------+
```

### State Management Pattern

```javascript
// chrome.storage.local structure:
{
  "auth": {
    "token": "clerk_token...",
    "expiresAt": 1706900000000
  },
  "session": {
    "selectedProjectId": "proj_123",
    "selectedBatchId": "batch_456",
    "currentRowIndex": 14,
    "lastMappingId": "map_789"
  },
  "fillState": {
    "inProgress": false,
    "currentStep": 0,
    "totalSteps": 8,
    "errors": []
  }
}
```

---

## Implementation Recommendations

### Phase 1: Foundation (Extension Scaffold)
1. Create extension with Manifest V3, React, Vite (CRXJS)
2. Implement popup with basic UI shell
3. Set up chrome.storage for state persistence
4. Implement background service worker for state management

### Phase 2: Authentication
1. Integrate Clerk OAuth via launchWebAuthFlow or offscreen document
2. Store token securely in chrome.storage.session
3. Implement connection status indicator
4. Handle token refresh

### Phase 3: Data Layer
1. Connect to existing API endpoints
2. Implement project/batch/row selection
3. Cache data locally for popup performance
4. Handle offline/error states

### Phase 4: Content Script Execution
1. Inject content script on mapped target URLs
2. Implement step executor (fill/click/wait/verify)
3. Handle event dispatching for framework compatibility
4. Implement selector fallback chain

### Phase 5: UX Polish
1. Visual progress indicators
2. Success/error feedback
3. Keyboard shortcuts
4. Badge updates
5. Field highlighting (P2)

---

## Technical Patterns

### Content Script Form Filling

For React/Vue/Angular forms, setting `input.value` directly doesn't trigger framework reactivity. Must dispatch events:

```javascript
function fillField(element, value) {
  // Clear if configured
  element.select();
  document.execCommand('delete');

  // Set value
  element.value = value;

  // Dispatch events for framework reactivity
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}
```

### Selector Fallback Chain

```javascript
function findElement(step) {
  // Try primary selector
  let element = querySelector(step.selector);
  if (element) return element;

  // Try fallbacks
  for (const fallback of step.selectorFallbacks) {
    element = querySelector(fallback);
    if (element) return element;
  }

  // If optional step, return null gracefully
  if (step.optional) return null;

  throw new StepError(`Element not found: ${step.selector.value}`);
}

function querySelector(selector) {
  if (selector.type === 'css') {
    return document.querySelector(selector.value);
  } else if (selector.type === 'xpath') {
    return document.evaluate(
      selector.value,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }
}
```

### MutationObserver for Success Detection

```javascript
function watchForSuccessTrigger(mapping) {
  if (mapping.successTrigger === 'url_change') {
    // Listen for navigation
    const originalUrl = window.location.href;
    const interval = setInterval(() => {
      if (window.location.href !== originalUrl) {
        clearInterval(interval);
        onFillSuccess();
      }
    }, 100);
  } else if (mapping.successTrigger === 'element_disappears') {
    const element = document.querySelector(mapping.successConfig.selector);
    if (!element) return;

    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        observer.disconnect();
        onFillSuccess();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else if (mapping.successTrigger === 'text_appears') {
    const observer = new MutationObserver(() => {
      if (document.body.innerText.includes(mapping.successConfig.text)) {
        observer.disconnect();
        onFillSuccess();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
```

---

## Sources

**Autofill Extension Research:**
- [5 Best Autofill Chrome Extensions in 2026](https://blaze.today/blog/autofill-chrome-extensions/)
- [Top 10 Best Auto Fill Extension Plugins for Chrome in 2026](https://thunderbit.com/blog/best-auto-fill-extension-chrome)
- [Fill Forms Faster: The 9 Best Autofill Chrome Extensions](https://www.getmagical.com/blog/best-autofill-chrome-extensions)

**Chrome Extension Development:**
- [User interface components | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/ui)
- [State Storage in Chrome Extensions: Options, Limits, and Best Practices](https://hackernoon.com/state-storage-in-chrome-extensions-options-limits-and-best-practices)
- [Building persistent Chrome Extension using Manifest V3](https://rahulnegi20.medium.com/building-persistent-chrome-extension-using-manifest-v3-198000bf1db6)

**Form Filling Patterns:**
- [Detect DOM changes with mutation observers | Chrome for Developers](https://developer.chrome.com/blog/detect-dom-changes-with-mutation-observers)
- [GitHub - holyjak/Testofill-chrome-extension](https://github.com/holyjak/Testofill-chrome-extension)
- [GitHub - form-o-fill/form-o-fill-chrome-extension](https://github.com/form-o-fill/form-o-fill-chrome-extension)

**Error Handling UX:**
- [Error Message UX, Handling & Feedback](https://www.pencilandpaper.io/articles/ux-pattern-analysis-error-feedback)
- [Designing Better Error Messages UX](https://www.smashingmagazine.com/2022/08/error-messages-ux-design/)
- [12 Form UI/UX Design Best Practices to Follow in 2026](https://www.designstudiouiux.com/blog/form-ux-design-best-practices/)

**Authentication:**
- [Signing in users from a Chrome extension | Google Cloud](https://docs.cloud.google.com/identity-platform/docs/web/chrome-extension)
- [chrome.identity API | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Authenticate with Firebase in a Chrome extension](https://firebase.google.com/docs/auth/web/chrome-extension)

---
*Feature research for: Chrome Extension Form-Filling MVP (COPILOTO Mode)*
*Researched: 2026-02-03*
