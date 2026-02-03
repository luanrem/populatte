# Stack Research: Chrome Extension MVP

**Domain:** Chrome Extension (Manifest V3) with React popup, TypeScript service worker, content scripts
**Researched:** 2026-02-03
**Overall Confidence:** HIGH

## Executive Summary

For the Populatte Chrome Extension, **WXT** is recommended over CRXJS as the build framework. While CRXJS was initially specified in project documentation, the 2025-2026 landscape has shifted decisively toward WXT due to superior developer experience, active maintenance, and built-in abstractions for storage and messaging. WXT provides everything needed for the extension while reducing boilerplate code significantly.

The stack aligns with the existing monorepo: React 19, TypeScript, Tailwind CSS 4, and integrates cleanly with Turborepo.

## Context

This research focuses on **NEW capabilities needed for the Chrome Extension MVP (v4.0)**. The existing stack is validated and requires no changes:

**Validated (DO NOT re-add):**
- React 19.2.0
- TypeScript ^5.0
- Tailwind CSS 4.1.18
- @tanstack/react-query 5.90.20
- Zod 4.3.6
- Lucide React icons
- Clerk authentication (existing web app)
- NestJS API with JWT validation

**Focus areas for extension:**
- Build framework (WXT vs CRXJS)
- Chrome-specific APIs and types
- Storage persistence across popup cycles
- Message passing between contexts
- Authentication token management

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **WXT** | 0.20.13 | Extension build framework | Best-in-class DX, active maintenance (Dec 2025 release), built-in storage/messaging APIs, file-based manifest generation, HMR for all contexts including service workers. Clear winner in 2025 framework comparisons. |
| **React** | 19.2.0 | Popup UI framework | Consistency with existing web app, React 19 fully supported via @wxt-dev/module-react |
| **TypeScript** | ^5.0 | Type safety across all contexts | Already used in monorepo, WXT provides excellent TS support with auto-imports |
| **Vite** | 7.3.1 | Build tooling (via WXT) | WXT uses Vite 5-7 internally, provides fast dev server and optimized builds |
| **@wxt-dev/storage** | 1.2.6 | Cross-browser storage abstraction | Type-safe wrapper for chrome.storage.local, persists state across popup open/close cycles |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@wxt-dev/module-react** | 1.1.5 | React integration for WXT | Required for React components in popup/options pages. Adds React refresh and proper JSX handling. |
| **@types/chrome** | 0.1.36 | Chrome API type definitions | TypeScript autocompletion for chrome.* APIs. Updated Jan 2026 with Manifest V3 promise-based types. |
| **Tailwind CSS** | 4.1.18 | Popup styling | Consistency with web app. v4 has simplified setup (no config file needed). |
| **@tailwindcss/vite** | 4.1.18 | Tailwind Vite plugin | Modern v4 integration, faster than PostCSS approach |
| **@tanstack/react-query** | 5.90.20 | API data fetching in popup | Same pattern as web app, caching for API responses. Use in popup context only. |
| **zod** | 4.3.6 | Runtime validation | Validate API responses and storage data. Already in @populatte/commons. |
| **lucide-react** | 0.555.0 | Icons | Consistency with web app icon library |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| WXT CLI | Project scaffolding, dev server, build | `npx wxt@latest init` for new projects, `pnpm dev` for development |
| Chrome Extensions DevTools | Debugging service worker/content scripts | Built into Chrome at chrome://extensions. Enable Developer mode. |
| React DevTools | Debugging popup React components | Works in extension popup via chrome-extension:// protocol |

## Installation

```bash
# From apps/extension directory
cd apps/extension

# Initialize with WXT (if starting fresh)
npx wxt@latest init --template react

# OR add dependencies to existing project
npm install wxt@0.20.13

# Core dependencies (match web app versions)
npm install react@19.2.0 react-dom@19.2.0
npm install @tanstack/react-query@5.90.20
npm install zod@4.3.6
npm install lucide-react@0.555.0

# WXT modules
npm install @wxt-dev/module-react@1.1.5
npm install @wxt-dev/storage@1.2.6

# Styling (match web app)
npm install tailwindcss@4.1.18
npm install @tailwindcss/vite@4.1.18

# Dev dependencies
npm install -D @types/chrome@0.1.36
npm install -D @types/react@19
npm install -D @types/react-dom@19
npm install -D typescript@5
```

## Configuration

### wxt.config.ts

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Populatte',
    description: 'Form-filling automation from Excel data',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
  },
  // Vite config for Tailwind and path aliases
  vite: () => ({
    plugins: [require('@tailwindcss/vite').default()],
    resolve: {
      alias: {
        '@': './src',
      },
    },
  }),
});
```

### Entrypoints Structure (WXT Convention)

```
apps/extension/
  entrypoints/
    popup/               # React popup UI
      main.tsx           # Entry point with React Query provider
      App.tsx            # Root component
      index.html         # HTML template
    background.ts        # Service worker (event handlers, API proxy)
    content.ts           # Content script (DOM manipulation, form detection)
  public/
    icon-16.png
    icon-32.png
    icon-48.png
    icon-128.png
  styles/
    globals.css          # Tailwind imports
  src/
    components/          # Shared React components
    hooks/               # Custom hooks (useAuth, useMappings)
    lib/                 # Utilities, API client
    types/               # Extension-specific types
  wxt.config.ts
  package.json
  tsconfig.json
```

### Tailwind CSS 4 Setup

```css
/* styles/globals.css */
@import "tailwindcss";
```

No `tailwind.config.js` needed with v4. Design tokens exposed as CSS variables.

Import in popup entry:
```typescript
// entrypoints/popup/main.tsx
import '../../styles/globals.css';
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "extends": "../../packages/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@populatte/types": ["../../packages/types/src"],
      "@populatte/commons": ["../../packages/commons/src"]
    },
    "types": ["chrome"]
  },
  "include": ["src", "entrypoints", "wxt.config.ts"],
  "exclude": ["node_modules", ".output"]
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **WXT** | CRXJS @crxjs/vite-plugin@2.3.0 | Only if you need zero abstractions and maximum control. CRXJS is actively maintained (Dec 2025 release) but lacks built-in storage/messaging APIs, requiring more boilerplate. |
| **WXT** | Plasmo | Never recommended - appears in maintenance mode with outdated Parcel bundler, React-only HMR, community concerns about long-term viability. |
| **@wxt-dev/storage** | chrome.storage.local directly | Only for very simple storage needs. Loses type safety and cross-browser abstraction. |
| **@wxt-dev/storage** | use-chrome-storage (hook library) | Only if you need React hooks-only API. Cannot use in background service worker (hooks require React context). |

### WXT vs CRXJS Detailed Comparison

| Criterion | WXT | CRXJS |
|-----------|-----|-------|
| Latest Release | Dec 16, 2025 (0.20.13) | Dec 8, 2025 (2.3.0) |
| Maintenance Status | Active, thriving community | Active, but smaller team |
| Storage API | Built-in @wxt-dev/storage | Roll your own |
| Messaging API | Built-in abstractions | Roll your own |
| HMR | All contexts including service worker | Content scripts only |
| Manifest generation | File-based (automatic from entrypoints/) | Manual manifest.json |
| Auto-imports | Yes (Nuxt-style) | No |
| React support | First-class via @wxt-dev/module-react | Works but no special integration |
| Learning curve | Moderate (conventions to learn) | Lower (minimal abstraction) |
| Cross-browser | Single codebase for MV2/MV3 | Chrome-focused |

**Verdict:** WXT wins for Populatte because form-filling automation requires robust storage (save mappings, auth tokens, execution state) and messaging (popup <-> content script <-> background). WXT's built-in APIs reduce complexity significantly.

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Plasmo** | Maintenance mode, outdated Parcel bundler, uncertain future. Community reports bugs going unfixed. | WXT |
| **webextension-polyfill** | WXT handles cross-browser compatibility internally. Adding polyfill causes conflicts. | WXT's built-in browser API |
| **Manifest V2** | Deprecated. Chrome Web Store requires V3 for new submissions. V2 extensions will stop working in 2025. | Manifest V3 (WXT default) |
| **localStorage in service worker** | Not available in service workers. Will throw error. | chrome.storage.local via @wxt-dev/storage |
| **Long-lived JWT in extension storage** | Security risk. Other extensions on same machine could potentially access chrome.storage. Malicious extensions could steal tokens. | Short-lived tokens (15-30 min), refresh via background script |
| **Global variables for state** | Lost when service worker goes idle (after ~30 seconds of inactivity). Manifest V3 service workers are ephemeral. | @wxt-dev/storage for persistence |
| **Popup state in React useState** | Lost when popup closes. Users expect state to persist between popup open/close cycles. | @wxt-dev/storage with useStorage hook |

## Stack Patterns by Context

### Popup (React UI)

**Purpose:** User interface for selecting projects, batches, viewing mappings, triggering form fill.

**Pattern:** Standard React app with TanStack Query for API calls, @wxt-dev/storage for persistence.

```typescript
// entrypoints/popup/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { storage } from '@wxt-dev/storage';

// Define typed storage items
const authTokenStorage = storage.defineItem<string | null>('local:authToken', {
  defaultValue: null,
});

const selectedProjectStorage = storage.defineItem<string | null>('local:selectedProjectId', {
  defaultValue: null,
});

export default function App() {
  // useStorage hook auto-syncs with chrome.storage.local
  const authToken = authTokenStorage.useValue();
  const selectedProjectId = selectedProjectStorage.useValue();

  if (!authToken) {
    return <SignInPrompt />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ProjectSelector selectedId={selectedProjectId} />
      {selectedProjectId && <MappingsList projectId={selectedProjectId} />}
    </QueryClientProvider>
  );
}
```

**Key patterns:**
- `storage.defineItem<T>()` creates typed storage accessor
- `.useValue()` returns reactive value that updates on storage change
- TanStack Query for API calls (same patterns as web app)
- Components from shadcn/ui (match web app)

### Background Service Worker

**Purpose:** Event-driven handlers for:
- Receiving auth tokens from web app
- Proxying API calls (bypass CORS for content scripts)
- Coordinating between popup and content script

**Pattern:** Event listeners at top level, no persistent state in variables.

```typescript
// entrypoints/background.ts
import { storage } from '@wxt-dev/storage';

const authTokenStorage = storage.defineItem<string | null>('local:authToken', {
  defaultValue: null,
});

export default defineBackground(() => {
  // CRITICAL: Register listeners synchronously at top level
  // Service worker may restart, and async registration won't work

  // Receive auth token from web app (external message)
  browser.runtime.onMessageExternal.addListener(
    async (message, sender, sendResponse) => {
      if (message.type === 'SET_AUTH_TOKEN' && message.token) {
        await authTokenStorage.setValue(message.token);
        sendResponse({ success: true });
      }
      return true; // Required for async response
    }
  );

  // Handle messages from content script
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'API_REQUEST') {
      const token = await authTokenStorage.getValue();
      if (!token) {
        return { error: 'Not authenticated' };
      }

      // Proxy API call with auth header
      const response = await fetch(message.url, {
        method: message.method || 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: message.body ? JSON.stringify(message.body) : undefined,
      });

      return { data: await response.json() };
    }
  });
});
```

**Critical rules:**
1. Register event listeners at top level (synchronous), NOT inside async callbacks
2. Return `true` from listeners for async responses
3. Use `browser.runtime.onMessageExternal` for messages from web app
4. Use `browser.runtime.onMessage` for messages from content script/popup
5. Never store state in global variables (lost on service worker restart)

### Content Script

**Purpose:** Execute on target web pages to:
- Detect form fields
- Execute form-filling steps
- Report results back to popup/background

**Pattern:** DOM manipulation, message passing for API data.

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // Listen for messages from popup/background
    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'EXECUTE_STEP') {
        const { step } = message;
        return executeStep(step);
      }

      if (message.type === 'DETECT_FIELDS') {
        return detectFormFields();
      }
    });
  },
});

async function executeStep(step: Step): Promise<{ success: boolean; error?: string }> {
  try {
    const element = document.querySelector(step.targetSelector);
    if (!element) {
      return { success: false, error: `Element not found: ${step.targetSelector}` };
    }

    if (step.type === 'fill') {
      (element as HTMLInputElement).value = step.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

function detectFormFields(): FormField[] {
  const inputs = document.querySelectorAll('input, select, textarea');
  return Array.from(inputs).map((el) => ({
    tagName: el.tagName.toLowerCase(),
    selector: generateSelector(el),
    type: (el as HTMLInputElement).type || 'text',
    name: (el as HTMLInputElement).name,
    id: el.id,
  }));
}
```

**Critical rules:**
1. Content scripts CANNOT directly call external APIs (CORS blocks them)
2. Proxy all API calls through background service worker
3. Use `browser.runtime.sendMessage()` to communicate with background
4. Dispatch 'input' and 'change' events after programmatic value changes (frameworks like React listen for these)

## Authentication Strategy

For syncing authentication between Populatte web app and extension:

### Recommended: Manual Token Passing

```
                    +----------------+
                    |   Web App      |
                    | (Next.js)      |
                    +-------+--------+
                            |
                            | chrome.runtime.sendMessage
                            | (onMessageExternal)
                            v
                    +-------+--------+
                    | Background     |
                    | Service Worker |
                    +-------+--------+
                            |
                            | chrome.storage.local
                            v
                    +-------+--------+
                    |  Popup React   |
                    |  (useStorage)  |
                    +----------------+
```

**Web App Side:**
```typescript
// apps/web - After successful Clerk auth
async function sendTokenToExtension(token: string) {
  const extensionId = process.env.NEXT_PUBLIC_EXTENSION_ID;

  try {
    await chrome.runtime.sendMessage(extensionId, {
      type: 'SET_AUTH_TOKEN',
      token: token,
    });
  } catch (error) {
    // Extension not installed or not accessible
    console.log('Extension not available');
  }
}
```

**Extension Side (Background):**
```typescript
// entrypoints/background.ts
browser.runtime.onMessageExternal.addListener(async (request, sender) => {
  // Validate sender (only accept from our web app domain)
  if (!sender.url?.startsWith('https://app.populatte.com')) {
    return { success: false, error: 'Invalid sender' };
  }

  if (request.type === 'SET_AUTH_TOKEN') {
    await authTokenStorage.setValue(request.token);
    return { success: true };
  }
});
```

**Manifest Permissions:**
```typescript
// wxt.config.ts
manifest: {
  permissions: ['storage'],
  externally_connectable: {
    matches: ['https://app.populatte.com/*', 'http://localhost:3000/*'],
  },
}
```

**Why NOT Clerk Sync Host:**
- Clerk's syncHost feature is designed for Plasmo
- Requires complex host_permissions setup
- Adds cookies permission (privacy concern)
- Manual token passing is simpler with WXT

## Turborepo Integration

### package.json

```json
{
  "name": "@populatte/extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:firefox": "wxt build -b firefox",
    "zip": "wxt zip",
    "lint": "eslint entrypoints src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "@tanstack/react-query": "5.90.20",
    "zod": "4.3.6",
    "lucide-react": "0.555.0",
    "@wxt-dev/storage": "1.2.6"
  },
  "devDependencies": {
    "wxt": "0.20.13",
    "@wxt-dev/module-react": "1.1.5",
    "@types/chrome": "0.1.36",
    "@types/react": "19",
    "@types/react-dom": "19",
    "typescript": "5",
    "tailwindcss": "4.1.18",
    "@tailwindcss/vite": "4.1.18",
    "@populatte/eslint-config": "workspace:*",
    "@populatte/tsconfig": "workspace:*"
  }
}
```

### ESLint Configuration

Create `apps/extension/.eslintrc.cjs`:
```javascript
module.exports = {
  root: true,
  extends: ['@populatte/eslint-config/react'],
  parserOptions: {
    project: './tsconfig.json',
  },
  env: {
    browser: true,
    webextensions: true,
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly',
  },
};
```

### turbo.json additions

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".output/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Extension will inherit workspace dependencies and configs from monorepo root.

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| WXT 0.20.x | Vite 5.4.x, 6.x, 7.x | Broad Vite version support, tested with latest |
| WXT 0.20.x | React 18.x, 19.x | React 19 fully supported via module-react |
| @wxt-dev/module-react 1.1.x | WXT >=0.19.16 | Requires recent WXT version |
| @wxt-dev/storage 1.2.x | WXT >=0.19.x | Works with WXT's browser API |
| Tailwind CSS 4.x | Chrome 111+, Firefox 128+ | Modern CSS features (color-mix, @property). Extension users have modern browsers. |
| @types/chrome 0.1.36 | Chrome 130+ | Types match recent Chrome APIs with MV3 promises |
| React 19.2.0 | @tanstack/react-query 5.x | Verified compatible |

## Performance Considerations

### Service Worker Lifecycle

```
Idle timeout: ~30 seconds
Max execution time: 5 minutes (then forcibly terminated)

Event → Wake up → Execute → Return to idle

DO NOT:
- Keep service worker alive with setInterval (wastes resources)
- Store state in global variables (lost on restart)
- Make long-running requests without handling restart

DO:
- Store all state in chrome.storage
- Handle chrome.runtime.onStartup for init logic
- Use alarms API for scheduled tasks
```

### Popup Performance

```
Target: < 100ms initial render
Strategy: Pre-fetch data when popup opens

- Use React Query's staleTime: 60000 (1 minute) for API caching
- Show skeleton/loading state immediately
- Load critical data first (auth status, selected project)
```

### Content Script Impact

```
Injection: document_idle (after DOM ready)
Performance budget: < 50ms on page load
Selector strategy: Use IDs when available, avoid deep CSS paths

Avoid:
- MutationObserver on entire document (high CPU)
- Polling with setInterval (use event-driven approach)
- Heavy DOM queries on every message
```

## Security Considerations

1. **Token Storage:** Store tokens in chrome.storage.local (not localStorage). While not perfect, it's isolated per-extension.

2. **Validate Senders:** Always check `sender.url` in onMessageExternal to prevent malicious sites from sending tokens.

3. **Content Script Trust:** Content scripts run in isolated world but can be compromised by malicious pages. Never trust data from content scripts without validation.

4. **Minimum Permissions:** Request only needed permissions. `<all_urls>` is required for form-filling but raises review scrutiny.

5. **CSP in Manifest:** WXT sets appropriate Content Security Policy. Don't disable it.

## Sources

### Official Documentation (HIGH confidence)
- [WXT Official Site](https://wxt.dev) - Installation, features, API documentation
- [WXT GitHub Releases](https://github.com/wxt-dev/wxt/releases) - Version 0.20.13, Dec 2025
- [Chrome Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) - Service worker communication patterns
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) - storage.local limits and best practices
- [Clerk Chrome Extension Docs](https://clerk.com/docs/guides/sessions/sync-host) - Auth sync strategy (reference only, not recommended for WXT)

### Framework Comparisons (MEDIUM confidence)
- [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) - WXT vs CRXJS vs Plasmo comprehensive analysis
- [Chrome Extension Development in 2025](https://www.devkit.best/blog/mdx/chrome-extension-framework-comparison-2025) - Framework comparison and recommendations

### Package Registries (HIGH confidence - verified via npm view)
- WXT: 0.20.13 (published Dec 16, 2025)
- @wxt-dev/module-react: 1.1.5
- @wxt-dev/storage: 1.2.6
- CRXJS: 2.3.0 (published Dec 8, 2025)
- @types/chrome: 0.1.36 (published Jan 2026)
- Vite: 7.3.1
- @vitejs/plugin-react: 5.1.3

### Community Patterns (MEDIUM confidence)
- [Building Chrome Extensions with Vite, React, and Tailwind CSS in 2025](https://www.artmann.co/articles/building-a-chrome-extension-with-vite-react-and-tailwind-css-in-2025) - Tailwind setup for extensions
- [State Management in Chrome Extensions](https://dev.to/bnn1/how-do-they-talk-to-each-other-2p9) - Message passing patterns
- [chrome.storage React hooks](https://github.com/onikienko/use-chrome-storage) - Reference for storage patterns

---

**Stack research for:** Chrome Extension MVP
**Researched:** 2026-02-03
**Next steps:** Proceed to roadmap creation with WXT-based extension stack
