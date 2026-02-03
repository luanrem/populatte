# Pitfalls Research

**Domain:** Chrome Extension Manifest V3 for Form Automation
**Researched:** 2026-02-03
**Confidence:** HIGH (verified via official Chrome documentation and community reports)

## Critical Pitfalls

### Pitfall 1: Service Worker State Loss on Termination

**What goes wrong:**
Service worker terminates after 30 seconds of inactivity, losing all in-memory state including global variables, pending operations, and connection references. Extension appears "dead" when user returns after idle period. Auth tokens stored in variables disappear, API calls fail silently, form-filling operations abort mid-execution.

**Why it happens:**
Manifest V3 enforces event-driven architecture. Developers coming from MV2 background pages (persistent) assume service workers stay alive. Chrome terminates service workers aggressively for memory efficiency: 30 seconds idle, 5 minutes max for single request, 30 seconds for fetch response.

**How to avoid:**
1. **Never use global variables for state** - Use `chrome.storage.session` for sensitive data (in-memory, cleared on browser close), `chrome.storage.local` for persistent data
2. **Re-establish state on wake** - Register `chrome.runtime.onStartup` and `chrome.runtime.onInstalled` listeners at top level (synchronously) to restore state
3. **Use Alarms API instead of setTimeout/setInterval** - `chrome.alarms.create()` survives termination
4. **Keep service worker alive during critical operations** - WebSocket connections, port connections, and native messaging extend lifetime

**Warning signs:**
- "Service worker has not loaded fully" error appearing after extension idle for hours
- Auth tokens work immediately after login but fail later
- Form filling works once then stops working
- Console shows service worker repeatedly installing

**Phase to address:**
Phase 1 (Extension Foundation) - Establish state management pattern before any feature development

---

### Pitfall 2: Asynchronous Event Listener Registration

**What goes wrong:**
Event listeners registered inside promises, callbacks, or async functions are NOT guaranteed to work. When service worker wakes to handle an event, synchronously registered listeners execute, but async-registered listeners may not exist yet. Events fire into the void, extension appears unresponsive.

**Why it happens:**
Service workers reinitialize on each wake-up. The event fires BEFORE async code completes listener registration. This is documented behavior but counterintuitive to developers used to traditional JavaScript patterns.

**How to avoid:**
```javascript
// BAD - listener may miss events after service worker restart
async function init() {
  const config = await loadConfig();
  chrome.runtime.onMessage.addListener(handleMessage); // Too late!
}
init();

// GOOD - register listeners synchronously at top level
chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onInstalled.addListener(handleInstall);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleSpaNav);

// Async initialization can happen inside the handlers
async function handleMessage(message, sender, sendResponse) {
  const config = await loadConfig(); // OK here
  // ...
  return true; // Required for async sendResponse
}
```

**Warning signs:**
- Events work during development (service worker hot) but fail in production (cold starts)
- Intermittent message delivery failures
- "Receiving end does not exist" errors

**Phase to address:**
Phase 1 (Extension Foundation) - Code review checklist must verify all event listeners are at top level

---

### Pitfall 3: Content Script Cannot Access Page's JavaScript Context

**What goes wrong:**
Content script tries to read React component state, call page functions, or access window variables - all return undefined. Extension cannot detect if form submission succeeded by listening to page's custom events. React controlled inputs don't respond to simple `input.value = x` assignments.

**Why it happens:**
Content scripts run in "isolated worlds" - they share the DOM but NOT the JavaScript context with the page. This is a security feature preventing malicious extensions from tampering with page logic, but it complicates form automation.

**How to avoid:**
1. **For reading page state:** Inject a script into page's main world, communicate via DOM events
2. **For React/Vue/Angular forms:** Use native property setters to bypass framework's value tracking:
```javascript
// React controlled input - standard assignment doesn't work
input.value = 'test'; // React ignores this

// Use native setter to bypass React's descriptor
const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set;
nativeSetter.call(input, 'test value');
input.dispatchEvent(new Event('input', { bubbles: true }));
```
3. **For checkboxes/radios:** Use `click` event instead of `change` after setting `checked` property
4. **For detecting form submission:** Use `MutationObserver` on DOM changes, URL monitoring via `webNavigation.onHistoryStateUpdated`

**Warning signs:**
- Form values appear in input but React/Vue state doesn't update
- Form submission validation fails despite visible values
- `typeof window.somePageVariable` returns undefined in content script
- Page's custom events never fire in content script listener

**Phase to address:**
Phase 4 (Content Script + Selector Engine) - Core form-filling logic must use native setters

---

### Pitfall 4: Message Passing Response Lost Due to Missing `return true`

**What goes wrong:**
Content script sends message to service worker, service worker does async work, content script never receives response. `chrome.runtime.lastError` shows "The message port closed before a response was received."

**Why it happens:**
`chrome.runtime.onMessage` listeners must explicitly return `true` to indicate async response. Without it, Chrome assumes synchronous handling and closes the message channel immediately. Over 70% of MV3 messaging bugs stem from this issue.

**How to avoid:**
```javascript
// BAD - response channel closes before async completes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then(data => sendResponse(data)); // Never received!
});

// GOOD - return true keeps channel open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then(data => sendResponse(data));
  return true; // CRITICAL: keeps message channel open for async response
});
```

**Warning signs:**
- sendResponse callback never executes despite being called
- "The message port closed before a response was received" in console
- Async operations complete successfully but caller hangs

**Phase to address:**
Phase 2 (Auth Flow) - Message passing patterns established early, code review enforces `return true`

---

### Pitfall 5: Popup State Resets on Every Open

**What goes wrong:**
User selects project, batch, mapping in popup, clicks somewhere else, popup closes. User reopens popup - all selections gone, user must start over. Feels like extension "forgot" everything.

**Why it happens:**
Popup HTML reloads completely on each open - it's not a persistent tab. All JavaScript state, scroll positions, form inputs are lost. This is fundamental Chrome behavior, not a bug.

**How to avoid:**
1. **Persist popup state to storage:**
```javascript
// Save state on every change
chrome.storage.session.set({
  selectedProjectId: '...',
  selectedBatchId: '...',
  currentRowIndex: 0
});

// Restore state on popup open
chrome.storage.session.get(['selectedProjectId', 'selectedBatchId'], (state) => {
  // Rehydrate UI from stored state
});
```
2. **Consider sidebar panel instead of popup** - Sidebars persist while tab is open (use `chrome.sidePanel` API)
3. **Move critical UI to content script overlay** - Injected UI persists with the page

**Warning signs:**
- Users complaining about "losing progress"
- QA reports needing to re-select project/batch repeatedly
- Popup feels "stateless" in user testing

**Phase to address:**
Phase 3 (Popup UI) - State persistence must be designed into popup from start

---

### Pitfall 6: Shadow DOM and iframes Block Form Element Access

**What goes wrong:**
Content script's `document.querySelector()` finds nothing, even though element is visible on page. Extension cannot fill forms embedded in iframes or inside web components using Shadow DOM. Government portals and enterprise apps frequently use these patterns.

**Why it happens:**
Shadow DOM creates encapsulated DOM trees invisible to external queries. Cross-origin iframes have separate document contexts inaccessible to parent content scripts. Many modern UI libraries (Angular Material, Salesforce Lightning) use Shadow DOM heavily.

**How to avoid:**
1. **For Shadow DOM:**
```javascript
// Recursively search through shadow roots
function deepQuerySelector(root, selector) {
  const result = root.querySelector(selector);
  if (result) return result;

  const shadows = root.querySelectorAll('*');
  for (const el of shadows) {
    if (el.shadowRoot) {
      const found = deepQuerySelector(el.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}
```
2. **For same-origin iframes:** Inject content script into iframe via `all_frames: true` in manifest
3. **For cross-origin iframes:** Cannot access directly - must communicate via `postMessage` if iframe cooperates, otherwise form filling is impossible
4. **Use tools like SelectorsHub** to detect shadow DOM boundaries during mapping creation

**Warning signs:**
- Selectors that work in DevTools fail in content script
- Forms on government/enterprise sites consistently fail
- User reports "element exists but extension can't find it"

**Phase to address:**
Phase 4 (Selector Engine) - Build shadow DOM traversal into selector engine from start

---

### Pitfall 7: SPA Navigation Not Detected by Traditional Methods

**What goes wrong:**
Extension detects initial page load correctly but misses subsequent navigation in single-page apps (React Router, Vue Router, Angular). User navigates to form page via SPA routing, extension doesn't inject content script or detect mapping match.

**Why it happens:**
SPAs use `history.pushState`/`replaceState` instead of full page loads. Standard `chrome.tabs.onUpdated` with `changeInfo.status === 'complete'` only fires on full navigation. Content scripts injected at `document_idle` don't re-run on SPA route changes.

**How to avoid:**
1. **Use `webNavigation.onHistoryStateUpdated`** in service worker:
```javascript
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  // Fires on pushState/replaceState
  checkMappingMatch(details.url, details.tabId);
});
```
2. **In content script, monitor URL changes:**
```javascript
// Listen to browser history events
window.addEventListener('popstate', handleUrlChange);

// For pushState (not captured by popstate), use MutationObserver or interval
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    handleUrlChange();
  }
}).observe(document, { subtree: true, childList: true });
```
3. **Consider Navigation API** (Chrome 102+) for modern SPAs

**Warning signs:**
- Extension works on direct URL access but not when navigating within app
- "No mapping found" when mapping definitely exists for current URL
- Forms work on page refresh but not after SPA navigation

**Phase to address:**
Phase 4 (Content Script) - URL monitoring must handle both traditional and SPA navigation

---

### Pitfall 8: Content Script CORS Restrictions

**What goes wrong:**
Content script makes `fetch()` call to extension's backend API, browser blocks with CORS error. Same fetch works in popup and service worker but fails in content script.

**Why it happens:**
As of Chrome 73+, content scripts are subject to the same CORS restrictions as the page they run in. This was a security change - previously content scripts inherited extension's permissions. Extension pages (popup, options, service worker) still bypass CORS.

**How to avoid:**
1. **Route API calls through service worker:**
```javascript
// Content script - send message to service worker
const data = await chrome.runtime.sendMessage({
  type: 'API_CALL',
  endpoint: '/api/mappings',
  method: 'GET'
});

// Service worker - make actual API call
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'API_CALL') {
    fetch(API_BASE + msg.endpoint, { method: msg.method })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
```
2. **Alternative:** Configure backend to allow extension origin in CORS headers (requires knowing extension ID in production)

**Warning signs:**
- API calls work in popup but fail in content script with CORS error
- "Access to fetch blocked by CORS policy" in console
- Network tab shows request with `Origin: https://some-website.com` instead of extension origin

**Phase to address:**
Phase 2 (Auth + API Client) - Establish API call pattern through service worker relay

---

### Pitfall 9: `localStorage` and `sessionStorage` Unavailable in Service Worker

**What goes wrong:**
Developer uses `localStorage.setItem()` in service worker, code throws error "localStorage is not defined." Auth library that relies on localStorage fails to initialize.

**Why it happens:**
Service workers are designed to be stateless and run without DOM context. Web Storage APIs (`localStorage`, `sessionStorage`) require window/document context. This catches developers migrating from MV2 background pages.

**How to avoid:**
1. **Use `chrome.storage.local`** instead of localStorage (persistent, 10MB limit, can request unlimited)
2. **Use `chrome.storage.session`** instead of sessionStorage (in-memory, 10MB limit, cleared on browser restart)
3. **Wrap storage access for service worker compatibility:**
```javascript
const storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }
};
```

**Warning signs:**
- "localStorage is not defined" in service worker console
- Auth libraries failing to initialize
- State that works in popup fails in service worker

**Phase to address:**
Phase 1 (Extension Foundation) - Establish storage abstraction layer before any feature code

---

### Pitfall 10: Port Disconnection During Long Operations

**What goes wrong:**
Extension establishes port connection for streaming updates during form filling. Service worker terminates mid-operation (30-second idle or 5-minute max), port disconnects, content script receives no more updates, user sees operation "freeze" with no feedback.

**Why it happens:**
Port connections keep service worker alive BUT if nothing passes through the port for 30 seconds, Chrome may still terminate. Also, the 5-minute hard limit applies even with active connections in some scenarios.

**How to avoid:**
1. **Send keepalive pings through the port:**
```javascript
// Service worker side
setInterval(() => {
  port.postMessage({ type: 'KEEPALIVE' });
}, 25000); // Every 25 seconds, under 30-second timeout
```
2. **Use chrome.alarms for long operations** - Chunk work into alarm-triggered batches
3. **Store operation progress** - If terminated, resume from last saved state on wake
4. **Design for interruption** - Every operation should be resumable

**Warning signs:**
- Long-running operations (100+ form fields) fail partway through
- Console shows "Attempting to use a disconnected port object"
- Operations work for small batches but fail for large ones

**Phase to address:**
Phase 5 (Fill Cycle) - Build resumable operations with progress checkpointing

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing auth tokens in service worker globals | Simple, fast access | Tokens lost on termination, users forced to re-auth | Never |
| Using `setTimeout` instead of `chrome.alarms` | Familiar API, simpler code | Timers cancelled on termination, scheduled tasks lost | Never in service worker |
| Direct `fetch()` from content script | Fewer message hops, simpler code | CORS blocks in production, inconsistent behavior | Never for API calls to own backend |
| Hardcoded selectors without fallbacks | Fast initial development | Breaks when target site updates CSS classes | Only for internal/controlled pages |
| Polling for DOM changes instead of MutationObserver | Easier to understand | CPU waste, battery drain, missed rapid changes | Only for debugging |
| Storing sensitive data in `chrome.storage.local` | Persistent across sessions | Not encrypted, accessible to other extension code | Only for non-sensitive data |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Backend API | Making calls from content script | Route through service worker to avoid CORS |
| Clerk/Auth | Storing JWT in localStorage (unavailable) | Use `chrome.storage.session` with encryption |
| WebSocket | Assuming connection persists indefinitely | Implement reconnection logic on service worker wake |
| External CDNs | Loading scripts from CDN in service worker | Bundle all code - remote code execution banned in MV3 |
| Web app communication | Using postMessage without origin validation | Always verify `event.origin` matches expected domain |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Querying entire DOM for each field | Slow on complex pages | Cache selectors, query once | 50+ form fields, complex pages |
| Synchronous storage reads in hot paths | UI jank, missed events | Batch reads, use async/await properly | Every operation reads storage |
| MutationObserver on entire document | High CPU, battery drain | Observe specific subtrees only | Dynamic pages with frequent updates |
| Keeping all row data in popup state | Memory bloat, slow renders | Paginate, keep only visible rows | 1000+ rows in batch |
| Re-injecting content script on every message | Duplicate handlers, memory leaks | Check if already injected first | User navigates frequently |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing JWT in unencrypted `chrome.storage.local` | Token theft by malicious extensions | Use `chrome.storage.session` (memory-only) or encrypt before storage |
| Not validating message sender in `onMessageExternal` | Malicious sites can send commands to extension | Always check `sender.url` against allowlist |
| Using `eval()` or `innerHTML` with external data | XSS in extension context | Use `textContent`, DOM APIs, or sanitize strictly |
| Requesting `<all_urls>` permission | User distrust, review rejection | Request only specific host patterns needed |
| Logging sensitive data to console | Data exposure in DevTools | Strip sensitive fields before logging in production |
| Hardcoding API URLs without HTTPS | Man-in-the-middle attacks | Always use HTTPS, validate certificates |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback during form filling | User doesn't know if it's working | Show progress indicator per field |
| Silent failures when selector not found | User thinks form is filled, submits incomplete | Highlight unfilled fields, show error count |
| Popup closes on outside click during operation | User loses context, operation continues invisibly | Use sidebar panel or content script UI for critical flows |
| Requiring re-auth after every browser restart | Friction, abandonment | Implement refresh token flow, re-auth only when truly expired |
| Not indicating which row is currently active | User confusion about progress through batch | Clear visual indicator of current row position |
| Auto-advancing to next row without confirmation | User skips reviewing filled form | COPILOTO mode: require explicit "next" action |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Service worker state management:** Often missing persistence to `chrome.storage` - verify state survives worker termination by letting extension idle for 2+ minutes then testing
- [ ] **Content script form filling:** Often missing React/Vue native setter trick - verify by testing on a React form (create-react-app demo works)
- [ ] **Message passing:** Often missing `return true` for async - verify by adding artificial delay and checking response still received
- [ ] **SPA navigation detection:** Often missing `onHistoryStateUpdated` listener - verify by navigating within Gmail or Twitter then checking if extension detects it
- [ ] **Shadow DOM support:** Often missing recursive shadow root traversal - verify by testing on Material Design web components
- [ ] **iframe support:** Often missing `all_frames: true` in manifest - verify by testing on page with same-origin iframes
- [ ] **Popup state persistence:** Often missing storage save/restore - verify by closing and reopening popup, checking if selections preserved
- [ ] **Error handling:** Often missing user-facing error messages - verify by disconnecting network mid-operation, checking for graceful feedback

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service worker state loss | LOW | Implement storage persistence, migrate state on next release |
| Async event listener registration | MEDIUM | Refactor to synchronous top-level registration, requires code restructure |
| Content script isolation issues | MEDIUM | Add native setter utility, update all form-filling code to use it |
| Message passing failures | LOW | Add `return true` to all async handlers, straightforward fix |
| Popup state loss | MEDIUM | Add storage layer, requires UI state refactor |
| Shadow DOM/iframe blocking | HIGH | Requires fundamental selector engine redesign if not planned initially |
| SPA navigation missed | MEDIUM | Add webNavigation listener, may require content script reload logic |
| CORS errors in content script | MEDIUM | Route all API calls through service worker, moderate refactor |
| localStorage usage in SW | LOW | Replace with chrome.storage API, mostly find-and-replace |
| Port disconnection | HIGH | Requires operation chunking and progress checkpointing architecture |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Service worker state loss | Phase 1 - Foundation | Let extension idle 5+ minutes, verify state preserved |
| Async event listener registration | Phase 1 - Foundation | Code review checklist, grep for async listener patterns |
| Content script isolation | Phase 4 - Selector Engine | Test on React form demo app |
| Message passing response lost | Phase 2 - Auth Flow | Add 2-second artificial delay to all handlers, verify responses |
| Popup state resets | Phase 3 - Popup UI | Open/close popup 3 times, verify selections persist |
| Shadow DOM blocking | Phase 4 - Selector Engine | Test on Angular Material demo site |
| SPA navigation missed | Phase 4 - Content Script | Navigate within Gmail/Twitter, verify detection |
| Content script CORS | Phase 2 - API Client | Make API call from content script, verify no CORS error |
| localStorage unavailable | Phase 1 - Foundation | Attempt localStorage in SW, verify graceful fallback |
| Port disconnection | Phase 5 - Fill Cycle | Fill 100+ fields, verify operation completes |

## CRXJS Vite Plugin Specific Issues

Known issues with the CRXJS toolchain used in this project.

### HMR (Hot Module Replacement) Reliability

**What goes wrong:** HMR triggers in logs but changes don't appear, or changes appear momentarily then disappear after popup closes.

**Prevention:**
- Use `@vitejs/plugin-react` (not `react-swc`) for better HMR compatibility
- Ensure `package.json` has `"type": "module"`
- Be aware HMR may require page reload for service worker changes

### "Service worker has not loaded fully" Error

**What goes wrong:** After extension sits idle for 3-4 days, clicking icon shows this error.

**Prevention:**
- Verify service worker registration in manifest is correct
- Ensure no runtime errors in service worker that prevent full initialization
- Test idle scenario during QA

### Production Build Artifacts

**What goes wrong:** Extension works in dev but production build shows "Cannot connect to Vite Dev Server" error.

**Prevention:**
- Always test production build (`npm run build`) before release
- Verify no development-only code paths in production bundle
- Check manifest.json doesn't reference localhost URLs

**Maintenance Note:** CRXJS project was seeking new maintainers as of March 2025. Monitor project status and consider WXT as alternative if CRXJS becomes unmaintained.

---

## Sources

- [Chrome Developer Documentation - Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Chrome Developer Documentation - Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome Developer Documentation - Manifest V3 Known Issues](https://developer.chrome.com/docs/extensions/develop/migrate/known-issues)
- [Chrome Developer Documentation - Cross-origin Network Requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Chrome Developer Documentation - Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome Developer Documentation - webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)
- [React Issue #11488 - Trigger simulated input value change](https://github.com/facebook/react/issues/11488)
- [CRXJS GitHub Issues - Service Worker and HMR Problems](https://github.com/crxjs/chrome-extension-tools/issues)
- [Chromium Extensions Group - Service Worker Debugging](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [DEV Community - XPath vs querySelector for Content Scripts](https://dev.to/jaymalli_programmer/building-reliable-content-scripts-why-xpath-beats-queryselector-in-chrome-extensions-14ol)
- [Medium - Making Chrome Extension Smart by Supporting SPA websites](https://medium.com/@softvar/making-chrome-extension-smart-by-supporting-spa-websites-1f76593637e8)
- [HackerNoon - State Storage in Chrome Extensions](https://hackernoon.com/state-storage-in-chrome-extensions-options-limits-and-best-practices)
- [DEV Community - Local vs Sync vs Session Chrome Extension Storage](https://dev.to/notearthian/local-vs-sync-vs-session-which-chrome-extension-storage-should-you-use-5ec8)
- [MoldStud - Troubleshooting Common Messaging Problems in Chrome Extensions](https://moldstud.com/articles/p-troubleshooting-common-messaging-problems-in-your-chrome-extensions-a-comprehensive-guide)

---
*Pitfalls research for: Chrome Extension Manifest V3 Form Automation*
*Researched: 2026-02-03*
