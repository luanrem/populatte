/**
 * Capture Mode Coordinator
 *
 * Main coordinator for capture mode that orchestrates element highlighting,
 * badge tracking, and selector generation.
 *
 * Per CONTEXT.md:
 * - Content script can activate capture mode on demand
 * - Interactive elements highlight with blue outline on hover
 * - Clicking element captures CSS selector
 * - Captured elements show numbered badges
 */

import { ElementHighlighter } from './highlighter';
import { BadgeTracker } from './badge-tracker';
import { generateSelector, detectAction, type SelectorResult } from './selector-gen';

// ============================================================================
// Types
// ============================================================================

export interface CapturedStep {
  stepNumber: number;
  selector: SelectorResult;
  action: 'fill' | 'click';
  elementType: string;
  elementName: string;
}

// ============================================================================
// CaptureMode Class
// ============================================================================

export class CaptureMode {
  private highlighter: ElementHighlighter | null = null;
  private badgeTracker: BadgeTracker | null = null;
  private isActive = false;
  private capturedElements = new Map<HTMLElement, CapturedStep>();

  /**
   * Check if capture mode is currently active.
   */
  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Activate capture mode.
   *
   * Initializes highlighter and badge tracker, begins listening for element clicks.
   */
  public activate(): void {
    if (this.isActive) return;

    this.isActive = true;

    // Create components
    this.highlighter = new ElementHighlighter();
    this.badgeTracker = new BadgeTracker();

    // Activate highlighter with capture callback
    this.highlighter.activate(this.handleElementCaptured);
  }

  /**
   * Deactivate capture mode.
   *
   * Cleans up all resources, removes badges, and stops highlighting.
   */
  public deactivate(): void {
    if (!this.isActive) return;

    // Deactivate components
    this.highlighter?.deactivate();
    this.badgeTracker?.cleanup();

    // Clear state
    this.capturedElements.clear();

    // Release references
    this.highlighter = null;
    this.badgeTracker = null;
    this.isActive = false;
  }

  /**
   * Get all captured steps sorted by step number.
   *
   * @returns Array of captured steps in order
   */
  public getCapturedSteps(): CapturedStep[] {
    return Array.from(this.capturedElements.values()).sort(
      (a, b) => a.stepNumber - b.stepNumber
    );
  }

  /**
   * Remove a step by its step number.
   *
   * @param stepNumber - The step number to remove
   */
  public removeStep(stepNumber: number): void {
    // Find element with matching step number
    let elementToRemove: HTMLElement | null = null;

    this.capturedElements.forEach((step, element) => {
      if (step.stepNumber === stepNumber) {
        elementToRemove = element;
      }
    });

    if (elementToRemove) {
      // Remove badge
      this.badgeTracker?.removeBadge(elementToRemove);

      // Remove from captured elements
      this.capturedElements.delete(elementToRemove);
    }
  }

  /**
   * Highlight a step by its step number.
   * Scrolls the element into view and briefly highlights it.
   *
   * @param stepNumber - The step number to highlight
   */
  public highlightStep(stepNumber: number): void {
    // Find element with matching step number
    let elementToHighlight: HTMLElement | undefined;

    for (const [element, step] of this.capturedElements.entries()) {
      if (step.stepNumber === stepNumber) {
        elementToHighlight = element;
        break;
      }
    }

    if (elementToHighlight) {
      const el = elementToHighlight;

      // Scroll into view
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Flash highlight effect
      const originalOutline = el.style.outline;
      const originalOutlineOffset = el.style.outlineOffset;

      el.style.outline = '3px solid #f59e0b'; // Amber color
      el.style.outlineOffset = '2px';

      setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.outlineOffset = originalOutlineOffset;
      }, 1500);
    }
  }

  /**
   * Check if an element has already been captured.
   *
   * @param element - The HTML element to check
   * @returns true if element is already captured
   */
  public isElementCaptured(element: HTMLElement): boolean {
    return this.capturedElements.has(element);
  }

  /**
   * Get a captured step by element.
   *
   * @param element - The HTML element to look up
   * @returns The captured step or null if not found
   */
  public getStepByElement(element: HTMLElement): CapturedStep | null {
    return this.capturedElements.get(element) ?? null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Handle element capture from highlighter.
   * Arrow function to preserve `this` context.
   */
  private handleElementCaptured = (element: HTMLElement): void => {
    // Check if element already captured
    if (this.capturedElements.has(element)) {
      // Per CONTEXT.md: "Clicking already-captured element shows prompt"
      // Popup handles this - just send message with already-captured flag
      const existingStep = this.capturedElements.get(element);
      if (existingStep) {
        this.sendMessage({
          type: 'ELEMENT_ALREADY_CAPTURED',
          payload: {
            stepNumber: existingStep.stepNumber,
            elementType: existingStep.elementType,
            elementName: existingStep.elementName,
          },
        });
      }
      return;
    }

    // Generate selector
    const selector = generateSelector(element);

    // Detect action type
    const action = detectAction(element);

    // Add badge and get step number
    const stepNumber = this.badgeTracker?.addBadge(element) ?? 1;

    // Extract element info
    const elementType = element.tagName.toLowerCase();
    const elementName =
      (element as HTMLInputElement).name || element.id || '';

    // Create captured step
    const capturedStep: CapturedStep = {
      stepNumber,
      selector,
      action,
      elementType,
      elementName,
    };

    // Store captured element
    this.capturedElements.set(element, capturedStep);

    // Send message to popup
    this.sendMessage({
      type: 'ELEMENT_CAPTURED',
      payload: capturedStep,
    });
  };

  /**
   * Send message to popup/background.
   */
  private sendMessage(message: { type: string; payload: unknown }): void {
    // Check if chrome.runtime is available (content script context)
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(message).catch((error) => {
        // Extension context may be invalidated
        console.warn('[Populatte] Failed to send message:', error);
      });
    }
  }
}
