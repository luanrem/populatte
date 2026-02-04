# Phase 26: Extension Auth Flow - Research

**Researched:** 2026-02-03
**Domain:** Chrome extension authentication UX and integration
**Confidence:** HIGH

## Summary

Phase 26 implements the extension-side authentication flow using connection codes from the web app. The backend endpoints already exist (Phase 25), so this phase focuses on UI components, API integration, and state management.

The standard approach combines React form validation patterns with Chrome extension storage APIs and WXT's built-in abstractions. Token storage uses chrome.storage.local (via WXT's storage API), API calls are plain fetch with error handling, and the UI follows shadcn/ui component patterns already established in the web app.

**Key architectural decisions from CONTEXT.md:**
- Single text field code input (not split digit boxes)
- Validation on submit, not auto-submit
- Inline error messages below input field
- Simple connected state indicator (green dot + "Connected" text)
- Session expiration shows inline message then redirects to connect UI

**Primary recommendation:** Use React useState for form state, WXT storage for persistence, and shadcn/ui Button with loading state. The AUTH_LOGIN message already exists in the messaging layer - background handlers will perform the actual API exchange.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.13 | Extension framework | Already adopted in Phase 24, provides storage/messaging abstractions |
| React | 19.2.0 | UI framework | Already used in popup, established pattern |
| Tailwind CSS | 4.x | Styling | Already configured in Phase 24 |
| lucide-react | 0.555.0 | Icons | Already used for Coffee icon, consistent visual language |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WXT storage API | Built-in | chrome.storage wrapper | Token persistence (already used in Phase 24) |
| WXT messaging | Built-in | Message passing | Popup → Background communication (already used in Phase 24) |
| Native fetch | Browser API | HTTP requests | API calls from background script |
| chrome.tabs API | Browser API | Tab management | Opening web app connection page |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | Axios/ky | Fetch is sufficient for simple POST/GET requests, no need for extra dependency |
| Chrome storage | IndexedDB/localStorage | chrome.storage.local is recommended by Chrome for extension data, survives service worker restarts |
| React Hook Form | Zod + useState | Single input field doesn't warrant form library overhead |

**Installation:**
No new dependencies required - all libraries already in project from Phase 24.

## Architecture Patterns

### Recommended Component Structure
```
apps/extension/entrypoints/popup/
├── App.tsx                      # Main router (already exists)
├── components/
│   ├── ConnectView.tsx          # Disconnected state with Connect button
│   ├── ConnectedView.tsx        # Authenticated state with project selector (future)
│   └── CodeInputForm.tsx        # Connection code input form
```

### Pattern 1: Connect Flow State Machine
**What:** UI renders different views based on auth state
**When to use:** Managing distinct auth states (disconnected → connecting → connected)
**Example:**
```typescript
// Source: Derived from React best practices + Chrome extension patterns
export default function App() {
  const [state, setState] = useState<ExtensionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadState();
  }, []);

  if (loading) {
    return <LoadingView />;
  }

  if (!state?.isAuthenticated) {
    return <ConnectView />;
  }

  return <ConnectedView state={state} />;
}
```

### Pattern 2: Form Validation with Inline Errors
**What:** Single text field with client-side validation and inline error display
**When to use:** Code input form with immediate feedback
**Example:**
```typescript
// Source: React form validation best practices 2026
export function CodeInputForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate before API call
    if (!/^\d{6}$/.test(code)) {
      setError('Code must be exactly 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await sendToBackground<AuthResponse>({
        type: 'AUTH_LOGIN',
        payload: { code },
      });

      if (!response.success) {
        setError(response.error || 'Connection failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        maxLength={6}
        disabled={loading}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      <Button type="submit" disabled={loading}>
        {loading && <Spinner />}
        Connect
      </Button>
    </form>
  );
}
```

### Pattern 3: Background Message Handler for Auth
**What:** Background script handles AUTH_LOGIN, calls API, stores token
**When to use:** Separating UI from API logic (popup can't make direct API calls safely)
**Example:**
```typescript
// Source: WXT messaging patterns + Phase 24 implementation
// In apps/extension/src/messaging/handlers.ts

async function handleAuthLogin(
  payload: { code: string }
): Promise<MessageResponse<{ success: boolean }>> {
  try {
    // Call API endpoint
    const response = await fetch('https://api.populatte.com/auth/extension-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: payload.code }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Invalid or expired code',
      };
    }

    const data: { token: string } = await response.json();

    // Fetch user info to populate storage
    const meResponse = await fetch('https://api.populatte.com/auth/extension-me', {
      headers: { 'Authorization': `Bearer ${data.token}` },
    });

    if (!meResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const user: MeResponse = await meResponse.json();

    // Store token and user info
    await authStorage.setToken(data.token, Date.now() + 30 * 24 * 60 * 60 * 1000);
    await authStorage.setUser(user.id, user.email);

    // Broadcast state update to popup
    await broadcastStateUpdate();

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
```

### Pattern 4: Opening Web App in New Tab
**What:** Connect button opens web app connection page where user generates code
**When to use:** User needs to get the connection code from authenticated web session
**Example:**
```typescript
// Source: Chrome tabs API documentation (updated Jan 2026)
function handleOpenConnectionPage() {
  chrome.tabs.create({
    url: 'https://app.populatte.com/extension/connect',
    active: true,
  });
}
```

### Pattern 5: Session Expiration Handling with Interceptor Pattern
**What:** Detect 401 responses, clear token, redirect to connect UI
**When to use:** Any API call that could return 401 (all authenticated endpoints)
**Example:**
```typescript
// Source: HTTP 401 handling best practices 2026
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const auth = await authStorage.getAuth();

  if (!auth.token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${auth.token}`,
    },
  });

  if (response.status === 401) {
    // Token expired - clear and notify
    await authStorage.clearAuth();
    await broadcastStateUpdate();
    throw new Error('SESSION_EXPIRED');
  }

  return response;
}
```

### Anti-Patterns to Avoid
- **Storing token in localStorage/sessionStorage:** Use chrome.storage.local instead - it's designed for extensions and survives service worker restarts
- **Auto-submit on 6th digit:** Per CONTEXT.md, validation triggers on submit button click, not auto-submit
- **Modal dialogs for session expiration:** Per CONTEXT.md, use inline message then redirect to connect UI
- **Popup making direct API calls:** Background script should handle API calls to maintain consistent error handling and state management

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Storage persistence | Custom chrome.storage wrapper | WXT storage.defineItem | Already implemented in Phase 24, handles errors, provides defaults |
| Message passing | Raw chrome.runtime.sendMessage | WXT messaging (sendToBackground) | Already implemented in Phase 24, type-safe, cleaner API |
| Button loading state | Custom spinner + disabled logic | shadcn/ui Button + Spinner | Consistent with web app, accessible, handles edge cases |
| Form input | Raw HTML input | shadcn/ui Input component | Consistent styling, accessibility built-in |
| JWT verification | Custom JWT parsing | Don't verify on extension side | Backend validates tokens, extension just stores and sends them |

**Key insight:** The extension doesn't need to verify JWT structure or expiry - it trusts the backend. Token is an opaque string to the extension. Only the backend (using jose library) verifies tokens on each API request.

## Common Pitfalls

### Pitfall 1: Popup State Loss on Close
**What goes wrong:** User enters code, popup closes before API call completes, state is lost
**Why it happens:** React state is in-memory and lost when popup DOM is destroyed
**How to avoid:** Background script handles AUTH_LOGIN, stores token in chrome.storage (persistent), popup re-fetches state on open
**Warning signs:** User reports "nothing happens" after entering code and closing popup

### Pitfall 2: Token Expiry Not Checked Before API Calls
**What goes wrong:** Extension makes API call with expired token, gets 401, but doesn't distinguish between "expired" and "invalid"
**Why it happens:** Token stored in chrome.storage might be expired (30 days old)
**How to avoid:** Check `authStorage.isExpired()` before API calls, or rely on 401 handling to clear expired tokens
**Warning signs:** Repeated 401 errors without clear "session expired" message

### Pitfall 3: Race Condition Between Popup and Background
**What goes wrong:** Popup sends AUTH_LOGIN, background updates storage, but popup's state is stale
**Why it happens:** Popup doesn't listen for STATE_UPDATED broadcast from background
**How to avoid:** Background broadcasts STATE_UPDATED after auth changes, popup listens and updates local state
**Warning signs:** User successfully connects but UI still shows "Disconnected" until reload

### Pitfall 4: Code Input Accepts Non-Numeric Characters
**What goes wrong:** User pastes "123 456" or "abc123", API rejects, unclear error
**Why it happens:** Input field doesn't restrict to digits only
**How to avoid:** Client-side validation with regex `/^\d{6}$/`, show specific error "Code must be exactly 6 digits"
**Warning signs:** User sees generic "Invalid code" error when they pasted code with spaces

### Pitfall 5: Opening Multiple Connection Tabs
**What goes wrong:** User clicks Connect button multiple times, opens 5+ tabs to web app
**Why it happens:** No debouncing or loading state on Connect button
**How to avoid:** Disable button after first click, use loading state
**Warning signs:** User reports "too many tabs opened"

### Pitfall 6: API URL Hardcoded Without Environment Detection
**What goes wrong:** Extension in development calls production API, or vice versa
**Why it happens:** Fetch URLs hardcoded as strings without env detection
**How to avoid:** Use environment variable or config for API base URL (same pattern as web app)
**Warning signs:** Development extension can't connect, or production extension hits dev API

## Code Examples

Verified patterns from official sources and existing codebase:

### Message Type Already Defined
```typescript
// Source: apps/extension/src/types/messages.ts (already implemented in Phase 24)
export interface AuthLoginMessage {
  type: 'AUTH_LOGIN';
  payload: {
    code: string; // Connection code from web app
  };
}
```

### Storage Methods Already Implemented
```typescript
// Source: apps/extension/src/storage/auth.ts (already implemented in Phase 24)
async setToken(token: string, expiresAt: number): Promise<void>
async setUser(userId: string, userEmail: string): Promise<void>
async clearAuth(): Promise<void>
async isExpired(): Promise<boolean>
async isAuthenticated(): Promise<boolean>
```

### shadcn/ui Button with Loading State
```typescript
// Source: https://ui.shadcn.com/docs/components/button
// shadcn/ui official pattern for loading buttons
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Connect
</Button>
```

### WXT Storage Already Configured
```typescript
// Source: apps/extension/src/storage/auth.ts (Phase 24 implementation)
import { storage } from 'wxt/utils/storage';

const authItem = storage.defineItem<AuthState>('local:populatte:auth', {
  fallback: DEFAULT_AUTH,
});

await authItem.getValue(); // Read
await authItem.setValue(newAuth); // Write
```

### Chrome Tabs API for Opening Connection Page
```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/tabs
// Official Chrome API (updated Jan 30, 2026)
chrome.tabs.create({
  url: 'https://app.populatte.com/extension/connect',
  active: true, // Focus the new tab
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chrome.storage callbacks | WXT storage.defineItem | WXT 0.19+ (2025) | Type-safe, promise-based, cleaner API |
| Manual chrome.runtime.sendMessage | WXT sendToBackground | WXT 0.18+ (2025) | Type inference, automatic tab targeting |
| Split digit inputs | Single input field | UI/UX evolution (2024-2025) | Simpler implementation, easier paste, better mobile UX |
| Modal for session expired | Inline message + redirect | Modern web patterns (2025) | Less intrusive, clearer user flow |
| Manifest V2 chrome.identity | Custom OAuth with connection codes | Manifest V3 migration (2023-2024) | More control, works for any auth provider, no OAuth popup restrictions |

**Deprecated/outdated:**
- **chrome.storage callbacks**: WXT's storage API is promise-based, no need for callback hell
- **Auto-submit on 6 digits**: Modern UX prefers explicit submit to prevent accidental submissions
- **Storing user avatar in extension**: Phase 25 backend returns imageUrl, but CONTEXT.md specifies no avatar display in connected state

## Open Questions

Things that couldn't be fully resolved:

1. **API Base URL Configuration**
   - What we know: Web app has environment detection for API URLs
   - What's unclear: Whether extension should use same pattern or hardcode production URL (extensions don't have .env files like web apps)
   - Recommendation: Check if WXT supports import.meta.env, otherwise hardcode production API URL with comment explaining why

2. **Connection Page URL**
   - What we know: Connect button should open web app where user generates code
   - What's unclear: Exact route path for connection page (is it /extension/connect or /settings/extension?)
   - Recommendation: Coordinate with Phase 27 (web app connection page implementation) or use placeholder like /extension/connect

3. **Error Message Specificity**
   - What we know: API returns 401 for invalid/expired codes
   - What's unclear: Whether backend distinguishes between "code expired" vs "code invalid" vs "too many attempts"
   - Recommendation: Check Phase 25 implementation - if backend returns specific error messages, display them; otherwise use generic "Invalid or expired code"

4. **Disconnect Flow Placement**
   - What we know: Disconnect option lives in settings/gear menu per CONTEXT.md
   - What's unclear: Whether settings menu is implemented in this phase or deferred to Phase 27
   - Recommendation: Defer settings menu to Phase 27 (popup UI phase), this phase only implements connect flow

## Sources

### Primary (HIGH confidence)
- WXT Official Documentation - https://wxt.dev/guide/essentials/storage.html (storage patterns)
- WXT Official Documentation - https://wxt.dev/guide/essentials/messaging.html (messaging patterns)
- Chrome Tabs API - https://developer.chrome.com/docs/extensions/reference/api/tabs (updated Jan 30, 2026)
- Chrome Storage API - https://developer.chrome.com/docs/extensions/develop/concepts/storage (Manifest V3 patterns)
- Phase 24 Implementation - apps/extension/src/storage/auth.ts (verified storage methods)
- Phase 24 Implementation - apps/extension/src/types/messages.ts (verified message types)
- Phase 25 Implementation - apps/api/src/infrastructure/auth/extension-auth.service.ts (verified API endpoints)
- Phase 25 Implementation - apps/api/src/presentation/dto/extension-auth.dto.ts (verified request/response shapes)

### Secondary (MEDIUM confidence)
- shadcn/ui Button - https://ui.shadcn.com/docs/components/button (loading state pattern, verified with official docs)
- React Form Validation Best Practices - https://formspree.io/blog/react-form-validation/ (inline error patterns)
- Jose Library - https://github.com/panva/jose (client-side JWT, though extension doesn't verify)

### Tertiary (LOW confidence)
- WXT Framework Comparison 2025 - https://www.devkit.best/blog/mdx/chrome-extension-framework-comparison-2025 (ecosystem context, not specific to this implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project from Phase 24, verified in package.json
- Architecture: HIGH - Patterns derived from existing Phase 24 implementation + official docs
- Pitfalls: HIGH - Based on known Chrome extension issues + React form validation common mistakes
- Code examples: HIGH - All examples reference existing codebase or official documentation
- Open questions: MEDIUM - Coordination points with future phases, no blockers

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, no fast-moving dependencies)

**Research scope aligned with CONTEXT.md:**
- ✅ Single text field (not split digit boxes) - researched React form patterns
- ✅ Validation on submit - researched form submission best practices
- ✅ Button spinner and disabled state - verified shadcn/ui patterns
- ✅ Inline errors - researched React error display patterns
- ✅ Simple connected state - no avatar research (out of scope per CONTEXT.md)
- ✅ Session expiration handling - researched 401 interceptor patterns
- ✅ Settings menu placement - acknowledged as future work (Phase 27)
