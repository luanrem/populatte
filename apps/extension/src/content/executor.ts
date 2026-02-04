/**
 * Step Executor for Content Script
 *
 * Processes fill steps sequentially, coordinating the selector engine
 * and action executors to populate form fields on any web page.
 *
 * Per CONTEXT.md decisions:
 * - Strictly sequential execution (one step at a time, in defined order)
 * - Small delay (50-100ms) between fields for stability
 * - Optional steps skip silently on failure without aborting
 * - Required step failures abort remaining steps
 * - Per-step status reporting (each step reports success/failure with reason)
 */

import type { FillStep, StepResult } from '../types';

import { waitForElement } from './selector';
import { executeFill, executeClick, executeWait } from './actions';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionResult {
  /** True if all required steps succeeded */
  success: boolean;
  /** Per-step results */
  stepResults: StepResult[];
  /** Step ID where execution stopped (if aborted) */
  abortedAtStep?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Delay between steps in milliseconds (per CONTEXT: 50-100ms, using 75ms as middle ground) */
const STEP_DELAY_MS = 75;

/** Default wait timeout for element finding */
const ELEMENT_WAIT_TIMEOUT_MS = 2000;

/** Default wait duration for wait action */
const DEFAULT_WAIT_MS = 1000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Small delay helper for stability between steps
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the value to fill from row data or fixed value
 */
function getStepValue(
  step: FillStep,
  rowData: Record<string, unknown>
): string | undefined {
  // For fill actions, determine value source
  if (step.action === 'fill') {
    if (step.sourceFieldKey !== undefined) {
      const value = rowData[step.sourceFieldKey];
      // Convert to string if present
      return value !== undefined && value !== null ? String(value) : undefined;
    }
    if (step.fixedValue !== undefined) {
      return step.fixedValue;
    }
    // No value source specified for fill action
    return undefined;
  }

  // Click and wait actions don't need values
  return undefined;
}

// ============================================================================
// Main Executor
// ============================================================================

/**
 * Execute fill steps sequentially.
 *
 * Processes steps in stepOrder sequence, with proper handling for
 * optional/required steps, and reports per-step status.
 *
 * @param steps - Array of fill steps to execute
 * @param rowData - Data from the current row for value lookup
 * @returns Promise resolving to ExecutionResult with per-step status
 */
export async function executeSteps(
  steps: FillStep[],
  rowData: Record<string, unknown>
): Promise<ExecutionResult> {
  const stepResults: StepResult[] = [];
  let abortedAtStep: string | undefined;

  // Sort steps by stepOrder to ensure correct execution order
  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  for (let i = 0; i < sortedSteps.length; i++) {
    const step = sortedSteps[i]!;
    const startTime = performance.now();

    // Add delay between steps (except for first step)
    if (i > 0) {
      await delay(STEP_DELAY_MS);
    }

    // Execute the step
    const result = await executeStep(step, rowData);
    result.duration = Math.round(performance.now() - startTime);

    stepResults.push(result);

    // Check if we should abort
    if (!result.success && !result.skipped && !step.optional) {
      // Required step failed - abort remaining steps
      abortedAtStep = step.id;
      break;
    }
  }

  // Determine overall success
  // Success if no required step failed (skipped optional steps don't count as failures)
  const hasRequiredFailure = stepResults.some(
    (r, index) => !r.success && !r.skipped && !sortedSteps[index]?.optional
  );

  return {
    success: !hasRequiredFailure,
    stepResults,
    abortedAtStep,
  };
}

/**
 * Execute a single step.
 *
 * @param step - The step to execute
 * @param rowData - Data from the current row for value lookup
 * @returns Promise resolving to StepResult
 */
async function executeStep(
  step: FillStep,
  rowData: Record<string, unknown>
): Promise<StepResult> {
  // Handle wait action (no element needed)
  if (step.action === 'wait') {
    const waitMs = step.waitMs ?? DEFAULT_WAIT_MS;
    const actionResult = await executeWait(waitMs);

    return {
      stepId: step.id,
      success: actionResult.success,
      error: actionResult.error,
    };
  }

  // For fill and click actions, we need to find the element first
  const findResult = await waitForElement(
    step.selector,
    step.selectorFallbacks,
    ELEMENT_WAIT_TIMEOUT_MS
  );

  // Handle element not found
  if (!findResult.element) {
    if (step.optional) {
      return {
        stepId: step.id,
        success: false,
        skipped: true,
        reason: 'Element not found (optional)',
      };
    }
    return {
      stepId: step.id,
      success: false,
      error: `Element not found: ${step.selector.type}:${step.selector.value}`,
    };
  }

  const element = findResult.element;

  // Execute action based on type
  if (step.action === 'click') {
    const actionResult = await executeClick(element);

    if (!actionResult.success) {
      if (step.optional) {
        return {
          stepId: step.id,
          success: false,
          skipped: true,
          reason: actionResult.error ?? 'Click failed (optional)',
        };
      }
      return {
        stepId: step.id,
        success: false,
        error: actionResult.error,
      };
    }

    return {
      stepId: step.id,
      success: true,
    };
  }

  // Fill action
  if (step.action === 'fill') {
    const value = getStepValue(step, rowData);

    // Check if we have a value to fill
    if (value === undefined) {
      if (step.optional) {
        return {
          stepId: step.id,
          success: false,
          skipped: true,
          reason: 'No value available for fill (optional)',
        };
      }
      return {
        stepId: step.id,
        success: false,
        error: 'No value available for fill',
      };
    }

    const actionResult = executeFill(element, value, {
      clearBefore: step.clearBefore ?? true,
      pressEnter: step.pressEnter,
    });

    // Handle skipped file inputs
    if (actionResult.skipped) {
      return {
        stepId: step.id,
        success: false,
        skipped: true,
        reason: actionResult.error ?? 'Field requires manual action',
      };
    }

    if (!actionResult.success) {
      if (step.optional) {
        return {
          stepId: step.id,
          success: false,
          skipped: true,
          reason: actionResult.error ?? 'Fill failed (optional)',
        };
      }
      return {
        stepId: step.id,
        success: false,
        error: actionResult.error,
      };
    }

    return {
      stepId: step.id,
      success: true,
    };
  }

  // Unknown action type
  return {
    stepId: step.id,
    success: false,
    error: `Unknown action type: ${step.action}`,
  };
}
