/**
 * Content Script Utilities
 *
 * This module provides DOM interaction utilities for the content script:
 * - Selector engine: Find elements using CSS/XPath with fallback chains
 * - Action executors: Fill, click, and wait operations with framework compatibility
 *
 * These utilities are used by the step executor to populate form fields
 * on any web page, with proper handling for React/Vue frameworks.
 */

// ============================================================================
// Selector Engine
// ============================================================================

export { findElement, waitForElement } from './selector';
export type { SelectorConfig, FindResult } from './selector';

// ============================================================================
// Action Executors
// ============================================================================

export { executeFill, executeClick, executeWait } from './actions';
export type { ActionResult, FillOptions } from './actions';

// ============================================================================
// Step Executor
// ============================================================================

export { executeSteps } from './executor';
export type { ExecutionResult } from './executor';
