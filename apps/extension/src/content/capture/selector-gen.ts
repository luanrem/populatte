/**
 * CSS Selector Generation
 *
 * Wraps css-selector-generator to produce unique, stable CSS selectors
 * with fallback chains for resilient element finding.
 *
 * Per RESEARCH.md:
 * - css-selector-generator handles edge cases (shadow DOM, dynamic IDs, framework classes)
 * - Blacklist framework-generated classes (React, Angular, Vue)
 * - Generate fallback selector with nth-child for resilience
 */

import { getCssSelector } from 'css-selector-generator';

// ============================================================================
// Types
// ============================================================================

export interface SelectorValue {
  type: 'css';
  value: string;
}

export interface SelectorResult {
  primary: SelectorValue;
  fallbacks?: SelectorValue[];
}

// ============================================================================
// Selector Generation
// ============================================================================

/**
 * Generate a unique CSS selector for an element with fallback.
 *
 * Primary selector uses ID, class, tag, and attributes while blacklisting
 * framework-generated classes. Fallback uses nth-child for resilience.
 *
 * @param element - The HTML element to generate a selector for
 * @returns SelectorResult with primary and optional fallback selectors
 */
export function generateSelector(element: HTMLElement): SelectorResult {
  // Generate primary selector with standard options
  const primaryValue = getCssSelector(element, {
    selectors: ['id', 'class', 'tag', 'attribute'],
    blacklist: [
      /^js-/, // JavaScript hooks
      /^ng-/, // Angular
      /^react-/, // React
      /^vue-/, // Vue
      /^_\w+/, // Private classes
      /\w+-[a-f0-9]{6,}/, // Hashed classes (e.g., button-abc123)
    ],
    combineWithinSelector: true,
    combineBetweenSelectors: true,
    maxCombinations: 10,
  });

  // Generate fallback with nth-child only for resilience
  const fallbackValue = getCssSelector(element, {
    selectors: ['tag', 'nthchild'],
    includeTag: true,
  });

  return {
    primary: { type: 'css', value: primaryValue },
    fallbacks: [{ type: 'css', value: fallbackValue }],
  };
}

// ============================================================================
// Action Detection
// ============================================================================

/**
 * Detect the appropriate action type for an element.
 *
 * - 'fill' for INPUT, TEXTAREA, SELECT (elements that accept user input)
 * - 'click' for everything else (BUTTON, A, etc.)
 *
 * @param element - The HTML element to detect action for
 * @returns 'fill' or 'click' based on element type
 */
export function detectAction(element: HTMLElement): 'fill' | 'click' {
  const fillTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
  return fillTypes.includes(element.tagName) ? 'fill' : 'click';
}
