# Architecture Research: Chrome Extension MVP

**Domain:** Chrome Extension (Manifest V3) for Form-Filling Automation
**Researched:** 2026-02-03
**Confidence:** HIGH

## Executive Summary

This document defines the architecture for the Populatte Chrome Extension, a Manifest V3 extension that automates form-filling from Excel data. The extension integrates with the existing NestJS API and consists of three isolated execution contexts: Popup (React UI), Service Worker (background orchestration), and Content Script (DOM manipulation).

**Key architectural decisions:**
- Service Worker handles ALL API communication and state orchestration
- Content Script is stateless, receives instructions via messages
- `chrome.storage.session` for ephemeral state (current session)
- `chrome.storage.local` for persistent state (token, preferences)
- Message passing via typed request/response protocol
- Step execution engine in Content Script with selector fallback strategy

## System Overview

```
                                    BROWSER CONTEXT
    ================================================================================

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                              CHROME EXTENSION                                │
    │                                                                              │
    │  ┌─────────────────┐         ┌─────────────────┐         ┌───────────────┐  │
    │  │     POPUP       │         │  SERVICE WORKER │         │ CONTENT SCRIPT│  │
    │  │   (React UI)    │         │   (Background)  │         │  (Injected)   │  │
    │  │                 │         │                 │         │               │  │
    │  │ - Project list  │         │ - API Client    │         │ - DOM access  │  │
    │  │ - Batch select  │         │ - Auth/Token    │         │ - Selectors   │  │
    │  │ - Fill controls │         │ - State mgmt    │         │ - Step engine │  │
    │  │ - Status view   │         │ - Orchestration │         │ - Events      │  │
    │  │                 │         │                 │         │               │  │
    │  └────────┬────────┘         └────────┬────────┘         └───────┬───────┘  │
    │           │                           │                          │          │
    │           │   chrome.runtime          │                          │          │
    │           │   .sendMessage()          │                          │          │
    │           └──────────────────────────►│◄─────────────────────────┘          │
    │                                       │    chrome.tabs                      │
    │                                       │    .sendMessage()                   │
    │                                       │                                     │
    │                        ┌──────────────┴──────────────┐                      │
    │                        │      CHROME STORAGE         │                      │
    │                        │                             │                      │
    │                        │ session: {                  │                      │
    │                        │   currentProject,           │                      │
    │                        │   currentBatch,             │                      │
    │                        │   currentRowIndex,          │                      │
    │                        │   fillStatus                │                      │
    │                        │ }                           │                      │
    │                        │                             │                      │
    │                        │ local: {                    │                      │
    │                        │   authToken,                │                      │
    │                        │   preferences,              │                      │
    │                        │   lastProjectId             │                      │
    │                        │ }                           │                      │
    │                        └─────────────────────────────┘                      │
    │                                                                              │
    └──────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            │ HTTPS (fetch + Bearer token)
                                            ▼
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │                           POPULATTE API (NestJS)                             │
    │                                                                              │
    │  Existing Endpoints Used by Extension:                                       │
    │                                                                              │
    │  GET  /projects                           List user projects                 │
    │  GET  /projects/:id/batches               List batches for project           │
    │  GET  /projects/:id/batches/:batchId/rows Get rows (paginated)              │
    │  GET  /projects/:id/mappings?targetUrl=X  Find mapping for current URL      │
    │  GET  /mappings/:id/steps                 Get steps for mapping             │
    │                                                                              │
    │  NEW Endpoints Required:                                                     │
    │  PATCH /rows/:rowId/status                Update row fill status            │
    │                                                                              │
    └──────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | What It CANNOT Do |
|-----------|----------------|-------------------|
| **Popup (React)** | Display UI, capture user intent, send commands to Service Worker | Access DOM of web pages, make API calls directly, persist state |
| **Service Worker** | API calls, token management, state orchestration, message routing | Access DOM, stay alive indefinitely, use localStorage/sessionStorage |
| **Content Script** | DOM manipulation, element selection, step execution, event observation | Make cross-origin requests, access chrome.storage directly (by default) |

### Component Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               DATA OWNERSHIP                                     │
│                                                                                  │
│   Popup                    Service Worker              Content Script           │
│   ┌─────────────────┐      ┌─────────────────┐        ┌─────────────────┐      │
│   │ UI State only:  │      │ Session state:  │        │ Ephemeral only: │      │
│   │ - isOpen        │      │ - currentProject│        │ - observedForms │      │
│   │ - selectedTab   │      │ - currentBatch  │        │ - pendingSteps  │      │
│   │ - formValues    │      │ - currentRow    │        │ - lastResult    │      │
│   │                 │      │ - fillStatus    │        │                 │      │
│   │ Derives from:   │      │                 │        │ Receives from:  │      │
│   │ Service Worker  │      │ Persisted state:│        │ Service Worker  │      │
│   │ messages        │      │ - authToken     │        │ (per message)   │      │
│   │                 │      │ - preferences   │        │                 │      │
│   └─────────────────┘      └─────────────────┘        └─────────────────┘      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Recommended Project Structure

```
apps/extension/
├── public/
│   ├── manifest.json           # Extension manifest (MV3)
│   └── icons/                  # Extension icons (16, 48, 128px)
│
├── src/
│   ├── background/             # Service Worker context
│   │   ├── index.ts            # Service worker entry point
│   │   ├── api/                # API client module
│   │   │   ├── client.ts       # Base fetch wrapper with auth
│   │   │   ├── projects.ts     # Project endpoints
│   │   │   ├── batches.ts      # Batch endpoints
│   │   │   ├── mappings.ts     # Mapping endpoints
│   │   │   └── index.ts        # Re-exports
│   │   ├── state/              # State management
│   │   │   ├── storage.ts      # chrome.storage wrapper
│   │   │   ├── session.ts      # Session state helpers
│   │   │   └── index.ts
│   │   ├── handlers/           # Message handlers
│   │   │   ├── auth.handler.ts # Login/logout handlers
│   │   │   ├── project.handler.ts
│   │   │   ├── fill.handler.ts # Fill orchestration
│   │   │   └── index.ts
│   │   └── orchestrator.ts     # Fill flow coordinator
│   │
│   ├── content/                # Content Script context
│   │   ├── index.ts            # Content script entry point
│   │   ├── selectors/          # Element selection strategies
│   │   │   ├── css.ts          # CSS selector resolver
│   │   │   ├── xpath.ts        # XPath selector resolver
│   │   │   ├── fallback.ts     # Fallback chain executor
│   │   │   └── index.ts
│   │   ├── actions/            # Step action implementations
│   │   │   ├── fill.ts         # Fill action (input, textarea, select)
│   │   │   ├── click.ts        # Click action
│   │   │   ├── wait.ts         # Wait action (delay, element appears)
│   │   │   ├── verify.ts       # Verify action
│   │   │   └── index.ts
│   │   ├── engine/             # Step execution engine
│   │   │   ├── executor.ts     # Step executor
│   │   │   ├── result.ts       # Result types
│   │   │   └── index.ts
│   │   └── observers/          # DOM observation
│   │       ├── success.ts      # Success trigger detection
│   │       └── index.ts
│   │
│   ├── popup/                  # Popup UI context (React)
│   │   ├── index.tsx           # Popup entry point
│   │   ├── App.tsx             # Root component
│   │   ├── components/         # UI components
│   │   │   ├── ProjectSelector.tsx
│   │   │   ├── BatchSelector.tsx
│   │   │   ├── RowNavigator.tsx
│   │   │   ├── FillButton.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   └── AuthStatus.tsx
│   │   ├── hooks/              # Custom hooks
│   │   │   ├── useExtensionState.ts  # Subscribe to SW state
│   │   │   ├── useProjects.ts
│   │   │   ├── useBatches.ts
│   │   │   └── useFillControl.ts
│   │   └── lib/                # Utilities
│   │       └── messaging.ts    # Type-safe message sending
│   │
│   ├── shared/                 # Shared between contexts
│   │   ├── messages/           # Message type definitions
│   │   │   ├── types.ts        # Request/Response types
│   │   │   ├── auth.ts         # Auth message types
│   │   │   ├── project.ts      # Project message types
│   │   │   ├── fill.ts         # Fill message types
│   │   │   └── index.ts
│   │   ├── types/              # Domain types
│   │   │   ├── project.ts
│   │   │   ├── batch.ts
│   │   │   ├── step.ts
│   │   │   ├── fill-status.ts
│   │   │   └── index.ts
│   │   └── constants.ts        # Shared constants
│   │
│   └── options/                # Options page (future)
│       └── index.tsx
│
├── vite.config.ts              # Vite + CRXJS config
├── tsconfig.json
└── package.json
```

### Structure Rationale

- **`background/`:** Isolated Service Worker code. Cannot import DOM APIs. All API and storage access here.
- **`content/`:** Code that runs in web page context. Minimal dependencies, no framework.
- **`popup/`:** React application for extension popup. Communicates via messages only.
- **`shared/`:** Type definitions and constants shared across all contexts. No runtime code that depends on context-specific APIs.

## Message Passing Architecture

### Message Protocol

All inter-context communication uses a typed request/response protocol:

```typescript
// shared/messages/types.ts

/**
 * Base message structure
 * All messages include a unique type for routing
 */
interface BaseMessage {
  type: string;
}

/**
 * Request message (Popup/Content → Service Worker)
 */
interface RequestMessage<T extends string, P = void> extends BaseMessage {
  type: T;
  payload: P;
}

/**
 * Response wrapper (Service Worker → Popup/Content)
 */
type ResponseMessage<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Message Types

```typescript
// shared/messages/index.ts

// Auth messages
type LoginRequest = RequestMessage<'AUTH_LOGIN', { token: string }>;
type LogoutRequest = RequestMessage<'AUTH_LOGOUT'>;
type GetAuthStatusRequest = RequestMessage<'AUTH_GET_STATUS'>;

// Project messages
type GetProjectsRequest = RequestMessage<'PROJECTS_LIST'>;
type SelectProjectRequest = RequestMessage<'PROJECT_SELECT', { projectId: string }>;

// Batch messages
type GetBatchesRequest = RequestMessage<'BATCHES_LIST', { projectId: string }>;
type SelectBatchRequest = RequestMessage<'BATCH_SELECT', { batchId: string }>;

// Row messages
type GetRowsRequest = RequestMessage<'ROWS_LIST', { batchId: string; page: number }>;
type SelectRowRequest = RequestMessage<'ROW_SELECT', { rowIndex: number }>;
type NextRowRequest = RequestMessage<'ROW_NEXT'>;
type PrevRowRequest = RequestMessage<'ROW_PREV'>;

// Fill messages
type StartFillRequest = RequestMessage<'FILL_START'>;
type FillResultMessage = RequestMessage<'FILL_RESULT', {
  success: boolean;
  stepResults: StepResult[];
  error?: string;
}>;

// State sync (Service Worker → Popup)
type StateUpdateMessage = RequestMessage<'STATE_UPDATE', ExtensionState>;

// Union of all message types
type ExtensionMessage =
  | LoginRequest
  | LogoutRequest
  | GetAuthStatusRequest
  | GetProjectsRequest
  | SelectProjectRequest
  | GetBatchesRequest
  | SelectBatchRequest
  | GetRowsRequest
  | SelectRowRequest
  | NextRowRequest
  | PrevRowRequest
  | StartFillRequest
  | FillResultMessage
  | StateUpdateMessage;
```

### Message Flow Diagrams

**Flow 1: User Selects Project**

```
┌────────────┐          ┌────────────────┐          ┌───────────────┐
│   Popup    │          │ Service Worker │          │ Populatte API │
└─────┬──────┘          └───────┬────────┘          └───────┬───────┘
      │                         │                           │
      │ PROJECT_SELECT          │                           │
      │ {projectId: "abc123"}   │                           │
      │────────────────────────►│                           │
      │                         │                           │
      │                         │ GET /projects/abc123/     │
      │                         │     batches               │
      │                         │──────────────────────────►│
      │                         │                           │
      │                         │    200 OK                 │
      │                         │    [{id, name, ...}]      │
      │                         │◄──────────────────────────│
      │                         │                           │
      │                         │ chrome.storage.session    │
      │                         │ .set({currentProject})    │
      │                         │                           │
      │ STATE_UPDATE            │                           │
      │ {currentProject,        │                           │
      │  batches: [...]}        │                           │
      │◄────────────────────────│                           │
      │                         │                           │
```

**Flow 2: User Triggers Fill**

```
┌────────────┐     ┌────────────────┐     ┌────────────────┐     ┌───────────────┐
│   Popup    │     │ Service Worker │     │ Content Script │     │ Populatte API │
└─────┬──────┘     └───────┬────────┘     └───────┬────────┘     └───────┬───────┘
      │                    │                      │                      │
      │ FILL_START         │                      │                      │
      │───────────────────►│                      │                      │
      │                    │                      │                      │
      │                    │ GET /mappings?url=X  │                      │
      │                    │─────────────────────────────────────────────►│
      │                    │                      │                      │
      │                    │ 200 OK {mapping}     │                      │
      │                    │◄─────────────────────────────────────────────│
      │                    │                      │                      │
      │                    │ GET /mappings/:id/   │                      │
      │                    │     steps            │                      │
      │                    │─────────────────────────────────────────────►│
      │                    │                      │                      │
      │                    │ 200 OK [{steps}]     │                      │
      │                    │◄─────────────────────────────────────────────│
      │                    │                      │                      │
      │                    │ EXECUTE_STEPS        │                      │
      │                    │ {steps, rowData}     │                      │
      │                    │─────────────────────►│                      │
      │                    │                      │                      │
      │                    │                      │ (execute each step)  │
      │                    │                      │                      │
      │                    │ FILL_RESULT          │                      │
      │                    │ {success, results}   │                      │
      │                    │◄─────────────────────│                      │
      │                    │                      │                      │
      │                    │ PATCH /rows/:id/     │                      │
      │                    │       status         │                      │
      │                    │─────────────────────────────────────────────►│
      │                    │                      │                      │
      │ STATE_UPDATE       │                      │                      │
      │ {fillStatus}       │                      │                      │
      │◄───────────────────│                      │                      │
      │                    │                      │                      │
```

**Flow 3: Content Script Success Detection**

```
┌────────────────┐     ┌────────────────┐     ┌───────────────┐
│ Content Script │     │ Service Worker │     │   Popup       │
└───────┬────────┘     └───────┬────────┘     └───────┬───────┘
        │                      │                      │
        │ (MutationObserver    │                      │
        │  detects success)    │                      │
        │                      │                      │
        │ SUCCESS_DETECTED     │                      │
        │ {trigger: 'text',    │                      │
        │  details: {...}}     │                      │
        │─────────────────────►│                      │
        │                      │                      │
        │                      │ (update row status   │
        │                      │  via API)            │
        │                      │                      │
        │                      │ STATE_UPDATE         │
        │                      │ {fillStatus:         │
        │                      │  'success'}          │
        │                      │─────────────────────►│
        │                      │                      │
```

## State Management

### State Storage Strategy

| State Type | Storage | Lifetime | Access Pattern |
|------------|---------|----------|----------------|
| Auth token | `chrome.storage.local` | Persisted | Service Worker reads on startup |
| User preferences | `chrome.storage.local` | Persisted | Service Worker reads on startup |
| Current project | `chrome.storage.session` | Browser session | Service Worker manages, broadcasts |
| Current batch | `chrome.storage.session` | Browser session | Service Worker manages, broadcasts |
| Current row index | `chrome.storage.session` | Browser session | Service Worker manages, broadcasts |
| Fill status | `chrome.storage.session` | Browser session | Service Worker manages, broadcasts |
| Rows cache | `chrome.storage.session` | Browser session | Service Worker manages |

### State Shape

```typescript
// Session state (chrome.storage.session)
interface SessionState {
  // Selection state
  currentProjectId: string | null;
  currentBatchId: string | null;
  currentRowIndex: number;

  // Fill state
  fillStatus: FillStatus;
  lastFillResult: FillResult | null;

  // Cached data (avoid refetch on popup reopen)
  projects: ProjectSummary[] | null;
  batches: BatchSummary[] | null;
  rows: Row[] | null;
  rowsTotal: number;
  currentMapping: Mapping | null;
  currentSteps: Step[] | null;
}

// Persisted state (chrome.storage.local)
interface LocalState {
  authToken: string | null;
  lastProjectId: string | null;  // Remember last selection
  preferences: {
    autoAdvance: boolean;  // Auto-advance to next row after fill
    confirmBeforeFill: boolean;
  };
}

// Fill status enum
enum FillStatus {
  Idle = 'idle',
  Pending = 'pending',
  Filling = 'filling',
  Success = 'success',
  PartialSuccess = 'partial_success',
  Failed = 'failed',
}
```

### Service Worker State Management

```typescript
// background/state/storage.ts

const SESSION_KEY = 'populatte_session';
const LOCAL_KEY = 'populatte_local';

class StateManager {
  private sessionState: SessionState;
  private localState: LocalState;
  private listeners: Set<(state: SessionState) => void> = new Set();

  async initialize(): Promise<void> {
    // Load persisted state
    const local = await chrome.storage.local.get(LOCAL_KEY);
    this.localState = local[LOCAL_KEY] ?? defaultLocalState;

    // Load session state (may be empty on browser restart)
    const session = await chrome.storage.session.get(SESSION_KEY);
    this.sessionState = session[SESSION_KEY] ?? defaultSessionState;

    // Listen for changes from other contexts (rare, but possible)
    chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
  }

  async updateSession(partial: Partial<SessionState>): Promise<void> {
    this.sessionState = { ...this.sessionState, ...partial };
    await chrome.storage.session.set({ [SESSION_KEY]: this.sessionState });
    this.broadcast();
  }

  async updateLocal(partial: Partial<LocalState>): Promise<void> {
    this.localState = { ...this.localState, ...partial };
    await chrome.storage.local.set({ [LOCAL_KEY]: this.localState });
  }

  private broadcast(): void {
    // Notify popup via message
    chrome.runtime.sendMessage({
      type: 'STATE_UPDATE',
      payload: this.sessionState,
    }).catch(() => {
      // Popup not open, ignore
    });
  }

  getSession(): SessionState {
    return this.sessionState;
  }

  getLocal(): LocalState {
    return this.localState;
  }
}

export const stateManager = new StateManager();
```

### Popup State Subscription

```typescript
// popup/hooks/useExtensionState.ts
import { useState, useEffect } from 'react';
import type { SessionState } from '@/shared/types';

export function useExtensionState(): SessionState | null {
  const [state, setState] = useState<SessionState | null>(null);

  useEffect(() => {
    // Request initial state
    chrome.runtime.sendMessage({ type: 'GET_STATE' })
      .then((response) => {
        if (response.success) {
          setState(response.data);
        }
      });

    // Listen for updates
    const listener = (message: any) => {
      if (message.type === 'STATE_UPDATE') {
        setState(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return state;
}
```

## API Integration

### Authentication Flow

The extension shares authentication with the web dashboard via Clerk.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION OPTIONS                                 │
│                                                                                  │
│  Option A: Token Passthrough from Web App                                        │
│  ─────────────────────────────────────────                                       │
│  1. User logs in to web dashboard (Clerk)                                        │
│  2. Web dashboard sends JWT to extension via postMessage                         │
│  3. Extension stores JWT in chrome.storage.local                                 │
│  4. Extension uses JWT for API calls                                             │
│                                                                                  │
│  Pros: Simple, reuses existing auth                                              │
│  Cons: Requires web app open, token expiry handling                              │
│                                                                                  │
│  ────────────────────────────────────────────────────────────────────────────    │
│                                                                                  │
│  Option B: Clerk Extension Auth (RECOMMENDED)                                    │
│  ────────────────────────────────────────────                                    │
│  1. Extension popup uses Clerk's extension SDK                                   │
│  2. Clerk handles OAuth flow in popup                                            │
│  3. Extension receives session token directly                                    │
│  4. Token auto-refreshes via Clerk                                               │
│                                                                                  │
│  Pros: Self-contained, proper token lifecycle                                    │
│  Cons: Requires Clerk extension setup                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Recommended: Option B (Clerk Extension Auth)**

Clerk provides first-class Chrome Extension support via `@clerk/chrome-extension` package.

### API Client Implementation

```typescript
// background/api/client.ts

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';

interface ApiClientConfig {
  getToken: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await config.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: (path: string) => request<void>('DELETE', path),
  };
}
```

### API Endpoints Used

```typescript
// background/api/endpoints.ts

export function createEndpoints(client: ReturnType<typeof createApiClient>) {
  return {
    // Projects
    listProjects: () =>
      client.get<{ data: ProjectSummary[] }>('/projects'),

    // Batches
    listBatches: (projectId: string) =>
      client.get<{ data: BatchSummary[] }>(`/projects/${projectId}/batches`),

    getBatch: (projectId: string, batchId: string) =>
      client.get<Batch>(`/projects/${projectId}/batches/${batchId}`),

    // Rows
    listRows: (projectId: string, batchId: string, limit: number, offset: number) =>
      client.get<{ data: Row[]; total: number }>(
        `/projects/${projectId}/batches/${batchId}/rows?limit=${limit}&offset=${offset}`
      ),

    // Mappings
    findMappingByUrl: (projectId: string, targetUrl: string) =>
      client.get<{ data: Mapping[] }>(
        `/projects/${projectId}/mappings?targetUrl=${encodeURIComponent(targetUrl)}&isActive=true`
      ),

    getMappingWithSteps: (mappingId: string) =>
      client.get<{ mapping: Mapping; steps: Step[] }>(`/mappings/${mappingId}/full`),

    // Row status update (NEW endpoint needed)
    updateRowStatus: (rowId: string, status: RowFillStatus) =>
      client.patch<Row>(`/rows/${rowId}/status`, { fillStatus: status }),
  };
}
```

## Content Script Architecture

### Step Execution Engine

```typescript
// content/engine/executor.ts

import { resolveSelector } from '../selectors';
import { executeAction } from '../actions';
import type { Step, StepResult, Row } from '@/shared/types';

export async function executeSteps(
  steps: Step[],
  rowData: Record<string, unknown>
): Promise<StepResult[]> {
  const results: StepResult[] = [];

  for (const step of steps.sort((a, b) => a.stepOrder - b.stepOrder)) {
    const result = await executeStep(step, rowData);
    results.push(result);

    // Stop on non-optional step failure
    if (!result.success && !step.optional) {
      break;
    }
  }

  return results;
}

async function executeStep(
  step: Step,
  rowData: Record<string, unknown>
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // 1. Resolve element using selector with fallbacks
    const element = await resolveSelector(step.selector, step.selectorFallbacks);

    if (!element) {
      if (step.optional) {
        return {
          stepId: step.id,
          success: true,
          skipped: true,
          reason: 'Element not found (optional step)',
        };
      }
      return {
        stepId: step.id,
        success: false,
        error: `Element not found: ${step.selector.value}`,
      };
    }

    // 2. Determine value (from row data or fixed value)
    const value = step.sourceFieldKey
      ? String(rowData[step.sourceFieldKey] ?? '')
      : step.fixedValue ?? '';

    // 3. Execute the action
    await executeAction(step.action, element, value, {
      clearBefore: step.clearBefore,
      pressEnter: step.pressEnter,
      waitMs: step.waitMs,
    });

    return {
      stepId: step.id,
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      stepId: step.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}
```

### Selector Resolution Strategy

```typescript
// content/selectors/fallback.ts

import { resolveCss } from './css';
import { resolveXpath } from './xpath';
import type { SelectorEntry } from '@/shared/types';

/**
 * Resolve element using primary selector, falling back to alternatives
 * Uses XPath for stability on third-party sites
 */
export async function resolveSelector(
  primary: SelectorEntry,
  fallbacks: SelectorEntry[] = []
): Promise<Element | null> {
  const allSelectors = [primary, ...fallbacks];

  for (const selector of allSelectors) {
    const element = selector.type === 'css'
      ? resolveCss(selector.value)
      : resolveXpath(selector.value);

    if (element) {
      return element;
    }
  }

  return null;
}

// content/selectors/xpath.ts
export function resolveXpath(expression: string): Element | null {
  const result = document.evaluate(
    expression,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue as Element | null;
}

// content/selectors/css.ts
export function resolveCss(selector: string): Element | null {
  return document.querySelector(selector);
}
```

### Action Implementations

```typescript
// content/actions/fill.ts

export async function fillElement(
  element: Element,
  value: string,
  options: { clearBefore: boolean; pressEnter: boolean }
): Promise<void> {
  // Focus the element first (important for React/Vue inputs)
  if (element instanceof HTMLElement) {
    element.focus();
  }

  // Wait for focus to settle
  await delay(50);

  // Clear existing value if requested
  if (options.clearBefore) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = '';
      // Dispatch input event to notify frameworks
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Set the value
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = value;

    // Dispatch events that frameworks listen for
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element instanceof HTMLSelectElement) {
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Press Enter if requested
  if (options.pressEnter) {
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      bubbles: true,
    }));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Success Detection

```typescript
// content/observers/success.ts

import type { SuccessTrigger, SuccessConfig } from '@/shared/types';

export function observeSuccess(
  trigger: SuccessTrigger,
  config: SuccessConfig,
  onSuccess: () => void
): () => void {
  switch (trigger) {
    case 'url_change':
      return observeUrlChange(onSuccess);

    case 'text_appears':
      return observeTextAppears(config.selector!, onSuccess);

    case 'element_disappears':
      return observeElementDisappears(config.selector!, onSuccess);

    default:
      return () => {}; // No-op cleanup
  }
}

function observeUrlChange(onSuccess: () => void): () => void {
  const originalUrl = window.location.href;

  const checkUrl = () => {
    if (window.location.href !== originalUrl) {
      onSuccess();
    }
  };

  // Poll for URL changes (pushState doesn't trigger events reliably)
  const interval = setInterval(checkUrl, 500);

  return () => clearInterval(interval);
}

function observeTextAppears(selector: string, onSuccess: () => void): () => void {
  const observer = new MutationObserver(() => {
    const element = document.querySelector(selector);
    if (element) {
      onSuccess();
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => observer.disconnect();
}

function observeElementDisappears(selector: string, onSuccess: () => void): () => void {
  const element = document.querySelector(selector);
  if (!element) {
    // Already gone
    onSuccess();
    return () => {};
  }

  const observer = new MutationObserver(() => {
    if (!document.querySelector(selector)) {
      onSuccess();
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
```

## Manifest Configuration

```json
// public/manifest.json
{
  "manifest_version": 3,
  "name": "Populatte",
  "version": "1.0.0",
  "description": "Automate form-filling from Excel data",

  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],

  "host_permissions": [
    "<all_urls>"
  ],

  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },

  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],

  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global Variables in Service Worker

**What people do:** Store state in module-level variables.

```typescript
// background/index.ts
// WRONG - Lost when service worker terminates
let currentProject: Project | null = null;
let authToken: string | null = null;
```

**Why it's wrong:** Service workers are ephemeral. Chrome terminates them after 30 seconds of inactivity. All in-memory state is lost.

**Do this instead:** Use `chrome.storage.session` for session state, `chrome.storage.local` for persistent state. Reload state in service worker initialization.

### Anti-Pattern 2: Direct API Calls from Popup

**What people do:** Make fetch calls directly from popup components.

```typescript
// popup/components/ProjectList.tsx
// WRONG - Popup has no persistent state, token management complex
useEffect(() => {
  fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(setProjects);
}, []);
```

**Why it's wrong:** Token management is duplicated. Popup lifecycle is unpredictable (closes when user clicks away). Response can't update cached state.

**Do this instead:** Popup sends message to Service Worker. Service Worker makes API call, updates storage, broadcasts state.

### Anti-Pattern 3: Storing Sensitive Data in Content Script

**What people do:** Pass auth token to content script for API calls.

```typescript
// WRONG - Content script runs in web page context
chrome.tabs.sendMessage(tabId, { type: 'INIT', token: authToken });
```

**Why it's wrong:** Content scripts can be inspected by web page JavaScript. Malicious pages could intercept the token.

**Do this instead:** Content script NEVER receives tokens. All API calls go through Service Worker. Content script only receives non-sensitive instructions.

### Anti-Pattern 4: Synchronous Storage Access

**What people do:** Assume storage is synchronous like localStorage.

```typescript
// WRONG - chrome.storage is async, this returns undefined
const token = chrome.storage.local.get('token');
```

**Why it's wrong:** `chrome.storage` is always asynchronous. Returns a Promise, not the value directly.

**Do this instead:** Always await storage operations.

```typescript
const result = await chrome.storage.local.get('token');
const token = result.token;
```

### Anti-Pattern 5: Not Handling Service Worker Restart

**What people do:** Assume message handlers are always registered.

```typescript
// WRONG - If SW restarts, message handlers need re-registration
chrome.runtime.onMessage.addListener(handleMessage);
// ... later code assumes handler is active
```

**Why it's wrong:** When service worker restarts, all listeners need to be re-registered. If a message arrives before registration, it's lost.

**Do this instead:** Register ALL message handlers at the top level of the service worker entry point. Handle state restoration separately.

```typescript
// background/index.ts
// CORRECT - Handlers registered immediately on SW load
chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onInstalled.addListener(handleInstall);

// State restoration is async, but handlers are sync
stateManager.initialize().then(() => {
  console.log('State restored');
});
```

## Build Order (Recommended Implementation Sequence)

### Phase 1: Extension Scaffold

**Goal:** Extension loads, popup opens, basic structure in place.

1. Create `apps/extension` directory with CRXJS + Vite setup
2. Create manifest.json with basic permissions
3. Create empty service worker entry point
4. Create React popup with "Hello Populatte" placeholder
5. Verify extension loads in Chrome

### Phase 2: Message Infrastructure

**Goal:** Type-safe message passing between contexts works.

6. Define message types in `shared/messages/`
7. Implement message handler registry in service worker
8. Implement `useExtensionState` hook in popup
9. Test: popup sends message, service worker responds

### Phase 3: Authentication

**Goal:** User can authenticate, token persists.

10. Set up Clerk extension SDK (or token passthrough)
11. Implement auth handlers in service worker
12. Implement auth UI in popup
13. Test: login persists across popup close/reopen

### Phase 4: Project/Batch Selection

**Goal:** User can select project and batch from popup.

14. Implement API client in service worker
15. Implement project list endpoint call
16. Implement batch list endpoint call
17. Create ProjectSelector component
18. Create BatchSelector component
19. Wire up state updates
20. Test: select project, batches load, select batch

### Phase 5: Row Navigation

**Goal:** User can navigate through rows.

21. Implement row list endpoint call (paginated)
22. Create RowNavigator component (prev/next/jump)
23. Display current row data preview
24. Test: navigate through rows, see data change

### Phase 6: Content Script Foundation

**Goal:** Content script injects, receives messages.

25. Create content script entry point
26. Implement message listener in content script
27. Implement basic selector resolution (CSS + XPath)
28. Test: service worker can ping content script

### Phase 7: Step Execution

**Goal:** Extension can fill a form.

29. Implement step executor in content script
30. Implement fill action
31. Implement click action
32. Implement wait action
33. Wire up FILL_START flow in service worker
34. Test: trigger fill, see form populated

### Phase 8: Success Detection

**Goal:** Extension detects successful form submission.

35. Implement success observers (URL change, text appears, element disappears)
36. Wire up success detection in fill flow
37. Implement row status update API call
38. Test: fill form, submit, see status update

### Phase 9: Polish and Error Handling

**Goal:** Robust error handling, good UX.

39. Add loading states to popup
40. Add error handling and user feedback
41. Implement retry logic for failed steps
42. Add "no mapping found" state
43. Test edge cases

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Populatte API | Bearer token auth via fetch | Service Worker makes all calls |
| Clerk | Extension SDK or token passthrough | Handles OAuth flow, token refresh |
| Target websites | Content Script DOM access | No direct integration, just DOM manipulation |

### Internal Boundaries (Extension Contexts)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Popup <-> Service Worker | `chrome.runtime.sendMessage` | Request/response, state broadcasts |
| Service Worker <-> Content Script | `chrome.tabs.sendMessage` | Instructions down, results up |
| Content Script <-> DOM | Direct API access | Standard DOM APIs |
| Service Worker <-> Storage | `chrome.storage` API | Async, session vs local |

### API Endpoints to Add (Backend)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /mappings/:id/full` | Get mapping with steps in one call | High |
| `PATCH /rows/:id/status` | Update row fill status | High |
| `GET /projects/:id/mappings?targetUrl=X` | Already exists (line 74 of mapping.controller.ts) | Exists |

## Scalability Considerations

| Concern | At 10 rows | At 1K rows | At 100K rows |
|---------|------------|------------|--------------|
| **Row loading** | Instant | Paginate (50/page) | Paginate, virtual scroll in popup |
| **Step execution** | < 1s | < 1s | < 1s (per-form, not per-row) |
| **State storage** | < 1KB | < 100KB | 100KB limit on session, consider chunking |
| **Memory (content script)** | Negligible | Negligible | Negligible (stateless) |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Message passing** | HIGH | Official Chrome documentation, well-established pattern |
| **Service Worker state** | HIGH | chrome.storage.session recommended by Chrome team |
| **Content Script isolation** | HIGH | MV3 enforced isolation, documented behavior |
| **Selector strategies** | HIGH | XPath superiority for third-party sites well-documented |
| **React framework interaction** | MEDIUM | Focus + dispatch events usually work, edge cases exist |
| **Clerk extension auth** | MEDIUM | Depends on Clerk SDK support, may need fallback |
| **CRXJS stability** | MEDIUM | Recent revival but history of issues; WXT alternative exists |

## Gaps to Address

1. **Clerk Extension SDK:** Verify `@clerk/chrome-extension` supports MV3 and current Clerk version
2. **API endpoint for row status:** Need to add `PATCH /rows/:id/status` to NestJS API
3. **Mapping lookup by URL:** Verify existing endpoint handles URL matching correctly
4. **Rate limiting:** Consider rate limiting fill operations to avoid triggering anti-bot detection
5. **Error recovery:** Define behavior when service worker restarts mid-fill

## Sources

**Chrome Extension Documentation:**
- [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)

**Architecture Guides:**
- [Chrome Extension Development: Complete System Architecture Guide 2026](https://jinlow.medium.com/chrome-extension-development-the-complete-system-architecture-guide-for-2026-9ae81415f93e)
- [Building Reliable Content Scripts: XPath vs CSS](https://dev.to/jaymalli_programmer/building-reliable-content-scripts-why-xpath-beats-queryselector-in-chrome-extensions-14ol)
- [State Storage in Chrome Extensions](https://hackernoon.com/state-storage-in-chrome-extensions-options-limits-and-best-practices)

**Framework Comparisons:**
- [2025 State of Browser Extension Frameworks: Plasmo, WXT, CRXJS](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- [CRXJS Getting Started](https://deepwiki.com/crxjs/chrome-extension-tools/5.1-getting-started)

**Authentication:**
- [Chrome Extension Manifest V3 Auth0 Discussion](https://community.auth0.com/t/chrome-extension-manifest-v3-using-auth0-in-a-secure-manner/125433)
- [Authenticate Chrome Extension via Web App](https://medium.com/the-andela-way/authenticate-your-chrome-extension-user-through-your-web-app-dbdb96224e41)

**Form Automation:**
- [Testofill Chrome Extension](https://github.com/holyjak/Testofill-chrome-extension)
- [Lightning Autofill Documentation](https://www.tohodo.com/autofill/)

---
*Architecture research for: Chrome Extension MVP*
*Researched: 2026-02-03*
