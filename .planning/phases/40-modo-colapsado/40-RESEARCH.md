# Phase 40: Modo Colapsado - Research

**Researched:** 2026-02-08
**Domain:** Chrome Extension Side Panel UI -- compact/collapsed view mode toggle
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Icon strip layout
- Grid layout with 2-3 icons per row (not a single vertical column)
- Step number shown as small circular overlay badge on top-right corner of each icon (notification-badge style)
- Invalid selector steps show a warning triangle overlay on the opposite corner from the number badge -- always visible, not hover-only
- All step icons displayed in the grid; panel scrolls if they overflow (no row limit, consistent with expanded mode's no-max-height approach)

#### Toggle & transition
- Toggle button is a small icon button in the Side Panel header bar, next to existing controls
- Transition uses slide/shrink animation (~200ms): content slides or shrinks away as icon grid slides in
- In compact mode: header remains visible (with toggle button), footer hides (fill controls and row navigator) -- compact is view-only, expand to fill
- Expanding restores full state: same tab, same scroll position, everything exactly as before collapsing

#### Tooltip content & behavior
- Tooltip shows full detail on hover: action type, CSS selector text, and source column name
- Reuse the same CSS group-hover tooltip pattern from Phase 37 (instant, no delay, consistent styling)
- Clicking a step icon in compact mode highlights the element on page (amber outline, auto-dismiss) AND shows a temporary success/fail badge on the icon itself
- Warning triangle for invalid selectors is always visible (not hover-only) -- immediate visibility of broken steps

### Claude's Discretion
- Exact grid column count (2 vs 3) based on panel width and icon sizing
- Icon sizing and spacing within the grid cells
- Slide/shrink animation direction and easing curve
- Temporary fill result badge duration and styling
- Toggle button icon choice (e.g., PanelLeftClose, Columns2, etc.)
- How scroll position is preserved (CSS or JS-based approach)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase adds an internal compact layout toggle to the existing Side Panel. The Side Panel already has a well-structured architecture: a React App component (`App.tsx`) with a header, TabBar, scrollable content area, and sticky footer. The compact mode collapses the content and footer into a minimal icon grid while preserving the header with a toggle button. This is purely a front-end state toggle within the sidepanel React app -- no new messaging, API calls, or content script changes are required (except reusing the existing `HIGHLIGHT_STEP` message for click-to-highlight from compact mode).

The codebase already has all the building blocks: `MappingStep` types with action/selector/sourceFieldKey data, `stepValidation` Map for invalid selector tracking, the `handleStepHighlight` function for element highlighting via port messaging, and the `group-hover/tooltip` CSS pattern from Phase 37. The compact mode is a view transformation of data that already exists in the App component's state.

**Primary recommendation:** Add a `compactMode` boolean state to App.tsx, conditionally render a new `CompactIconGrid` component in place of the tab content + footer, and use CSS transitions with `overflow-hidden` + `max-height`/`opacity` for the slide/shrink animation. Persist the compact mode preference in `preferencesStorage`.

## Standard Stack

### Core (Already in project -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | Component rendering, state management | Already used for entire sidepanel |
| lucide-react | 0.555.0 | Icons (Pencil, MousePointer, Clock, AlertTriangle, toggle button icon) | Already used throughout sidepanel |
| Tailwind CSS | v4 | Styling, transitions, grid layout | Already used for all sidepanel styling |

### Supporting (Already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WXT storage | built-in | Persist compact mode preference | Save/restore compact state across sessions |
| Chrome messaging (port) | MV3 | HIGHLIGHT_STEP message for click-to-highlight | Reuse existing handleStepHighlight from App.tsx |

### No New Dependencies Required
This phase requires zero new npm packages. Everything is achievable with the existing stack.

## Architecture Patterns

### Current Side Panel Structure (App.tsx)
```
<div className="w-full min-h-screen bg-white p-4 flex flex-col">
  <header>                          <!-- STAYS in compact mode -->
    Coffee icon + title
    ConnectedIndicator
    [NEW: CompactToggle button]     <!-- Toggle button goes here -->
    RefreshCw button
  </header>

  <main className="flex-1 flex flex-col overflow-hidden">
    {/* HIDDEN in compact mode: */}
    <TabBar />
    {activeTab === 'preencher' ? (
      <div>                         <!-- Selectors, Steps, Recentes -->
        ...scrollable content...
        <div sticky footer>        <!-- RowIndicator + FillControls -->
      </div>
    ) : (
      <CapturePanel />
    )}

    {/* SHOWN in compact mode: */}
    <CompactIconGrid />             <!-- New component -->
  </main>

  <footer>Version 0.1.0</footer>   <!-- Can stay or hide -->
</div>
```

### Pattern 1: Conditional Rendering with State Toggle
**What:** A single `compactMode` boolean state in App.tsx controls which view renders
**When to use:** Always -- this is the core pattern

```typescript
// In App.tsx
const [compactMode, setCompactMode] = useState(false);

// Persist to storage on change
useEffect(() => {
  preferencesStorage.setCompactMode(compactMode);
}, [compactMode]);

// Restore on mount (add to existing useEffect)
preferencesStorage.getCompactMode().then(setCompactMode);
```

### Pattern 2: Scroll Position Preservation (JS-based)
**What:** Store scrollTop before collapsing, restore after expanding
**When to use:** When toggling compact mode to preserve exact scroll position

```typescript
// JS-based approach (recommended -- simple and reliable)
const scrollPositionRef = useRef<number>(0);
const scrollContainerRef = useRef<HTMLDivElement>(null);

function handleToggleCompact() {
  if (!compactMode && scrollContainerRef.current) {
    // Save scroll position before collapsing
    scrollPositionRef.current = scrollContainerRef.current.scrollTop;
  }
  setCompactMode(!compactMode);
}

// Restore scroll after expanding
useEffect(() => {
  if (!compactMode && scrollContainerRef.current) {
    scrollContainerRef.current.scrollTop = scrollPositionRef.current;
  }
}, [compactMode]);
```

### Pattern 3: CSS Transition for Slide/Shrink Animation
**What:** Use CSS transitions on wrapper divs with max-height and opacity
**When to use:** For the ~200ms collapse/expand animation

```tsx
{/* Expanded content wrapper */}
<div
  className={`transition-all duration-200 ease-out overflow-hidden ${
    compactMode ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
  }`}
>
  <TabBar />
  {/* ... full content ... */}
</div>

{/* Compact content wrapper */}
<div
  className={`transition-all duration-200 ease-out overflow-hidden ${
    compactMode ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
  }`}
>
  <CompactIconGrid />
</div>
```

### Pattern 4: Group-Hover Tooltip (from Phase 37)
**What:** CSS-only tooltip that appears instantly on hover using Tailwind `group/name` pattern
**When to use:** For step icon tooltips in compact mode

```tsx
// Established pattern from PreencherStepList.tsx
<div className="relative group/tooltip">
  <ActionIcon className="w-8 h-8" />
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-opacity pointer-events-none z-50">
    fill | #inputCnpj | CNPJ
  </div>
</div>
```

### Pattern 5: Keyboard Shortcut Handler
**What:** Listen for Ctrl+B / Cmd+B in the sidepanel to toggle compact mode
**When to use:** For CMP-07 requirement

```typescript
// In App.tsx, add useEffect for keyboard listener
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      setCompactMode(prev => !prev);
    }
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Anti-Patterns to Avoid
- **Separate route/page for compact mode:** This is a view toggle within the same component, not a navigation change. Do NOT create a separate entry point or route.
- **Re-fetching data on mode toggle:** All data (mappingSteps, stepValidation, fillResultsMap) already exists in App.tsx state. The compact view should read from the same state, not trigger new API calls.
- **Unmounting expanded content on collapse:** If you fully unmount the expanded content, you lose scroll position and component state. Use CSS visibility/overflow techniques instead, or store state in refs.
- **Custom animation library:** Do NOT add framer-motion or react-spring. Tailwind CSS transitions are sufficient for a simple max-height/opacity animation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip behavior | Custom JS tooltip with position calculation | CSS `group-hover` Tailwind pattern (Phase 37) | Already established in codebase, zero-delay, no JS overhead |
| Element highlighting on click | New highlight logic | Existing `handleStepHighlight` in App.tsx | Already handles port messaging, selector fallbacks, iframe search, auto-dismiss |
| Selector validation display | New validation logic | Existing `stepValidation` Map from App.tsx state | Already computed on mapping load and refreshed on click |
| Icon components | Custom SVG icons | lucide-react library | Already used throughout, consistent sizing and styling |
| State persistence | Custom localStorage wrapper | `preferencesStorage` from `src/storage/preferences.ts` | Already handles read/write with WXT storage API |
| Grid layout | Custom CSS grid calculations | Tailwind `grid grid-cols-3 gap-2` utility classes | Simple, responsive, no JS needed |

**Key insight:** This phase is almost entirely a UI composition task. Every piece of business logic (highlight, validate, data fetching) already exists. The only new logic is the compact mode toggle state and keyboard shortcut.

## Common Pitfalls

### Pitfall 1: Animation Jank with max-height
**What goes wrong:** Using `max-height: auto` doesn't animate. Using a fixed max-height too close to actual content height causes abrupt cutoff; too large causes visible delay before content appears.
**Why it happens:** CSS cannot animate to `auto` height. A large max-height (e.g., 2000px) means the animation technically runs for the full duration but appears instant because content fills only a fraction of that.
**How to avoid:** Use `max-h-0` to `max-h-[2000px]` for expand. The overshoot is fine because overflow is hidden. For shrink (collapse), `max-h-[2000px]` to `max-h-0` works well with `ease-out`. Alternatively, use `opacity` + `scale-y` for a cleaner visual effect.
**Warning signs:** Animation feels laggy or has a visible delay where nothing appears to happen.

### Pitfall 2: Keyboard Shortcut Conflicts
**What goes wrong:** Ctrl+B / Cmd+B might conflict with the page's keyboard shortcuts or the browser's built-in shortcuts.
**Why it happens:** The sidepanel runs in its own document context, so Ctrl+B inside the sidepanel won't conflict with the main page. However, Cmd+B is "Bold" in some text editors.
**How to avoid:** The keyboard listener is in the sidepanel's React app, which is a separate HTML document from the main page. Conflicts only occur with browser-level shortcuts. Ctrl+B is not a standard Chrome shortcut (Chrome uses Ctrl+D for bookmarks, not Ctrl+B). Use `e.preventDefault()` to prevent any residual browser handling.
**Warning signs:** Pressing shortcut triggers unexpected behavior in the sidepanel or browser.

### Pitfall 3: Stale State After Expanding
**What goes wrong:** If data updates while in compact mode (e.g., STATE_UPDATED port message changes rowIndex), the expanded view shows stale data.
**Why it happens:** If the expanded view is fully unmounted during compact mode, it won't receive state updates. If using CSS hiding, the rendered components still receive React state updates.
**How to avoid:** Use CSS-based show/hide (opacity-0, max-h-0, overflow-hidden) rather than conditional rendering (`{!compactMode && <ExpandedView />}`). This keeps the React tree mounted and state-reactive. Alternatively, if conditional rendering is used for performance, ensure all state lives in App.tsx (which it already does).
**Warning signs:** Expanding after a state change shows old data.

### Pitfall 4: Click-to-Highlight Port Availability
**What goes wrong:** Clicking an icon in compact mode to highlight an element fails because the port is disconnected.
**Why it happens:** Port disconnection can happen when the content script is reloaded or the page navigates.
**How to avoid:** Reuse the existing `handleStepHighlight` function from App.tsx which already handles the port ref and error cases. Pass it to the CompactIconGrid component as a callback. The existing port reconnection logic in App.tsx handles disconnections.
**Warning signs:** Click does nothing; check console for port errors.

### Pitfall 5: Compact Mode Persistence Across Sessions
**What goes wrong:** User toggles compact mode, closes browser, reopens -- mode is lost.
**Why it happens:** State is only in React useState, not persisted to storage.
**How to avoid:** Add `compactMode` to `PreferencesState` and `DEFAULT_PREFERENCES` in `src/storage/types.ts`. Read on mount, write on change. The pattern is already established for `lastActiveTab`.
**Warning signs:** Mode always resets to expanded on panel reopen.

## Code Examples

### CompactIconGrid Component Structure
```tsx
// Source: Codebase patterns from PreencherStepList.tsx and App.tsx
interface CompactIconGridProps {
  steps: MappingStep[];
  validation: Map<string, boolean>;
  onStepClick: (step: MappingStep) => void;
}

function CompactIconGrid({ steps, validation, onStepClick }: CompactIconGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-2 overflow-y-auto flex-1">
      {steps.map((step) => (
        <CompactStepIcon
          key={step.id}
          step={step}
          isInvalid={validation.get(step.id) === false}
          onClick={() => onStepClick(step)}
        />
      ))}
    </div>
  );
}
```

### CompactStepIcon Component
```tsx
// Source: Codebase patterns from PreencherStepList SortableStepItem
function CompactStepIcon({
  step,
  isInvalid,
  onClick,
}: {
  step: MappingStep;
  isInvalid: boolean;
  onClick: () => void;
}) {
  const [clickResult, setClickResult] = useState<'success' | 'failed' | null>(null);

  // Action icon selection (same logic as PreencherStepList)
  const ActionIcon = step.action === 'fill'
    ? Pencil
    : step.action === 'click'
      ? MousePointer
      : Clock;

  // Tooltip content: "fill | #inputCnpj | CNPJ"
  const tooltipText = [
    step.action,
    step.selector?.value ?? '',
    step.sourceFieldKey ?? step.fixedValue ?? '',
  ].filter(Boolean).join(' | ');

  async function handleClick() {
    onClick();
    // Show temporary result badge (set by parent after highlight response)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative flex items-center justify-center w-full aspect-square bg-gray-50 hover:bg-gray-100 rounded-lg border group/tooltip"
    >
      <ActionIcon className="w-6 h-6 text-gray-600" />

      {/* Step number badge (top-right corner) */}
      <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
        {step.stepOrder}
      </span>

      {/* Invalid selector warning (top-left corner, always visible) */}
      {isInvalid && (
        <span className="absolute top-0.5 left-0.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </span>
      )}

      {/* Tooltip (group-hover, instant, Phase 37 pattern) */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-opacity pointer-events-none z-50">
        {tooltipText}
      </div>

      {/* Temporary click result badge */}
      {clickResult && (
        <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full ${
          clickResult === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`} />
      )}
    </button>
  );
}
```

### Toggle Button in Header
```tsx
// Source: Codebase pattern from header in App.tsx
import { Minimize2, Maximize2 } from 'lucide-react';

<button
  onClick={() => setCompactMode(!compactMode)}
  className="p-1 hover:bg-gray-100 rounded"
  title={compactMode ? 'Expand panel' : 'Compact mode'}
>
  {compactMode
    ? <Maximize2 className="w-4 h-4 text-gray-500" />
    : <Minimize2 className="w-4 h-4 text-gray-500" />
  }
</button>
```

### Preferences Storage Extension
```typescript
// Source: Existing pattern from src/storage/preferences.ts and src/storage/types.ts

// In types.ts - add to PreferencesState:
export interface PreferencesState {
  lastProjectId: string | null;
  lastMappingIdByProject: Record<string, string>;
  lastActiveTab: 'preencher' | 'captura';
  compactMode: boolean;  // NEW
}

export const DEFAULT_PREFERENCES: PreferencesState = {
  lastProjectId: null,
  lastMappingIdByProject: {},
  lastActiveTab: 'preencher',
  compactMode: false,  // NEW
};

// In preferences.ts - add accessors:
async getCompactMode(): Promise<boolean> {
  const prefs = await this.getPreferences();
  return prefs.compactMode;
},

async setCompactMode(compact: boolean): Promise<void> {
  const current = await this.getPreferences();
  await this.setPreferences({
    ...current,
    compactMode: compact,
  });
},
```

## Discretion Recommendations

### Grid Column Count: Use 3 columns
**Rationale:** The side panel is ~320px wide. With `p-4` (16px each side) = 288px content area. With `p-2` on the grid = 272px. Three columns with `gap-2` (8px per gap, 2 gaps) = 256px / 3 = ~85px per icon cell. This gives comfortable icon sizes (~6x6 w-6 h-6 = 24px) with ample padding. Two columns would give ~128px per cell which is wastefully large for a compact mode.

### Icon Sizing: 24px icons (w-6 h-6) in aspect-square cells
**Rationale:** Consistent with existing icon sizes in the sidepanel (w-4 h-4 in lists, w-6 h-6 for emphasis). The `aspect-square` utility makes cells square, creating a clean grid. With 3 columns this gives ~85px square cells.

### Animation Direction: Vertical slide with opacity fade
**Rationale:** Use `max-h-0`/`max-h-[2000px]` + `opacity-0`/`opacity-100` with `transition-all duration-200 ease-out`. The expanded content slides up (shrinks vertically) while the compact grid fades in. This creates a natural spatial feel. `ease-out` provides snappy start with gentle end, which feels responsive.

### Fill Result Badge: 1.5s duration, colored dot
**Rationale:** Match the 1500ms timeout used by the copied-to-clipboard feedback in RowIndicator.tsx. Use a small colored dot (green/red) in the bottom-right corner of the icon cell, appearing after the highlight response returns. This is non-intrusive but clearly visible.

### Toggle Button Icon: `Minimize2` / `Maximize2`
**Rationale:** These icons are universally understood for collapse/expand. `PanelLeftClose` implies closing a side panel (which this is not -- the panel stays open). `Grid2x2` could work for entering compact mode but has no natural counterpart for expanding. `Minimize2`/`Maximize2` pair naturally and communicate the toggle clearly.

### Scroll Position Preservation: JS-based with useRef
**Rationale:** Store `scrollTop` in a ref before collapsing, restore it via `useEffect` after expanding. This is simpler and more reliable than CSS-based approaches (which would require keeping the full content rendered but hidden). Since we may use CSS show/hide for the transition, the scroll container stays mounted and its position is naturally preserved -- but the ref approach is a safety net.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Conditional rendering (`{show && <Component />}`) | CSS-based show/hide with transitions | Always available | Preserves component state, enables smooth animations |
| `display: none` toggle | `max-height` + `opacity` + `overflow-hidden` transitions | CSS3 | Animatable, preserves layout flow during transition |
| JS animation libraries (framer-motion) | Tailwind CSS transitions | Tailwind v3+ | Zero-dependency animations for simple transitions |

## Open Questions

1. **Compact mode during capture mode**
   - What we know: Capture mode uses a different tab (`captura`) with CapturePanel. The compact icon grid shows mapping steps from the `preencher` tab.
   - What's unclear: Should compact mode be available during capture mode? The captured steps are different from mapping steps (CaptureStep vs MappingStep).
   - Recommendation: Disable compact mode toggle when `captureMode` is true. Capture mode is a focused workflow where the user needs the full CapturePanel UI. This simplifies implementation and avoids a confusing UX.

2. **Compact mode when no mapping is loaded**
   - What we know: When no batch is selected or no mapping exists, the expanded view shows empty state or "Create Mapping" button.
   - What's unclear: Should compact mode be available when there are no steps to display?
   - Recommendation: Disable compact mode toggle when `mappingSteps.length === 0`. An empty icon grid provides no value. Show the toggle only when steps exist.

## Sources

### Primary (HIGH confidence)
- `apps/extension/entrypoints/sidepanel/App.tsx` -- Full Side Panel component structure, state management, highlight handler
- `apps/extension/entrypoints/sidepanel/components/preencher/PreencherStepList.tsx` -- group-hover tooltip pattern, step rendering, validation badges
- `apps/extension/src/content/highlight-step.ts` -- Element highlighting implementation (amber outline, auto-dismiss, iframe support)
- `apps/extension/src/storage/types.ts` -- PreferencesState interface, storage patterns
- `apps/extension/src/storage/preferences.ts` -- Storage accessors pattern for persistence
- `apps/extension/src/api/mappings.ts` -- MappingStep type definition
- `apps/extension/src/types/messages.ts` -- HIGHLIGHT_STEP message type, existing messaging infrastructure
- `apps/extension/package.json` -- Dependency versions (React 19.2.0, lucide-react 0.555.0, Tailwind v4)

### Secondary (MEDIUM confidence)
- [Chrome Side Panel API docs](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) -- Panel width not programmatically controllable, default ~320px
- [Lucide icons catalog](https://lucide.dev/icons) -- Minimize2, Maximize2, AlertTriangle icon availability
- [Tailwind CSS animation docs](https://tailwindcss.com/docs/animation) -- Transition utility classes

### Tertiary (LOW confidence)
- Chrome side panel default width of ~320px -- based on codebase comment in ConnectedIndicator.tsx and community reports; not officially documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All dependencies already in project, zero new packages
- Architecture: HIGH -- Based on direct codebase analysis of existing patterns
- Pitfalls: HIGH -- Derived from concrete code structure and known CSS animation behaviors
- Discretion recommendations: MEDIUM -- Grid column count depends on actual rendering at 320px width

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable -- no external dependencies or rapidly changing APIs)
