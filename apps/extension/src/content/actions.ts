/**
 * Action Executors for Content Script
 *
 * Executes fill, click, and wait actions on DOM elements.
 * Uses native property setters for React/Vue framework compatibility.
 *
 * Per CONTEXT.md decisions:
 * - Always clear existing content before filling text inputs/textareas
 * - Select matching: try value attribute first, then fall back to visible text
 * - Checkboxes/radios: truthy strings ("yes", "true", "1", "sim") = check
 * - Framework reactivity: use native property setters + dispatch input/change events
 * - File inputs: mark as manual (flag for user to fill manually)
 * - Hidden/disabled fields: fail the step
 */

// Import for potential future use in action functions
import type { SelectorConfig as _SelectorConfig } from './selector';

// ============================================================================
// Types
// ============================================================================

export interface ActionResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
}

export interface FillOptions {
  clearBefore?: boolean;
  pressEnter?: boolean;
}

type InputType = 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'unknown';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if element is visible in the DOM
 */
function isElementVisible(el: HTMLElement): boolean {
  // Check if element has any size
  if (el.offsetParent === null && el.tagName !== 'BODY') {
    // offsetParent is null for hidden elements (display: none)
    // Exception: body element always has null offsetParent
    const style = getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
  }

  const style = getComputedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;

  return true;
}

/**
 * Check if element is disabled
 */
function isElementDisabled(el: HTMLElement): boolean {
  if ('disabled' in el && (el as HTMLInputElement).disabled) {
    return true;
  }
  return el.getAttribute('aria-disabled') === 'true';
}

/**
 * Check if value is considered truthy for checkbox/radio
 * Per CONTEXT.md: "yes", "true", "1", "sim" (case-insensitive)
 */
function isTruthyValue(val: string): boolean {
  const normalized = val.toLowerCase().trim();
  return ['yes', 'true', '1', 'sim'].includes(normalized);
}

/**
 * Determine the input type of an element
 */
function getInputType(el: HTMLElement): InputType {
  const tagName = el.tagName.toLowerCase();

  if (tagName === 'textarea') return 'textarea';
  if (tagName === 'select') return 'select';

  if (tagName === 'input') {
    const inputEl = el as HTMLInputElement;
    const type = (inputEl.type || 'text').toLowerCase();

    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'file') return 'file';

    // All other input types (text, email, password, number, date, etc.)
    return 'input';
  }

  // Contenteditable elements can be treated as input
  if (el.contentEditable === 'true') return 'input';

  return 'unknown';
}

/**
 * Check if element is in viewport
 */
function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Dispatch input and change events for framework compatibility
 */
function dispatchInputEvents(el: HTMLElement): void {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Dispatch Enter key events
 */
function dispatchEnterKey(el: HTMLElement): void {
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
  });
  const keyupEvent = new KeyboardEvent('keyup', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
  });

  el.dispatchEvent(keydownEvent);
  el.dispatchEvent(keyupEvent);
}

/**
 * Small delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Action Executors
// ============================================================================

/**
 * Execute fill action on an element.
 *
 * Uses native property setters for React/Vue framework compatibility.
 * Dispatches input and change events after setting value.
 *
 * @param element - Target DOM element
 * @param value - Value to fill
 * @param options - Fill options (clearBefore, pressEnter)
 * @returns ActionResult indicating success/failure
 */
export function executeFill(
  element: HTMLElement,
  value: string,
  options: FillOptions = {}
): ActionResult {
  const { clearBefore = true, pressEnter = false } = options;

  // Check visibility and disabled state
  if (!isElementVisible(element)) {
    return { success: false, error: 'Element is hidden or disabled' };
  }

  if (isElementDisabled(element)) {
    return { success: false, error: 'Element is hidden or disabled' };
  }

  const inputType = getInputType(element);

  // Handle file inputs
  if (inputType === 'file') {
    return { success: false, skipped: true, error: 'File inputs require manual action' };
  }

  // Handle unknown element types
  if (inputType === 'unknown') {
    return { success: false, error: 'Unsupported element type' };
  }

  try {
    // Handle text inputs and textareas
    if (inputType === 'input' || inputType === 'textarea') {
      const inputEl = element as HTMLInputElement | HTMLTextAreaElement;

      // Use native property setter for framework compatibility
      const descriptor =
        inputType === 'input'
          ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
          : Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

      if (descriptor?.set) {
        // Clear if needed (default: always clear)
        if (clearBefore) {
          descriptor.set.call(inputEl, '');
          dispatchInputEvents(inputEl);
        }

        // Set the new value
        descriptor.set.call(inputEl, value);
        dispatchInputEvents(inputEl);

        // Press Enter if requested
        if (pressEnter) {
          dispatchEnterKey(inputEl);
        }

        return { success: true };
      }

      // Fallback to direct assignment
      inputEl.value = value;
      dispatchInputEvents(inputEl);
      return { success: true };
    }

    // Handle select elements
    if (inputType === 'select') {
      const selectEl = element as HTMLSelectElement;
      const options = Array.from(selectEl.options);

      // First try: match by value attribute
      const optionByValue = options.find((opt) => opt.value === value);
      if (optionByValue) {
        selectEl.value = value;
        dispatchInputEvents(selectEl);
        return { success: true };
      }

      // Second try: match by visible text content
      const optionByText = options.find(
        (opt) => opt.textContent?.trim().toLowerCase() === value.toLowerCase().trim()
      );
      if (optionByText) {
        selectEl.value = optionByText.value;
        dispatchInputEvents(selectEl);
        return { success: true };
      }

      return { success: false, error: `No matching option found for value: ${value}` };
    }

    // Handle checkbox and radio
    if (inputType === 'checkbox' || inputType === 'radio') {
      const checkEl = element as HTMLInputElement;
      const shouldCheck = isTruthyValue(value);

      // Use native property setter
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');

      if (descriptor?.set) {
        descriptor.set.call(checkEl, shouldCheck);
        checkEl.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      }

      // Fallback
      checkEl.checked = shouldCheck;
      checkEl.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true };
    }

    return { success: false, error: 'Unhandled input type' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during fill';
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute click action on an element.
 *
 * Scrolls element into view if needed, then clicks.
 * Per CONTEXT.md: Click steps scroll element into view only if needed (outside viewport).
 *
 * @param element - Target DOM element
 * @returns Promise resolving to ActionResult
 */
export async function executeClick(element: HTMLElement): Promise<ActionResult> {
  try {
    // Scroll into view if not visible
    if (!isInViewport(element)) {
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
      // Small delay after scroll for stability
      await delay(50);
    }

    // Perform the click
    element.click();

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during click';
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute wait action.
 *
 * Delays execution for the specified duration.
 *
 * @param waitMs - Time to wait in milliseconds
 * @returns Promise resolving to ActionResult after wait completes
 */
export async function executeWait(waitMs: number): Promise<ActionResult> {
  try {
    await delay(waitMs);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during wait';
    return { success: false, error: errorMessage };
  }
}
