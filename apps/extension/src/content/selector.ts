/**
 * Selector Engine for Content Script
 *
 * Finds DOM elements using CSS selectors and XPath expressions.
 * Supports fallback selector chains for resilient element finding.
 *
 * Per CONTEXT.md decisions:
 * - Element wait: short polling (1-2 seconds) before declaring not found
 * - Multiple element matches: use first match
 */

// ============================================================================
// Types
// ============================================================================

export interface SelectorConfig {
  type: 'css' | 'xpath';
  value: string;
}

export interface FindResult {
  element: HTMLElement | null;
  usedSelector: string | null;
  attempts: number;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Find element using CSS selector
 */
function findByCss(selector: string): HTMLElement | null {
  try {
    const element = document.querySelector<HTMLElement>(selector);
    return element;
  } catch {
    // Invalid CSS selector
    return null;
  }
}

/**
 * Find element using XPath expression
 */
function findByXPath(xpath: string): HTMLElement | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const node = result.singleNodeValue;
    return node instanceof HTMLElement ? node : null;
  } catch {
    // Invalid XPath expression
    return null;
  }
}

/**
 * Find element using a single selector config
 */
function findBySelector(config: SelectorConfig): HTMLElement | null {
  if (config.type === 'css') {
    return findByCss(config.value);
  }
  return findByXPath(config.value);
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Find element with primary selector and optional fallbacks.
 *
 * Tries primary selector first, then iterates through fallbacks in order.
 * Stops at first successful match.
 *
 * @param primary - Primary selector configuration
 * @param fallbacks - Optional array of fallback selectors
 * @returns FindResult with element, used selector string, and attempt count
 */
export function findElement(
  primary: SelectorConfig,
  fallbacks?: SelectorConfig[]
): FindResult {
  let attempts = 0;

  // Try primary selector
  attempts++;
  const primaryElement = findBySelector(primary);
  if (primaryElement) {
    return {
      element: primaryElement,
      usedSelector: `${primary.type}:${primary.value}`,
      attempts,
    };
  }

  // Try fallbacks in order
  if (fallbacks) {
    for (const fallback of fallbacks) {
      attempts++;
      const fallbackElement = findBySelector(fallback);
      if (fallbackElement) {
        return {
          element: fallbackElement,
          usedSelector: `${fallback.type}:${fallback.value}`,
          attempts,
        };
      }
    }
  }

  // No element found
  return {
    element: null,
    usedSelector: null,
    attempts,
  };
}

/**
 * Wait for element to appear with polling.
 *
 * Per CONTEXT.md: Element wait uses short polling (1-2 seconds).
 * Default timeout: 2000ms, poll interval: 100ms.
 *
 * @param primary - Primary selector configuration
 * @param fallbacks - Optional array of fallback selectors
 * @param timeout - Maximum wait time in milliseconds (default: 2000)
 * @param pollInterval - Polling interval in milliseconds (default: 100)
 * @returns Promise resolving to FindResult
 */
export function waitForElement(
  primary: SelectorConfig,
  fallbacks?: SelectorConfig[],
  timeout = 2000,
  pollInterval = 100
): Promise<FindResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let totalAttempts = 0;

    const poll = (): void => {
      const result = findElement(primary, fallbacks);
      totalAttempts += result.attempts;

      if (result.element) {
        resolve({
          ...result,
          attempts: totalAttempts,
        });
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        // Timeout reached, return null result
        resolve({
          element: null,
          usedSelector: null,
          attempts: totalAttempts,
        });
        return;
      }

      // Continue polling
      setTimeout(poll, pollInterval);
    };

    // Start polling
    poll();
  });
}
