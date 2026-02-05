# Phase 33: Extension Capture Mode - Research

**Researched:** 2026-02-05
**Domain:** Browser extension content script interactions, DOM element highlighting, CSS selector generation, drag-and-drop UI
**Confidence:** HIGH

## Summary

Extension capture mode enables users to click form elements in web pages to build form-filling mappings. The implementation requires four main technical components: (1) content script element highlighting with overlays, (2) robust CSS selector generation, (3) popup-to-content script messaging via Chrome's runtime API, and (4) drag-and-drop step reordering.

The standard approach uses a content script that injects event listeners and CSS overlays for element highlighting, generates selectors using a progressive algorithm (ID → class → tag → nth-child), communicates with the popup via `chrome.runtime.sendMessage()`, and implements drag-and-drop with dnd-kit (already in project dependencies). Key challenges include handling scroll/resize for badge positioning, preventing selector brittleness in dynamic pages, and managing content script lifecycle in SPAs.

**Primary recommendation:** Use `css-selector-generator` for selector generation, implement badge positioning with IntersectionObserver (not getBoundingClientRect polling), communicate via one-time messages (not long-lived connections), and reuse existing dnd-kit implementation from web app.

## Standard Stack

The established libraries/tools for browser extension capture mode:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| css-selector-generator | 3.x | Generate unique CSS selectors from DOM elements | Battle-tested selector algorithm with fallback chains, used by browser devtools and testing tools |
| @dnd-kit/core | 6.3.1 | Drag-and-drop functionality | Already in project, modern alternative to HTML5 DnD API, touch-friendly |
| @dnd-kit/sortable | 10.0.0 | Sortable list preset | Simplifies reorderable step lists |
| Chrome runtime API | Manifest V3 | Popup ↔ content script messaging | Native API, required for cross-context communication |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| IntersectionObserver | Native | Track element visibility and position | Badge positioning that follows scroll/resize without performance hit |
| ResizeObserver | Native | Detect element size changes | Update badge positions when target elements resize |
| @thednp/position-observer | 2.x (optional) | Unified position tracking | Alternative to combining IntersectionObserver + ResizeObserver manually |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| css-selector-generator | Custom XPath or nth-child only | XPath breaks with shadow DOM; nth-child brittle for dynamic content |
| IntersectionObserver | getBoundingClientRect on scroll | Polling causes performance degradation (reflows on every call) |
| @dnd-kit | react-beautiful-dnd | Deprecated; hello-pangea/dnd is fork but dnd-kit more active and flexible |
| @dnd-kit | Framer Motion Reorder | Limited to simple lists; no multirow or scrollable container support |

**Installation:**
```bash
# Extension-specific (apps/extension)
npm install css-selector-generator

# Already installed in web app (verify in extension if needed)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
apps/extension/src/
├── content/
│   ├── capture/               # NEW: Capture mode implementation
│   │   ├── highlighter.ts     # Element highlighting overlay system
│   │   ├── selector-gen.ts    # CSS selector generation wrapper
│   │   ├── badge-tracker.ts   # Badge positioning with IntersectionObserver
│   │   └── capture-mode.ts    # Main capture mode coordinator
│   ├── selector.ts            # EXISTING: Element finding utilities
│   ├── actions.ts             # EXISTING: Fill/click/wait executors
│   └── executor.ts            # EXISTING: Step execution orchestrator
├── popup/
│   ├── components/
│   │   ├── capture/           # NEW: Capture UI components
│   │   │   ├── step-list.tsx  # Sortable step list with dnd-kit
│   │   │   ├── step-config.tsx # Step configuration panel
│   │   │   └── capture-panel.tsx # Main capture container
│   │   └── ...
└── types/
    └── messages.ts            # EXISTING: Add new capture messages
```

### Pattern 1: Content Script Element Highlighting

**What:** Inject event listeners and CSS overlays to highlight interactive elements on hover, similar to browser DevTools element picker.

**When to use:** Capture mode activation when user clicks "Criar Mapping" button.

**Implementation approach:**
```typescript
// Source: uBlock Origin element picker pattern + browser devtools
class ElementHighlighter {
  private overlay: HTMLDivElement;
  private tooltip: HTMLDivElement;
  private isActive = false;

  // Inject CSS and event listeners
  activate(): void {
    this.isActive = true;
    this.injectStyles();
    document.addEventListener('mouseover', this.handleHover);
    document.addEventListener('click', this.handleClick);
  }

  // Remove listeners and overlays
  deactivate(): void {
    this.isActive = false;
    document.removeEventListener('mouseover', this.handleHover);
    document.removeEventListener('click', this.handleClick);
    this.removeOverlay();
  }

  private handleHover = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!this.isInteractiveElement(target)) return;

    // Show outline + tooltip
    this.showOverlay(target);
    this.showTooltip(target);
  };

  private handleClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (!this.isInteractiveElement(target)) return;

    // Send captured element to popup
    this.captureElement(target);
  };

  private isInteractiveElement(el: HTMLElement): boolean {
    const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'];
    return interactiveTags.includes(el.tagName);
  }

  private showOverlay(el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    this.overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid #0066ff;
      pointer-events: none;
      z-index: 2147483647;
      transition: opacity 150ms ease-out;
    `;
  }
}
```

**Key decisions from CONTEXT.md:**
- Blue outline color scheme (high contrast)
- 150ms fade animation
- Tooltip shows element type + name/id hint
- Only main frame (no iframe support)
- All clickable elements highlightable (input, select, button, link)

### Pattern 2: CSS Selector Generation with Fallbacks

**What:** Generate unique, stable CSS selectors using progressive algorithm: ID → class → tag → attribute → nth-child.

**When to use:** When user clicks element to capture it.

**Implementation approach:**
```typescript
// Source: css-selector-generator library patterns
import { getCssSelector } from 'css-selector-generator';

interface SelectorResult {
  primary: { type: 'css'; value: string };
  fallbacks?: Array<{ type: 'css'; value: string }>;
}

function generateSelector(element: HTMLElement): SelectorResult {
  // Generate primary selector with standard options
  const primary = getCssSelector(element, {
    selectors: ['id', 'class', 'tag', 'attribute'],
    blacklist: [/^js-/, /^ng-/, /^react-/, /^_\w+/], // Exclude framework classes
    combineWithinSelector: true,
    combineBetweenSelectors: true,
    maxCombinations: 10,
  });

  // Generate fallback with nth-child if primary uses dynamic classes
  const fallbacks: Array<{ type: 'css'; value: string }> = [];

  if (hasDynamicClasses(primary)) {
    const nthChildSelector = getCssSelector(element, {
      selectors: ['tag', 'nthchild'],
      includeTag: true,
    });
    fallbacks.push({ type: 'css', value: nthChildSelector });
  }

  return {
    primary: { type: 'css', value: primary },
    fallbacks: fallbacks.length > 0 ? fallbacks : undefined,
  };
}

// Check if selector contains framework-generated dynamic classes
function hasDynamicClasses(selector: string): boolean {
  return /\w+-[a-f0-9]{6,}/.test(selector); // Matches: button-abc123
}
```

**Best practices:**
- Blacklist framework-generated classes (React, Angular, Vue)
- Prefer stable attributes (data-testid, name, id)
- Generate fallback selector with nth-child for resilience
- Test selector uniqueness: `document.querySelectorAll(selector).length === 1`

### Pattern 3: Badge Position Tracking Without Performance Hit

**What:** Display numbered badges on captured elements that follow scroll/resize using IntersectionObserver instead of polling getBoundingClientRect.

**When to use:** After element captured, badges persist in capture mode.

**Implementation approach:**
```typescript
// Source: Modern Observer API patterns (IntersectionObserver + ResizeObserver)
class BadgeTracker {
  private badges = new Map<HTMLElement, HTMLDivElement>();
  private observer: IntersectionObserver;
  private resizeObserver: ResizeObserver;

  constructor() {
    // Track visibility and position changes
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      { threshold: [0, 0.1, 0.9, 1] } // Detect entering/leaving viewport
    );

    // Track element resizes
    this.resizeObserver = new ResizeObserver(
      (entries) => this.handleResize(entries)
    );
  }

  addBadge(element: HTMLElement, stepNumber: number): void {
    const badge = this.createBadge(stepNumber);
    this.badges.set(element, badge);

    // Position badge initially
    this.updateBadgePosition(element, badge);

    // Start observing
    this.observer.observe(element);
    this.resizeObserver.observe(element);

    document.body.appendChild(badge);
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const badge = this.badges.get(entry.target as HTMLElement);
      if (!badge) continue;

      if (entry.isIntersecting) {
        badge.style.display = 'block';
        this.updateBadgePosition(entry.target as HTMLElement, badge);
      } else {
        badge.style.display = 'none'; // Hide if off-screen
      }
    }
  }

  private handleResize(entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      const badge = this.badges.get(entry.target as HTMLElement);
      if (!badge) continue;
      this.updateBadgePosition(entry.target as HTMLElement, badge);
    }
  }

  private updateBadgePosition(element: HTMLElement, badge: HTMLDivElement): void {
    // Called only when necessary (not on every scroll frame)
    const rect = element.getBoundingClientRect();
    badge.style.cssText = `
      position: fixed;
      top: ${rect.top - 16}px;
      right: ${window.innerWidth - rect.right}px;
      z-index: 2147483646;
    `;
  }

  private createBadge(stepNumber: number): HTMLDivElement {
    const badge = document.createElement('div');
    badge.textContent = stepNumber.toString();
    badge.style.cssText = `
      width: 24px; height: 24px;
      background: #0066ff;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      pointer-events: none;
    `;
    return badge;
  }
}
```

**Why this pattern:**
- IntersectionObserver notifies in batches (efficient)
- Only updates position when element enters/leaves viewport or resizes
- Avoids continuous getBoundingClientRect polling (causes reflows)
- Automatically handles scroll without event listeners

### Pattern 4: Manifest V3 Messaging (Popup ↔ Content Script)

**What:** Send messages between popup and content script using one-time requests with `chrome.runtime.sendMessage()` and `chrome.tabs.sendMessage()`.

**When to use:** All communication between popup UI and content script capture mode.

**Implementation approach:**
```typescript
// Source: Chrome Extensions Manifest V3 official documentation

// ============================================================================
// Popup sends message to content script
// ============================================================================
async function enterCaptureMode(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  const response = await chrome.tabs.sendMessage<CaptureStartMessage, CaptureStartResponse>(
    tab.id,
    { type: 'CAPTURE_START', payload: { batchColumns: ['name', 'email', 'phone'] } }
  );

  if (response.success) {
    console.log('Capture mode activated');
  }
}

// ============================================================================
// Content script receives message from popup
// ============================================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_START') {
    const highlighter = new ElementHighlighter();
    highlighter.activate();

    sendResponse({ success: true });
    return; // Synchronous response
  }

  if (message.type === 'CAPTURE_STOP') {
    highlighter.deactivate();
    sendResponse({ success: true });
    return;
  }
});

// ============================================================================
// Content script sends captured element to popup
// ============================================================================
async function sendCapturedElement(element: HTMLElement, selector: SelectorResult): Promise<void> {
  await chrome.runtime.sendMessage({
    type: 'ELEMENT_CAPTURED',
    payload: {
      selector: selector.primary,
      fallbacks: selector.fallbacks,
      elementType: element.tagName.toLowerCase(),
      elementName: element.getAttribute('name') || element.id || '',
    },
  });
}
```

**Security considerations from research:**
- Treat content scripts as untrusted (page can compromise them)
- Validate all input from content script messages
- Never use `eval()` or `innerHTML` with untrusted data
- Use `JSON.parse()` and `innerText` for safer alternatives

### Pattern 5: Sortable Step List with dnd-kit

**What:** Reorderable step list using dnd-kit sortable preset.

**When to use:** Display captured steps in popup UI.

**Implementation approach:**
```typescript
// Source: dnd-kit official documentation + existing web app usage
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Step {
  id: string;
  stepOrder: number;
  action: 'fill' | 'click' | 'wait';
  selector: string;
  sourceColumn?: string;
}

function StepList({ steps, onReorder }: { steps: Step[]; onReorder: (steps: Step[]) => void }) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(steps, oldIndex, newIndex);
    // Update stepOrder field
    const updated = reordered.map((step, index) => ({ ...step, stepOrder: index + 1 }));
    onReorder(updated);
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {steps.map((step) => (
          <SortableStepItem key={step.id} step={step} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableStepItem({ step }: { step: Step }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="step-item">
        <span>{step.stepOrder}. {step.action}</span>
        <span>{step.sourceColumn || step.selector}</span>
      </div>
    </div>
  );
}
```

**Key features:**
- `arrayMove` utility handles array reordering
- `verticalListSortingStrategy` for simple vertical lists
- `closestCenter` collision detection (good default)
- Update `stepOrder` field after drag to maintain server sync

### Anti-Patterns to Avoid

- **Polling getBoundingClientRect on scroll/resize:** Causes performance degradation with continuous reflows. Use IntersectionObserver instead.
- **Long-lived message connections for simple requests:** Adds complexity and lifecycle management overhead. Use one-time `sendMessage()` for single request-response.
- **Custom selector generation with only nth-child:** Brittle in dynamic pages. Use progressive algorithm (ID → class → tag → nth-child).
- **Inline event handlers (onclick="..."):** Content Security Policy blocks them. Use `addEventListener()`.
- **Assuming content script has full Chrome API access:** Content scripts have limited API access. Must message background/popup for privileged operations.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS selector generation | Custom XPath or querySelector builder | css-selector-generator | Handles edge cases: shadow DOM, dynamic IDs, framework classes, uniqueness testing. Progressive fallback algorithm battle-tested. |
| Element position tracking on scroll/resize | Manual scroll/resize listeners with getBoundingClientRect | IntersectionObserver + ResizeObserver | Native APIs batch updates efficiently. Polling causes reflows every frame (performance killer). Observers only fire when necessary. |
| Drag-and-drop reordering | Custom mouse event handlers | @dnd-kit/sortable | Handles touch, accessibility, edge cases (nested lists, scrolling containers, collision detection). Already in project dependencies. |
| Popup ↔ content script communication | Custom postMessage bridge | chrome.runtime.sendMessage / chrome.tabs.sendMessage | Native API handles cross-context communication, serialization, security boundaries. Custom solutions miss edge cases (extension context invalidation, CSP). |
| Element highlighting overlay | Custom div positioning | Use pattern from uBlock Origin / browser devtools | Proven UX pattern. Handles z-index stacking, click-through (pointer-events: none), tooltip positioning. |

**Key insight:** Browser extension development has specific security boundaries (isolated worlds, CSP, limited API access) and performance constraints (reflows, message serialization). Hand-rolled solutions often miss these subtleties, leading to security vulnerabilities or poor performance.

## Common Pitfalls

### Pitfall 1: Extension Context Invalidation in SPAs

**What goes wrong:** Content script continues running after extension updates/disables, causing "Extension context invalidated" errors. In Single Page Applications (SPAs like YouTube), navigation doesn't trigger new content script injection, so capture mode state persists incorrectly across page transitions.

**Why it happens:** By default, browsers don't stop content scripts when extension updates. SPAs use History API (pushState/replaceState) to navigate without full page reload, so content scripts don't re-initialize.

**How to avoid:**
- Listen to `chrome.runtime.onMessage` errors and gracefully deactivate capture mode
- For SPAs: Listen to `chrome.webNavigation.onHistoryStateUpdated` to detect navigation
- Clean up all event listeners and DOM elements on deactivation
- Check `chrome.runtime.id` existence before message operations

**Warning signs:**
- Console errors: "Extension context invalidated"
- Capture mode UI persists after navigating to different page
- Messages fail silently after extension update

### Pitfall 2: CSS Selector Brittleness with Dynamic Content

**What goes wrong:** Generated selectors break when page structure changes (React re-renders, A/B tests, lazy-loaded content). Selectors using framework-generated class names (e.g., `button-abc123`) change on every build.

**Why it happens:** Modern JavaScript frameworks generate hashed class names during build. Dynamic content may not exist at capture time. nth-child selectors break when siblings are added/removed.

**How to avoid:**
- Blacklist framework class patterns in css-selector-generator config: `/^js-/`, `/^ng-/`, `/^react-/`, `/^_\w+/`
- Prefer stable attributes: `data-testid`, `name`, `id`, `aria-label`
- Generate fallback selectors using different strategies (nth-child as last resort)
- Test selector robustness: warn if selector matches multiple elements or uses dynamic classes
- Store multiple fallback selectors per step in database

**Warning signs:**
- Selector contains hash suffixes: `.button-a3c8f2`
- Selector deeply nested: `div > div > div > div > button:nth-child(3)`
- Selector relies solely on position: `:nth-child(5)`

### Pitfall 3: Message Serialization and Size Limits

**What goes wrong:** Chrome extension messages fail silently or truncate when exceeding 64 MiB limit. Objects with `undefined` values serialize to `null`, breaking type contracts. Circular references cause serialization failure.

**Why it happens:** Chrome uses JSON serialization (not structured clone like Firefox). Large payloads (e.g., full DOM tree, base64 images) exceed limits. TypeScript's `string | undefined` becomes `string | null` after serialization.

**How to avoid:**
- Validate payload size before sending (keep under 1 MB for safety)
- Never send DOM elements directly; extract minimal data (selector, attributes)
- Use explicit `null` instead of `undefined` in message types
- For large data: use `chrome.storage` and send reference ID instead
- Add message size warning in development

**Warning signs:**
- Messages fail silently (no error, no response)
- TypeScript types mismatch runtime values (`undefined` becomes `null`)
- Performance degradation when capturing many steps

### Pitfall 4: Z-Index Stacking Context Conflicts

**What goes wrong:** Capture mode overlays and badges appear behind page elements (modals, fixed headers, dropdowns). Click events captured by page elements instead of extension overlay.

**Why it happens:** Modern web pages use high z-index values (9999+). Fixed position elements create new stacking contexts. Capture overlay inserted at wrong position in DOM tree.

**How to avoid:**
- Use maximum safe z-index: `2147483647` for overlays (top) and `2147483646` for badges
- Insert overlay elements as direct children of `document.body` (not nested in page elements)
- Set `pointer-events: none` on overlays (let clicks pass through to actual elements)
- Use `event.preventDefault()` and `event.stopPropagation()` in click handler before page handlers fire

**Warning signs:**
- Can't click elements because overlay blocks them
- Badges hidden behind page modals
- Dropdown menus appear above capture UI

### Pitfall 5: Memory Leaks from Event Listeners and Observers

**What goes wrong:** Content script memory usage grows over time. Capture mode deactivates but event listeners remain attached. Observer instances not cleaned up, causing references to detached DOM nodes.

**Why it happens:** JavaScript doesn't auto-remove event listeners. IntersectionObserver and ResizeObserver hold references to observed elements. Chrome's content scripts persist across page navigations in some contexts.

**How to avoid:**
- Store listener references to remove them explicitly: `removeEventListener(handler)`
- Call `observer.disconnect()` on IntersectionObserver and ResizeObserver
- Clean up badge DOM elements: `badge.remove()` and `badges.clear()`
- Use AbortController for automatic cleanup: `addEventListener('click', handler, { signal: controller.signal })`
- Implement explicit cleanup method called on capture mode exit

**Warning signs:**
- Chrome DevTools shows increasing memory usage
- Performance degradation over time
- Console warnings about detached DOM nodes
- Multiple overlay instances visible after re-entering capture mode

## Code Examples

Verified patterns from official sources:

### Element Capture with Selector Generation

```typescript
// Source: css-selector-generator documentation + uBlock Origin patterns
import { getCssSelector } from 'css-selector-generator';

interface CapturedElement {
  selector: { type: 'css'; value: string };
  fallbacks?: Array<{ type: 'css'; value: string }>;
  elementType: string;
  elementName: string;
  action: 'fill' | 'click';
}

class ElementCapture {
  captureElement(element: HTMLElement): CapturedElement {
    // Generate primary selector
    const primarySelector = getCssSelector(element, {
      selectors: ['id', 'class', 'tag', 'attribute'],
      blacklist: [
        /^js-/,        // JavaScript hooks
        /^ng-/,        // Angular
        /^react-/,     // React
        /^vue-/,       // Vue
        /^_\w+/,       // Private classes
        /\w+-[a-f0-9]{6,}/ // Hashed classes
      ],
      combineWithinSelector: true,
      combineBetweenSelectors: true,
      maxCombinations: 10,
    });

    // Generate fallback with nth-child
    const fallbackSelector = getCssSelector(element, {
      selectors: ['tag', 'nthchild'],
      includeTag: true,
    });

    // Detect action type
    const action = this.detectAction(element);

    return {
      selector: { type: 'css', value: primarySelector },
      fallbacks: [{ type: 'css', value: fallbackSelector }],
      elementType: element.tagName.toLowerCase(),
      elementName: element.getAttribute('name') || element.id || '',
      action,
    };
  }

  private detectAction(element: HTMLElement): 'fill' | 'click' {
    const fillTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    return fillTypes.includes(element.tagName) ? 'fill' : 'click';
  }
}
```

### Capture Mode Activation with Cleanup

```typescript
// Source: Chrome extension content script best practices
class CaptureMode {
  private highlighter: ElementHighlighter | null = null;
  private badgeTracker: BadgeTracker | null = null;
  private abortController: AbortController | null = null;
  private isActive = false;

  async activate(): Promise<void> {
    if (this.isActive) return;

    this.isActive = true;
    this.abortController = new AbortController();

    // Initialize components
    this.highlighter = new ElementHighlighter();
    this.badgeTracker = new BadgeTracker();

    // Add event listeners with abort signal for auto-cleanup
    document.addEventListener('keydown', this.handleKeyboard, {
      signal: this.abortController.signal,
    });

    // Listen for capture events
    this.highlighter.on('elementCaptured', this.handleElementCaptured);

    // Start highlighting
    this.highlighter.activate();
  }

  deactivate(): void {
    if (!this.isActive) return;

    // Clean up event listeners
    this.abortController?.abort();

    // Clean up components
    this.highlighter?.deactivate();
    this.badgeTracker?.cleanup();

    // Release references
    this.highlighter = null;
    this.badgeTracker = null;
    this.abortController = null;
    this.isActive = false;
  }

  private handleKeyboard = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.deactivate();
      chrome.runtime.sendMessage({ type: 'CAPTURE_CANCELLED' });
    }
  };

  private handleElementCaptured = async (element: HTMLElement): Promise<void> => {
    const capture = new ElementCapture();
    const captured = capture.captureElement(element);

    // Add badge
    const stepNumber = (this.badgeTracker?.count() ?? 0) + 1;
    this.badgeTracker?.addBadge(element, stepNumber);

    // Send to popup
    await chrome.runtime.sendMessage({
      type: 'ELEMENT_CAPTURED',
      payload: captured,
    });
  };
}

// Initialize on message from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_START') {
    const captureMode = new CaptureMode();
    captureMode.activate();
    sendResponse({ success: true });
  }
});
```

### Sortable Step List Component

```typescript
// Source: dnd-kit official examples + web app existing usage
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Edit2 } from 'lucide-react';

interface Step {
  id: string;
  stepOrder: number;
  action: 'fill' | 'click' | 'wait';
  selector: string;
  sourceColumn?: string;
  fixedValue?: string;
}

export function CaptureStepList({
  steps,
  onReorder,
  onDelete,
  onEdit
}: {
  steps: Step[];
  onReorder: (steps: Step[]) => void;
  onDelete: (stepId: string) => void;
  onEdit: (stepId: string) => void;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(steps, oldIndex, newIndex);
    const updated = reordered.map((step, index) => ({
      ...step,
      stepOrder: index + 1
    }));

    onReorder(updated);
  }

  if (steps.length === 0) {
    return (
      <div className="empty-state">
        <p>Click elements on the page to capture steps</p>
      </div>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="step-list">
          {steps.map((step) => (
            <SortableStepItem
              key={step.id}
              step={step}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableStepItem({
  step,
  onDelete,
  onEdit
}: {
  step: Step;
  onDelete: (stepId: string) => void;
  onEdit: (stepId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: step.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displaySource = step.sourceColumn
    ? `Column: ${step.sourceColumn}`
    : step.fixedValue
      ? `Fixed: "${step.fixedValue}"`
      : 'No source';

  return (
    <div ref={setNodeRef} style={style} className="step-item">
      <div className="drag-handle" {...attributes} {...listeners}>
        <span className="step-number">{step.stepOrder}</span>
      </div>

      <div className="step-content">
        <div className="step-action">{step.action}</div>
        <div className="step-source">{displaySource}</div>
        <div className="step-selector">{truncate(step.selector, 40)}</div>
      </div>

      <div className="step-actions">
        <button onClick={() => onEdit(step.id)}>
          <Edit2 size={16} />
        </button>
        <button onClick={() => onDelete(step.id)}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 Drag and Drop API | @dnd-kit | 2021-2022 | Better touch support, no ghost image issues, more customizable. HTML5 DnD still works but limited on mobile. |
| getBoundingClientRect polling on scroll | IntersectionObserver | 2019-2020 | ~90% performance improvement. Observers batch updates, polling causes reflow every frame. Native API widely supported (95%+ browsers). |
| react-beautiful-dnd | @dnd-kit or hello-pangea/dnd | 2023 | react-beautiful-dnd archived. Community forked to hello-pangea/dnd, but dnd-kit gained more traction with active development. |
| Custom XPath generation | css-selector-generator | 2018-2020 | CSS selectors work with shadow DOM (XPath doesn't). css-selector-generator handles edge cases (uniqueness, framework classes) better than custom implementations. |
| Long-lived message ports | One-time sendMessage | Manifest V3 (2022) | Simpler lifecycle management. One-time messages sufficient for most use cases. Long-lived ports add complexity without benefit for single request-response. |

**Deprecated/outdated:**
- **react-beautiful-dnd**: Archived in 2023. Use @dnd-kit or hello-pangea/dnd fork.
- **Manifest V2**: Deprecated January 2023, removed January 2024. Use Manifest V3 with service workers.
- **chrome.extension API**: Use chrome.runtime instead (V3 requirement).
- **Synchronous XMLHttpRequest in content scripts**: Deprecated. Use fetch() or chrome.runtime.sendMessage to background.

## Open Questions

Things that couldn't be fully resolved:

1. **Badge positioning with CSS transforms and sticky elements**
   - What we know: IntersectionObserver works well for standard flow elements. getBoundingClientRect returns viewport-relative coordinates.
   - What's unclear: How to handle badges for elements with CSS transform (3D transforms change stacking context), sticky positioning (changes between static and fixed), or inside scrollable containers with overflow:hidden parent.
   - Recommendation: Start with simple fixed positioning for main frame elements. Add transform detection in Phase 34 if users report badge misalignment. Document known limitation: badges may misalign on transformed elements.

2. **Selector uniqueness validation timing**
   - What we know: Can test uniqueness with `document.querySelectorAll(selector).length === 1` at capture time.
   - What's unclear: Should validation happen at capture time (UX feedback) or at execution time (more accurate)? What if page state changes between capture and execution?
   - Recommendation: Validate at capture time to warn user immediately. Store fallback selectors and test them in sequence at execution time. Accept that dynamic pages may require re-capture.

3. **Memory impact of multiple IntersectionObserver instances**
   - What we know: Creating one IntersectionObserver per badge is simpler code. Observers are efficient (native implementation).
   - What's unclear: Does one observer per badge scale to 50+ steps? Should we use single observer for all badges?
   - Recommendation: Start with one observer per badge (simpler). Profile memory usage in testing. If > 30 steps cause issues, refactor to single observer with Map tracking.

4. **Cross-origin iframe support**
   - What we know: Phase 33 scope is main frame only (per CONTEXT.md). Cross-origin iframes block content script injection due to security policy.
   - What's unclear: User request priority for iframe support (government forms sometimes use iframes for subsections).
   - Recommendation: Defer to Phase 34+. If needed, requires separate content script injection per iframe with separate capture mode state. Document limitation in Phase 33.

## Sources

### Primary (HIGH confidence)
- [css-selector-generator GitHub](https://github.com/fczbkk/css-selector-generator) - Selector generation algorithm and options
- [dnd-kit documentation](https://docs.dndkit.com) - Drag-and-drop implementation patterns
- [Chrome Extensions Manifest V3 Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) - Official messaging API documentation
- [IntersectionObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) - Native position tracking API
- [uBlock Origin Element Picker](https://github.com/gorhill/ublock/wiki/Element-picker) - Production element picker implementation patterns

### Secondary (MEDIUM confidence)
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - Library comparison and recommendations
- [15 Playwright Selector Best Practices in 2026](https://www.browserstack.com/guide/playwright-selectors-best-practices) - Selector robustness patterns
- [Content scripts | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) - Content script best practices and limitations
- [Shopify Position Observer](https://github.com/Shopify/position-observer) - Modern position tracking patterns
- [Chrome Extension Content Script Common Mistakes](https://duo.com/labs/tech-notes/message-passing-and-security-considerations-in-chrome-extensions) - Security and pitfall documentation

### Tertiary (LOW confidence)
- Various blog posts and tutorials on element highlighting (2024-2025) - Implementation ideas, not authoritative
- WebSearch results on selector generation - General patterns, not library-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation and existing project dependencies verified
- Architecture: HIGH - Patterns from production extensions (uBlock Origin) and official Chrome docs
- Pitfalls: HIGH - Documented in official Chrome extension guides and real-world issues
- Code examples: HIGH - Based on official library documentation and existing codebase patterns
- Open questions: MEDIUM - Technical unknowns that require testing/profiling to resolve

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable domain with established patterns)

**Notes:**
- Project already uses dnd-kit (verified in apps/web/package.json) and react-intersection-observer
- Existing content script architecture (selector.ts, actions.ts, executor.ts) established pattern
- Messaging types already defined in src/types/messages.ts - follow existing discriminated union pattern
- WXT framework used for extension development (apps/extension uses wxt)
