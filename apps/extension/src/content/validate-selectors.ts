/**
 * Selector Validation for Preencher Tab
 *
 * Validates an array of selectors against the current page DOM.
 * Used to show warning badges for steps whose selectors are not found.
 * - Searches main document and accessible iframes
 * - Reports match count for each selector
 *
 * Per FILL-04 and locked decisions from Phase 37 Plan 02
 */

import { findElement, type SelectorConfig } from './selector';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  stepId: string;
  found: boolean;
  matchCount: number;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Count all matches for a selector in main document
 */
function countMatches(config: SelectorConfig): number {
  try {
    if (config.type === 'css') {
      const elements = document.querySelectorAll(config.value);
      return elements.length;
    } else {
      // XPath: Use ORDERED_NODE_SNAPSHOT_TYPE to count matches
      const result = document.evaluate(
        config.value,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      return result.snapshotLength;
    }
  } catch {
    // Invalid selector
    return 0;
  }
}

/**
 * Count matches in accessible iframes
 */
function countInIframes(config: SelectorConfig): number {
  const iframes = document.querySelectorAll('iframe');
  let count = 0;

  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue; // Cross-origin or no access

      if (config.type === 'css') {
        const elements = doc.querySelectorAll(config.value);
        count += elements.length;
      } else {
        // XPath in iframe
        const result = doc.evaluate(
          config.value,
          doc,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        count += result.snapshotLength;
      }
    } catch {
      // Cross-origin iframe or access denied, skip
    }
  }

  return count;
}

/**
 * Validate a single selector configuration (primary + fallbacks)
 *
 * @param selector - Primary selector
 * @param fallbacks - Optional fallback selectors
 * @returns Total match count across primary and fallbacks
 */
function validateSelector(
  selector: SelectorConfig,
  fallbacks?: SelectorConfig[]
): { found: boolean; matchCount: number } {
  // Try primary selector in main document
  let matchCount = countMatches(selector);

  // If no matches, try fallbacks
  if (matchCount === 0 && fallbacks && fallbacks.length > 0) {
    for (const fallback of fallbacks) {
      matchCount = countMatches(fallback);
      if (matchCount > 0) break;
    }
  }

  // If still no matches, search iframes
  if (matchCount === 0) {
    matchCount = countInIframes(selector);

    // Try fallbacks in iframes
    if (matchCount === 0 && fallbacks && fallbacks.length > 0) {
      for (const fallback of fallbacks) {
        matchCount = countInIframes(fallback);
        if (matchCount > 0) break;
      }
    }
  }

  return {
    found: matchCount > 0,
    matchCount,
  };
}

/**
 * Validate multiple selectors against current page DOM
 *
 * @param selectors - Array of selector configurations with step IDs
 * @returns Array of validation results
 */
export function validateSelectors(
  selectors: Array<{
    stepId: string;
    selector: { type: 'css' | 'xpath'; value: string };
    selectorFallbacks?: Array<{ type: 'css' | 'xpath'; value: string }>;
  }>
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const item of selectors) {
    const { found, matchCount } = validateSelector(item.selector, item.selectorFallbacks);

    results.push({
      stepId: item.stepId,
      found,
      matchCount,
    });
  }

  return results;
}
