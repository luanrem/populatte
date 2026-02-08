# Phase 39: Aba Captura - Research

**Researched:** 2026-02-08
**Domain:** Chrome Extension Side Panel + Capture Mode Migration + React State Persistence
**Confidence:** HIGH

## Summary

This phase migrates the existing v5.0 capture mode UI into the Side Panel's Captura tab. The critical insight is that this is NOT a new feature build — the capture components, content scripts, and background handlers already exist from the Mapping Builder milestone. The research covers three domains: (1) WXT Side Panel architecture and tab-based UI patterns already established in Phases 35-38, (2) React state management for capture mode with chrome.storage.session persistence to survive panel reloads, and (3) content script integration for element capture with port-based communication.

The existing capture components (`CapturePanel.tsx`, `StepList.tsx`, `StepConfig.tsx`) are already in `entrypoints/sidepanel/components/capture/` and work in the Side Panel. The main architectural shift is that v5.0 capture mode was designed for a popup that closed on page interaction — now it must work in a Side Panel that stays open persistently. This is already solved: the Side Panel's persistent nature is exactly what enables the capture workflow to function without losing state when users click on page elements.

**Primary recommendation:** Activate the existing capture UI by wiring the "Criar Mapping" button to start capture mode, auto-switching to the Captura tab with active state indicators. Capture state already persists via chrome.storage.session. Content script integration for element highlighting and step capture already works. Main work is UI activation flow, tab switching, and cleanup handlers.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.13 (installed) | Extension framework with sidepanel support | Already used, handles manifest generation |
| React | 19.2.0 (installed) | UI rendering in sidepanel | Already used for all components |
| @dnd-kit/core + @dnd-kit/sortable | 6.3.1 + 10.0.0 (installed) | Drag-and-drop step reordering | Already used in Phase 37 for Preencher steps |
| chrome.storage.session | MV3 native | Ephemeral capture state persistence | Survives panel close/reopen but not browser restart |
| chrome.runtime.connect/Port | MV3 native | Sidepanel ↔ background communication | Already established in Phase 35 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrome.tabs.sendMessage | MV3 native | Background → content script messaging | Capture start/stop commands |
| chrome.storage.onChanged | MV3 native | Cross-context state sync | Content script → sidepanel step updates |
| lucide-react | 0.555.0 (installed) | Icons for capture UI | Already used for all UI icons |
| css-selector-generator | 3.8.0 (installed) | Generate CSS selectors from DOM elements | Already used in content script capture |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chrome.storage.session (recommended) | In-memory React state only | Session storage survives panel close/reopen, pure React state doesn't |
| Port-based messaging (recommended) | chrome.runtime.sendMessage for all | Ports enable lifecycle detection and bidirectional streaming; sendMessage is one-shot |
| @dnd-kit (recommended) | react-beautiful-dnd | dnd-kit is modern, performant, and already installed; react-beautiful-dnd is deprecated |

**No new installations needed.** All required libraries are already in the project.

## Architecture Patterns

### Recommended UI Structure (Already Implemented)
```
entrypoints/sidepanel/
  App.tsx                          # Main container with tab state
  components/
    TabBar.tsx                     # Tab switcher with capture active indicator
    capture/                       # Capture mode components (ALREADY EXIST)
      CapturePanel.tsx             # Main capture UI container
      StepList.tsx                 # Sortable steps list with @dnd-kit
      StepConfig.tsx               # Step configuration form
    preencher/                     # Fill mode components
      PreencherStepList.tsx        # Read-only steps display
      RecentesList.tsx             # Recent rows list
```

### Pattern 1: Tab-Based Capture Mode Activation
**What:** The "Criar Mapping" button starts capture mode and automatically switches to the Captura tab with a blue pulsing dot indicator.
**When to use:** When batch is selected but no mapping exists for current URL.
**Already implemented:** Tab switching logic exists in App.tsx, TabBar.tsx shows pulsing dot when captureActive prop is true.
**Example:**
```typescript
// In App.tsx (ALREADY EXISTS)
async function handleEnterCaptureMode() {
  if (!portRef.current || !state?.batchId || !state?.projectId) {
    setError('Select a batch first');
    return;
  }

  // Optimistic UI update: switch tab and mode immediately
  setActiveTab('captura');
  setCaptureMode(true);

  try {
    // Fetch batch columns
    const batch = await fetchBatchDetail(state.projectId, state.batchId);
    const columns = batch.columnMetadata.map((c) => c.header || c.key);
    setBatchColumns(columns);

    // Start capture mode in content script
    await sendViaPort(portRef.current, {
      type: 'CAPTURE_START',
      payload: { batchColumns: columns }
    });

    // Persist capture mode state to session storage
    await chrome.storage.session.set({
      captureMode: true,
      batchColumns: columns,
      capturedSteps: [],
      captureMappingName: '',
    });
  } catch (err) {
    // Rollback on failure
    setCaptureMode(false);
    setActiveTab('preencher');
    setError(err instanceof Error ? err.message : 'Failed to start capture mode');
  }
}
```
Source: Existing codebase at `apps/extension/entrypoints/sidepanel/App.tsx` lines 436-469

### Pattern 2: chrome.storage.session for Capture State Persistence
**What:** Capture state (steps, mapping name, batch columns) is saved to chrome.storage.session so it survives panel close/reopen but not browser restart.
**When to use:** Always for capture mode state — this enables the core benefit of Side Panel (persistence while clicking on page).
**Critical insight:** Session storage is ephemeral (browser session lifetime) but survives panel close/reopen. This is perfect for capture mode: user can click elements, panel stays open, and if panel accidentally closes, state is restored on reopen.
**Example:**
```typescript
// Save capture state on mode entry
await chrome.storage.session.set({
  captureMode: true,
  batchColumns: columns,
  capturedSteps: [],
  captureMappingName: '',
});

// Restore on panel mount (in useEffect)
chrome.storage.session.get(['captureMode', 'batchColumns']).then((data) => {
  if (data.captureMode) {
    setCaptureMode(true);
    setBatchColumns(data.batchColumns ?? []);
    setActiveTab('captura'); // Auto-switch to Captura tab
  }
});

// Clear on mode exit or save
await chrome.storage.session.remove([
  'captureMode',
  'batchColumns',
  'capturedSteps',
  'captureMappingName'
]);
```
Source: Existing pattern in `apps/extension/entrypoints/sidepanel/App.tsx` lines 239-256, 457-462, 474, 483, 525

### Pattern 3: Storage.onChanged for Content Script → Sidepanel Sync
**What:** When content script captures an element, it saves the step to chrome.storage.session. The sidepanel listens to storage.onChanged to detect new steps without relying on message passing.
**When to use:** Content script element capture → sidepanel step list updates.
**Why this pattern:** More reliable than message passing because storage is a single source of truth. Works even if sidepanel was closed during capture and reopens later.
**Example:**
```typescript
// SIDEPANEL: Listen for storage changes
useEffect(() => {
  const handleStorageChange = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== 'session') return;

    if (changes.capturedSteps) {
      const newSteps = changes.capturedSteps.newValue as CaptureStep[];
      setSteps((currentSteps) => {
        // Only update if content script added a new step
        if (newSteps.length > currentSteps.length) {
          const latestStep = newSteps[newSteps.length - 1];
          if (latestStep) {
            // Open config for the newly captured step
            setEditingStep(latestStep);
            setShowConfig(true);
          }
          return newSteps;
        }
        return currentSteps;
      });
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);
  return () => chrome.storage.onChanged.removeListener(handleStorageChange);
}, []);
```
Source: Existing pattern in `apps/extension/entrypoints/sidepanel/components/capture/CapturePanel.tsx` lines 95-132

### Pattern 4: TabBar Active State Indicator
**What:** The Captura tab shows a blue pulsing dot when capture mode is active and is disabled (with tooltip) when inactive.
**When to use:** Always — provides visual feedback of capture state.
**Already implemented:** TabBar.tsx accepts captureActive prop.
**Example:**
```typescript
// In TabBar.tsx (ALREADY EXISTS)
<button
  type="button"
  onClick={() => handleTabClick('captura')}
  className={`...`}
>
  <Target className="w-4 h-4" />
  <span>Captura</span>
  {/* Pulsing dot badge when capture is active */}
  {captureActive && (
    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
  )}
  {/* Tooltip when disabled */}
  {!captureActive && (
    <span className="...tooltip...">
      Inicie a captura primeiro
    </span>
  )}
</button>
```
Source: Existing code at `apps/extension/entrypoints/sidepanel/components/TabBar.tsx` lines 55-86

### Pattern 5: Finalizar/Cancelar with Confirmation
**What:** "Finalizar" saves the mapping and returns to Preencher tab. "Cancelar" shows confirmation dialog if steps exist.
**When to use:** Capture mode exit flows.
**Already implemented:** CapturePanel.tsx has save/cancel handlers with confirmation logic.
**Example:**
```typescript
// In CapturePanel.tsx (ALREADY EXISTS)
const handleCancelClick = useCallback(() => {
  if (steps.length > 0) {
    setShowCancelConfirm(true); // Show confirmation modal
  } else {
    onCancel(); // Exit immediately if no steps
  }
}, [steps.length, onCancel]);

const handleSave = useCallback(async () => {
  // Validation
  if (!mappingName.trim() || steps.length === 0) return;

  setIsSaving(true);
  try {
    const result = await onSave(mappingName.trim(), steps);
    setSavedMapping({ id: result.id, name: mappingName.trim() });
    // Success screen with "Começar a Preencher" button shown
  } catch (err) {
    setSaveError(err instanceof Error ? err.message : 'Failed to save mapping');
  } finally {
    setIsSaving(false);
  }
}, [mappingName, steps, onSave]);
```
Source: Existing code at `apps/extension/entrypoints/sidepanel/components/capture/CapturePanel.tsx` lines 252-313

### Pattern 6: Content Script Capture Integration
**What:** Content script (capture-mode.ts) handles element highlighting and selector generation. Background script relays ELEMENT_CAPTURED messages to storage for sidepanel sync.
**When to use:** Element capture flow.
**Already implemented:** Content script has CaptureMode class with activate/deactivate, background script has ELEMENT_CAPTURED handler.
**Example:**
```typescript
// CONTENT SCRIPT: Send captured element to background
chrome.runtime.sendMessage({
  type: 'ELEMENT_CAPTURED',
  payload: {
    id: crypto.randomUUID(),
    stepNumber: this.capturedElements.size,
    action: action,
    selector: selector.primary,
    fallbacks: selector.fallbacks,
    elementType: elementType,
    elementName: elementName,
    optional: false,
    clearBefore: false,
    pressEnter: false,
  },
});

// BACKGROUND: Save to storage for sidepanel sync
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ELEMENT_CAPTURED') {
    chrome.storage.session.get(['capturedSteps']).then((data) => {
      const steps = data.capturedSteps ?? [];
      const updatedSteps = [...steps, message.payload];
      chrome.storage.session.set({ capturedSteps: updatedSteps });
    });
  }
});
```
Source: Existing pattern in `apps/extension/src/content/capture/capture-mode.ts` lines 249-259 and background.ts capture handler

### Anti-Patterns to Avoid
- **Direct DOM manipulation in sidepanel:** All page interaction happens via content script. Sidepanel is isolated.
- **Relying on message passing for state sync:** Use storage.onChanged as primary sync mechanism. Messages can be missed if panel is closed.
- **Storing capture state in chrome.storage.local:** Capture is ephemeral (session lifetime). Use storage.session.
- **Allowing capture mode when no batch selected:** Batch columns are required for step configuration. Guard the "Criar Mapping" button.
- **Not clearing session storage on save:** Stale capture state can interfere with future captures. Always clear on save/cancel.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step reordering UI | Custom drag-and-drop | @dnd-kit sortable preset (already used in Phase 37) | Accessible, performant, handles keyboard, touch, and mouse |
| Capture state persistence | In-memory React state | chrome.storage.session + storage.onChanged | Survives panel close/reopen, single source of truth |
| Element selector generation | Manual selector building | css-selector-generator library (already installed) | Handles edge cases, generates fallback selectors |
| Tab switching with disabled states | Manual button state management | TabBar component (already implemented) | Handles disabled state, tooltips, active indicators |
| Capture mode lifecycle | Custom state machine | Existing background CAPTURE_START/STOP handlers | Already integrated with content script |

**Key insight:** Almost all the code for Phase 39 already exists. The work is activation (wiring buttons), not building new features.

## Common Pitfalls

### Pitfall 1: Assuming Capture State is Lost on Panel Close
**What goes wrong:** Developer adds complex state recovery logic assuming panel close destroys capture state.
**Why it happens:** Confusion between popup behavior (state lost on close) and Side Panel behavior (state persists in session storage).
**How to avoid:** The existing pattern already solves this: chrome.storage.session persists capture state across panel close/reopen. On mount, App.tsx restores state from session storage. No additional recovery logic needed.
**Warning signs:** Duplicate state management, complex "resume capture" flows.

### Pitfall 2: Message Passing Race Conditions
**What goes wrong:** Sidepanel misses ELEMENT_CAPTURED messages if panel is closed when message is sent.
**Why it happens:** chrome.runtime.sendMessage is fire-and-forget with no guaranteed delivery.
**How to avoid:** The existing pattern uses storage.onChanged as the primary sync mechanism. Content script captures element → background saves to storage.session → sidepanel detects change via onChanged listener. Message passing is backup only.
**Warning signs:** Steps not appearing in sidepanel after capture, intermittent sync failures.

### Pitfall 3: Tab Switch Confusion During Capture
**What goes wrong:** User starts capture, switches to Preencher tab, and wonders why clicking elements does nothing.
**Why it happens:** Capture is active but user doesn't realize it because they're on the wrong tab.
**How to avoid:** The TabBar shows a blue pulsing dot on Captura tab when capture is active (even when on Preencher tab). Consider: on ELEMENT_CAPTURED, auto-switch to Captura tab if user is on Preencher (this is NOT currently implemented but could improve UX).
**Warning signs:** User reports "capture mode not working" when actually on wrong tab.

### Pitfall 4: Batch Columns Not Available for New Steps
**What goes wrong:** User starts capture, panel closes, reopens, and batch columns are empty when configuring a step.
**Why it happens:** Batch columns are only stored in session storage on capture mode entry. If panel reopens after background script restart, columns might not be restored.
**How to avoid:** The existing pattern saves batchColumns to session storage on capture mode entry and restores on mount. Verify this works across service worker restarts. If columns are missing, could fall back to re-fetching batch detail using stored projectId/batchId.
**Warning signs:** Empty column dropdown in StepConfig, "No columns available" message.

### Pitfall 5: Stale Capture State Across Sessions
**What goes wrong:** User saves a mapping, closes browser, reopens, and sees stale capture state from previous session.
**Why it happens:** chrome.storage.session should clear on browser restart but there's a timing window.
**How to avoid:** The existing pattern clears session storage on save/cancel. Additionally, on panel mount, check if captureMode is true but projectId/batchId no longer match current selection — if mismatch, clear stale state.
**Warning signs:** "Ghost" capture state, old steps appearing after browser restart.

### Pitfall 6: Content Script Not Loaded on Page
**What goes wrong:** User clicks "Criar Mapping", capture mode starts, but clicking elements does nothing.
**Why it happens:** Content script isn't injected on the current page (e.g., chrome:// URLs, extension pages, or script injection failed).
**How to avoid:** Guard "Criar Mapping" button: only enable if tab URL is valid (not chrome://, chrome-extension://, etc.). On CAPTURE_START, verify content script is ready by sending a ping message and waiting for response. If no response, show error "Cannot capture on this page."
**Warning signs:** Capture mode starts but element highlighting never appears.

## Code Examples

Verified patterns from existing codebase:

### Capture Mode Entry with Tab Switch
```typescript
// Source: apps/extension/entrypoints/sidepanel/App.tsx (lines 436-469)
async function handleEnterCaptureMode() {
  if (!portRef.current || !state?.batchId || !state?.projectId) {
    setError('Select a batch first');
    return;
  }

  // Optimistic UI update: switch tab and mode immediately
  setActiveTab('captura');
  setCaptureMode(true);

  try {
    // Fetch batch columns for step configuration
    const batch = await fetchBatchDetail(state.projectId, state.batchId);
    const columns = batch.columnMetadata.map((c) => c.header || c.key);
    setBatchColumns(columns);

    // Start capture mode in content script
    await sendViaPort(portRef.current, {
      type: 'CAPTURE_START',
      payload: { batchColumns: columns }
    });

    // Persist to session storage (survives panel close/reopen)
    await chrome.storage.session.set({
      captureMode: true,
      batchColumns: columns,
      capturedSteps: [],
      captureMappingName: '',
    });
  } catch (err) {
    // Rollback on failure
    setCaptureMode(false);
    setActiveTab('preencher');
    setError(err instanceof Error ? err.message : 'Failed to start capture mode');
  }
}
```

### State Restoration on Panel Mount
```typescript
// Source: apps/extension/entrypoints/sidepanel/App.tsx (lines 239-256)
useEffect(() => {
  // Restore capture mode state from session storage
  chrome.storage.session.get(['captureMode', 'batchColumns']).then((data) => {
    if (data.captureMode) {
      const cols = data.batchColumns ?? [];
      setCaptureMode(true);
      setBatchColumns(cols);
      // Auto-switch to Captura tab when restoring active capture mode
      setActiveTab('captura');
    }
  }).catch((err) => {
    console.error('Failed to restore from storage:', err);
  });
}, []);
```

### Storage-Based Step Sync
```typescript
// Source: apps/extension/entrypoints/sidepanel/components/capture/CapturePanel.tsx (lines 95-132)
useEffect(() => {
  const handleStorageChange = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    // Only handle session storage changes
    if (areaName !== 'session') return;

    if (changes.capturedSteps) {
      const newSteps = changes.capturedSteps.newValue as CaptureStep[];

      if (newSteps && newSteps.length > 0) {
        // Only update if content script added a new step (length increased)
        setSteps((currentSteps) => {
          if (newSteps.length > currentSteps.length) {
            // Get the newly added step for config
            const latestStep = newSteps[newSteps.length - 1];
            if (latestStep) {
              setEditingStep(latestStep);
              setShowConfig(true);
            }
            return newSteps;
          }
          return currentSteps;
        });
      }
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);
  return () => chrome.storage.onChanged.removeListener(handleStorageChange);
}, []);
```

### Drag-and-Drop Step Reordering
```typescript
// Source: apps/extension/entrypoints/sidepanel/components/capture/StepList.tsx (lines 231-246)
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    // Reorder and update step numbers
    const reordered = arrayMove(steps, oldIndex, newIndex).map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));

    onReorder(reordered);
  }
}
```

### Finalizar (Save) with Success State
```typescript
// Source: apps/extension/entrypoints/sidepanel/components/capture/CapturePanel.tsx (lines 267-313)
const handleSave = useCallback(async () => {
  if (!mappingName.trim() || steps.length === 0) return;

  // Validate all steps before saving
  for (const step of steps) {
    if (step.action === 'fill' && !step.sourceFieldKey && !step.fixedValue) {
      setSaveError('All fill steps must have a source column or fixed value');
      return;
    }
    if (step.action !== 'wait' && !step.selector?.value) {
      setSaveError('All steps must have a valid selector');
      return;
    }
  }

  setIsSaving(true);
  setSaveError(null);

  try {
    const result = await onSave(mappingName.trim(), steps);
    // Show success screen with "Começar a Preencher" button
    setSavedMapping({ id: result.id, name: mappingName.trim() });
  } catch (err) {
    setSaveError(err instanceof Error ? err.message : 'Failed to save mapping');
  } finally {
    setIsSaving(false);
  }
}, [mappingName, steps, onSave]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Popup-based capture (v5.0) | Side Panel capture (Phase 39) | This phase | Capture state persists while clicking on page (core value prop) |
| Message passing for step sync | storage.onChanged primary, messages backup | Phase 35-39 evolution | Reliable sync even if panel closes during capture |
| Global capture state | Session storage scoped state | This phase | Multiple tabs can have independent capture sessions |
| Manual drag-drop | @dnd-kit sortable preset | Phase 37 (reused here) | Accessible, performant, supports keyboard/touch |
| Polling for content script state | chrome.storage.onChanged events | MV3 best practice | Event-driven, no polling overhead |

**Deprecated/outdated:**
- Popup-based capture mode: Replaced by Side Panel capture (this phase). Popup closed on page click, losing state.
- Global module-level capture state in background: Now scoped to session storage, enables multi-tab independence.

## Open Questions

Things that could not be fully resolved:

1. **Auto-switch to Captura tab on element capture**
   - What we know: TabBar shows pulsing dot when capture is active, even if user is on Preencher tab.
   - What's unclear: Should ELEMENT_CAPTURED trigger auto-switch to Captura tab if user is currently on Preencher?
   - Recommendation: Start WITHOUT auto-switch. If user reports confusion, add auto-switch in follow-up. Pulsing dot is already strong visual feedback.

2. **Content script readiness check**
   - What we know: CAPTURE_START sends message to content script, but no confirmation if content script is loaded.
   - What's unclear: How to reliably detect if content script is ready before starting capture.
   - Recommendation: Send CAPTURE_START with response callback. If no response within 500ms, show error "Cannot capture on this page (content script not loaded)." This catches chrome:// URLs and script injection failures.

3. **Batch column persistence across service worker restarts**
   - What we know: Batch columns stored in session storage on capture mode entry.
   - What's unclear: Does session storage survive background service worker restart (5-30 min lifecycle)?
   - Recommendation: Test this scenario. If columns lost on service worker restart, add fallback: on panel mount with captureMode=true but batchColumns empty, re-fetch batch detail using stored projectId/batchId.

4. **Multiple simultaneous captures (multi-tab)**
   - What we know: Session storage is global (not per-tab). If user starts capture on Tab A, switches to Tab B, starts capture on Tab B, both tabs share the same capturedSteps array in session storage.
   - What's unclear: Is this a problem or acceptable limitation for v1?
   - Recommendation: For Phase 39, accept single-capture limitation. User can only capture on one tab at a time. If they start capture on Tab B while Tab A has active capture, Tab B overwrites session storage. Document as known limitation. Multi-tab capture can be future enhancement with per-tab storage keys.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `apps/extension/entrypoints/sidepanel/App.tsx`, `components/capture/CapturePanel.tsx`, `components/capture/StepList.tsx`, `components/TabBar.tsx`
- Existing content script: `apps/extension/src/content/capture/capture-mode.ts`
- Existing background script: `apps/extension/entrypoints/background.ts`
- Phase 35 research: `.planning/phases/35-side-panel-setup/35-RESEARCH.md` (Side Panel architecture, port-based communication, per-tab state)
- Phase 37 context: `.planning/phases/37-aba-preencher/37-CONTEXT.md` (Preencher tab UI patterns, steps list, drag-drop)
- [Chrome storage.session API](https://developer.chrome.com/docs/extensions/reference/api/storage) - Session storage persistence behavior
- [Chrome Message Passing API](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) - Content script communication patterns

### Secondary (MEDIUM confidence)
- [WXT Framework Entrypoints Documentation](https://wxt.dev/guide/essentials/entrypoints.html) - Side panel entrypoint auto-detection
- [WXT Side Panel Extension Template (GitHub)](https://github.com/evanlong-me/sidepanel-extension-template) - Side panel + React + Tailwind reference implementation
- [@dnd-kit Sortable Documentation](https://docs.dndkit.com/presets/sortable) - Drag-and-drop best practices for React
- [Local vs Sync vs Session: Chrome Extension Storage](https://dev.to/notearthian/local-vs-sync-vs-session-which-chrome-extension-storage-should-you-use-5ec8) - Storage.session vs storage.local tradeoffs

### Tertiary (LOW confidence)
- None — all findings verified against existing codebase or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in existing code
- Architecture (capture activation): HIGH - Code already exists, just needs wiring
- Architecture (state persistence): HIGH - chrome.storage.session pattern already implemented and tested
- Content script integration: HIGH - Existing capture-mode.ts already handles element capture
- Pitfalls: HIGH - Identified from codebase analysis and storage API docs
- Multi-tab capture limitation: MEDIUM - Session storage is global, per-tab keys would require refactoring

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable domain, Chrome APIs mature, existing code doesn't change)
