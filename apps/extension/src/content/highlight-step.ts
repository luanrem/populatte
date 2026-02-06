/**
 * Element Highlighting for Preencher Tab
 *
 * Highlights elements on the page when a step is clicked in the Preencher list.
 * - Amber/gold outline (non-intrusive, distinct from blue capture mode)
 * - Auto-dismiss after ~3 seconds
 * - Single match: highlight + focus + scroll to center
 * - Multiple matches: highlight all, no focus
 * - Searches inside accessible iframes
 *
 * Per FILL-03 and locked decisions from Phase 37 Plan 02
 */

import { findElement, type SelectorConfig } from './selector';

// ============================================================================
// Constants
// ============================================================================

const HIGHLIGHT_CLASS = 'populatte-step-highlight';
const STYLE_ID = 'populatte-step-highlight-styles';
const AUTO_DISMISS_MS = 3000;

// Maximum safe z-index for highlight outline
const Z_INDEX_HIGHLIGHT = 2147483645;

// ============================================================================
// Types
// ============================================================================

export interface HighlightResult {
  found: boolean;
  matchCount: number;
  highlighted: boolean;
}

// ============================================================================
// Module State
// ============================================================================

let highlightedElements: HTMLElement[] = [];
let dismissTimer: number | null = null;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Find all elements matching a selector (for multi-match detection)
 */
function findAllMatches(config: SelectorConfig): HTMLElement[] {
  const matches: HTMLElement[] = [];

  try {
    if (config.type === 'css') {
      const elements = document.querySelectorAll<HTMLElement>(config.value);
      matches.push(...Array.from(elements));
    } else {
      // XPath: Use ORDERED_NODE_SNAPSHOT_TYPE to get all matches
      const result = document.evaluate(
        config.value,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node instanceof HTMLElement) {
          matches.push(node);
        }
      }
    }
  } catch {
    // Invalid selector, return empty array
  }

  return matches;
}

/**
 * Search for element inside accessible iframes
 */
function findInIframes(config: SelectorConfig): HTMLElement[] {
  const iframes = document.querySelectorAll('iframe');
  const results: HTMLElement[] = [];

  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue; // Cross-origin or no access

      if (config.type === 'css') {
        const elements = doc.querySelectorAll<HTMLElement>(config.value);
        results.push(...Array.from(elements));
      } else {
        // XPath in iframe
        const result = doc.evaluate(
          config.value,
          doc,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i);
          if (node instanceof HTMLElement) {
            results.push(node);
          }
        }
      }
    } catch {
      // Cross-origin iframe or access denied, skip
    }
  }

  return results;
}

/**
 * Inject CSS styles for step highlighting
 */
function injectStyles(): void {
  // Check if styles already exist
  if (document.getElementById(STYLE_ID)) return;

  const styleElement = document.createElement('style');
  styleElement.id = STYLE_ID;
  styleElement.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #f59e0b !important;
      outline-offset: 2px !important;
      transition: outline-color 200ms ease !important;
      z-index: ${Z_INDEX_HIGHLIGHT} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

/**
 * Remove all existing highlights
 */
function removeAllHighlights(): void {
  for (const element of highlightedElements) {
    element.classList.remove(HIGHLIGHT_CLASS);
  }
  highlightedElements = [];

  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

/**
 * Highlight a single element with outline and optional focus
 */
function highlightElement(element: HTMLElement, shouldFocus: boolean): void {
  element.classList.add(HIGHLIGHT_CLASS);
  highlightedElements.push(element);

  if (shouldFocus) {
    // Focus element for immediate interaction
    element.focus();
    // Scroll to center of viewport
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Highlight step element on page
 *
 * @param selector - Primary selector configuration
 * @param fallbacks - Optional array of fallback selectors
 * @returns Result indicating found status, match count, and highlighted status
 */
export function highlightStepElement(
  selector: SelectorConfig,
  fallbacks?: SelectorConfig[]
): HighlightResult {
  // Clean up any existing highlights
  removeAllHighlights();

  // Inject styles if not already present
  injectStyles();

  // Try to find matches in main document
  let matches: HTMLElement[] = [];

  // Try primary selector first
  const primaryMatches = findAllMatches(selector);
  if (primaryMatches.length > 0) {
    matches = primaryMatches;
  } else if (fallbacks && fallbacks.length > 0) {
    // Try fallbacks in order
    for (const fallback of fallbacks) {
      const fallbackMatches = findAllMatches(fallback);
      if (fallbackMatches.length > 0) {
        matches = fallbackMatches;
        break;
      }
    }
  }

  // If no matches in main document, search iframes
  if (matches.length === 0) {
    const iframeMatches = findInIframes(selector);
    if (iframeMatches.length > 0) {
      matches = iframeMatches;
    } else if (fallbacks && fallbacks.length > 0) {
      // Try fallbacks in iframes
      for (const fallback of fallbacks) {
        const fallbackIframeMatches = findInIframes(fallback);
        if (fallbackIframeMatches.length > 0) {
          matches = fallbackIframeMatches;
          break;
        }
      }
    }
  }

  // No matches found
  if (matches.length === 0) {
    return {
      found: false,
      matchCount: 0,
      highlighted: false,
    };
  }

  // Highlight all matches
  const isSingleMatch = matches.length === 1;
  for (const match of matches) {
    // Only focus if single match
    highlightElement(match, isSingleMatch);
  }

  // Auto-dismiss after 3 seconds
  dismissTimer = window.setTimeout(() => {
    removeAllHighlights();
  }, AUTO_DISMISS_MS);

  return {
    found: true,
    matchCount: matches.length,
    highlighted: true,
  };
}
