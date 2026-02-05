/**
 * Badge Tracker
 *
 * Tracks captured elements and displays numbered badges at their top-right corner.
 * Uses IntersectionObserver for efficient position tracking without polling.
 *
 * Per RESEARCH.md:
 * - Use IntersectionObserver (not getBoundingClientRect polling) for performance
 * - Observers batch updates efficiently, polling causes reflow every frame
 */

// ============================================================================
// Constants
// ============================================================================

const BADGE_CLASS = 'populatte-capture-badge';
const Z_INDEX_BADGE = 2147483646;

// ============================================================================
// Types
// ============================================================================

interface BadgeInfo {
  badge: HTMLDivElement;
  stepNumber: number;
}

// ============================================================================
// BadgeTracker Class
// ============================================================================

export class BadgeTracker {
  private badges = new Map<HTMLElement, BadgeInfo>();
  private observer: IntersectionObserver;
  private stepCounter = 0;

  public constructor() {
    // Create IntersectionObserver to track element visibility
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      { threshold: [0, 0.1, 0.9, 1] } // Detect entering/leaving viewport
    );
  }

  /**
   * Add a numbered badge to an element.
   *
   * @param element - The HTML element to add a badge to
   * @returns The step number assigned to this badge
   */
  public addBadge(element: HTMLElement): number {
    // Increment step counter
    this.stepCounter++;
    const stepNumber = this.stepCounter;

    // Create badge element
    const badge = this.createBadge(stepNumber);

    // Store in map
    this.badges.set(element, { badge, stepNumber });

    // Position badge initially
    this.updateBadgePosition(element);

    // Start observing element
    this.observer.observe(element);

    // Append to document body
    document.body.appendChild(badge);

    return stepNumber;
  }

  /**
   * Remove a badge from an element.
   *
   * @param element - The HTML element to remove the badge from
   */
  public removeBadge(element: HTMLElement): void {
    const info = this.badges.get(element);
    if (!info) return;

    // Stop observing
    this.observer.unobserve(element);

    // Remove badge from DOM
    info.badge.remove();

    // Remove from map
    this.badges.delete(element);
  }

  /**
   * Get the badge number for an element.
   *
   * @param element - The HTML element to check
   * @returns The step number if element has a badge, null otherwise
   */
  public getBadgeNumber(element: HTMLElement): number | null {
    const info = this.badges.get(element);
    return info?.stepNumber ?? null;
  }

  /**
   * Get the total number of badges.
   */
  public count(): number {
    return this.badges.size;
  }

  /**
   * Update the position of a badge for an element.
   *
   * @param element - The HTML element whose badge position to update
   */
  public updateBadgePosition(element: HTMLElement): void {
    const info = this.badges.get(element);
    if (!info) return;

    const rect = element.getBoundingClientRect();

    // Position badge at top-right corner
    // Badge is 24x24, so offset by 12 to center on corner
    info.badge.style.top = `${rect.top - 12}px`;
    info.badge.style.left = `${rect.right - 12}px`;
  }

  /**
   * Clean up all badges and observers.
   */
  public cleanup(): void {
    // Disconnect observer
    this.observer.disconnect();

    // Remove all badges from DOM
    this.badges.forEach((info) => {
      info.badge.remove();
    });

    // Clear map and reset counter
    this.badges.clear();
    this.stepCounter = 0;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Handle intersection observer callback.
   */
  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const info = this.badges.get(element);
      if (!info) continue;

      if (entry.isIntersecting) {
        // Element is visible - show badge and update position
        info.badge.style.display = 'flex';
        this.updateBadgePosition(element);
      } else {
        // Element is not visible - hide badge
        info.badge.style.display = 'none';
      }
    }
  }

  /**
   * Create a badge element with the step number.
   */
  private createBadge(stepNumber: number): HTMLDivElement {
    const badge = document.createElement('div');
    badge.className = BADGE_CLASS;
    badge.textContent = stepNumber.toString();
    badge.style.cssText = `
      position: fixed;
      width: 24px;
      height: 24px;
      background: #0066ff;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
      z-index: ${Z_INDEX_BADGE};
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    return badge;
  }
}
