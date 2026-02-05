/**
 * Element Highlighter
 *
 * Shows blue outline overlay on interactive elements during capture mode.
 * Displays tooltip with element type and name/id hint.
 *
 * Per CONTEXT.md:
 * - Blue outline color scheme (high contrast)
 * - 150ms fade animation
 * - Tooltip shows element type + name/id hint
 * - Only main frame (no iframe support)
 * - All clickable elements highlightable (input, select, button, link)
 */

// ============================================================================
// Constants
// ============================================================================

const OVERLAY_CLASS = 'populatte-capture-overlay';
const TOOLTIP_CLASS = 'populatte-capture-tooltip';
const PULSE_CLASS = 'populatte-capture-pulse';
const STYLE_ID = 'populatte-capture-styles';

const INTERACTIVE_TAGS = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'];

// Maximum safe z-index for overlays
const Z_INDEX_OVERLAY = 2147483647;
const Z_INDEX_TOOLTIP = 2147483646;

// ============================================================================
// ElementHighlighter Class
// ============================================================================

export class ElementHighlighter {
  private overlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private isActive = false;
  private abortController: AbortController | null = null;
  private onCapture: ((element: HTMLElement) => void) | null = null;
  private currentTarget: HTMLElement | null = null;

  /**
   * Activate capture mode with element highlighting.
   *
   * @param onCapture - Callback invoked when user clicks an interactive element
   */
  public activate(onCapture: (element: HTMLElement) => void): void {
    if (this.isActive) return;

    this.isActive = true;
    this.onCapture = onCapture;
    this.abortController = new AbortController();

    // Inject styles for overlay and tooltip
    this.injectStyles();

    // Create overlay and tooltip elements
    this.createOverlay();
    this.createTooltip();

    // Add event listeners with abort signal for cleanup
    document.addEventListener('mouseover', this.handleMouseOver, {
      signal: this.abortController.signal,
      capture: true,
    });

    document.addEventListener('mouseout', this.handleMouseOut, {
      signal: this.abortController.signal,
      capture: true,
    });

    document.addEventListener('click', this.handleClick, {
      signal: this.abortController.signal,
      capture: true,
    });
  }

  /**
   * Deactivate capture mode and clean up all resources.
   */
  public deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.onCapture = null;
    this.currentTarget = null;

    // Abort all event listeners
    this.abortController?.abort();
    this.abortController = null;

    // Remove DOM elements
    this.overlay?.remove();
    this.overlay = null;

    this.tooltip?.remove();
    this.tooltip = null;

    this.styleElement?.remove();
    this.styleElement = null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private handleMouseOver = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;

    if (!this.isInteractiveElement(target)) {
      return;
    }

    this.currentTarget = target;
    this.showOverlay(target);
    this.showTooltip(target);
  };

  private handleMouseOut = (event: MouseEvent): void => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;

    // Only hide if moving to non-interactive element or leaving document
    if (!relatedTarget || !this.isInteractiveElement(relatedTarget)) {
      this.hideOverlay();
      this.hideTooltip();
      this.currentTarget = null;
    }
  };

  private handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;

    if (!this.isInteractiveElement(target)) {
      return;
    }

    // Prevent default and stop propagation
    event.preventDefault();
    event.stopPropagation();

    // Show pulse animation
    this.showPulse(target);

    // Invoke capture callback
    this.onCapture?.(target);
  };

  /**
   * Check if element is an interactive element that can be captured.
   */
  private isInteractiveElement(el: HTMLElement): boolean {
    return INTERACTIVE_TAGS.includes(el.tagName);
  }

  /**
   * Create the overlay element.
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = OVERLAY_CLASS;
    document.body.appendChild(this.overlay);
  }

  /**
   * Create the tooltip element.
   */
  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = TOOLTIP_CLASS;
    document.body.appendChild(this.tooltip);
  }

  /**
   * Show overlay positioned over the element.
   */
  private showOverlay(element: HTMLElement): void {
    if (!this.overlay) return;

    const rect = element.getBoundingClientRect();

    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
    this.overlay.style.opacity = '1';
  }

  /**
   * Hide the overlay.
   */
  private hideOverlay(): void {
    if (!this.overlay) return;
    this.overlay.style.opacity = '0';
  }

  /**
   * Show tooltip with element info above (or below) the element.
   */
  private showTooltip(element: HTMLElement): void {
    if (!this.tooltip) return;

    const rect = element.getBoundingClientRect();
    const tagName = element.tagName.toLowerCase();
    const name =
      (element as HTMLInputElement).name || element.id || 'unnamed';

    // Set tooltip content
    this.tooltip.textContent = `${tagName}: ${name}`;

    // Position tooltip above element by default
    const tooltipHeight = 28;
    const padding = 4;
    let top = rect.top - tooltipHeight - padding;

    // If collision with viewport top, show below instead
    if (top < 0) {
      top = rect.bottom + padding;
    }

    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${rect.left}px`;
    this.tooltip.style.opacity = '1';
  }

  /**
   * Hide the tooltip.
   */
  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.style.opacity = '0';
  }

  /**
   * Show brief pulse animation on capture.
   */
  private showPulse(element: HTMLElement): void {
    if (!this.overlay) return;

    const rect = element.getBoundingClientRect();

    // Position overlay at element
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    // Add pulse class
    this.overlay.classList.add(PULSE_CLASS);

    // Remove pulse class after animation
    setTimeout(() => {
      this.overlay?.classList.remove(PULSE_CLASS);
    }, 150);
  }

  /**
   * Inject CSS styles for overlay and tooltip.
   * Uses style element instead of inline styles for CSP compliance.
   */
  private injectStyles(): void {
    // Check if styles already exist
    if (document.getElementById(STYLE_ID)) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = STYLE_ID;
    this.styleElement.textContent = `
      .${OVERLAY_CLASS} {
        position: fixed;
        border: 2px solid #0066ff;
        background: rgba(0, 102, 255, 0.1);
        pointer-events: none;
        z-index: ${Z_INDEX_OVERLAY};
        opacity: 0;
        transition: opacity 150ms ease-out;
        box-sizing: border-box;
      }

      .${TOOLTIP_CLASS} {
        position: fixed;
        background: #0066ff;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500;
        pointer-events: none;
        z-index: ${Z_INDEX_TOOLTIP};
        opacity: 0;
        transition: opacity 150ms ease-out;
        white-space: nowrap;
      }

      .${PULSE_CLASS} {
        animation: populatte-pulse 150ms ease-out;
      }

      @keyframes populatte-pulse {
        from {
          box-shadow: 0 0 0 0 rgba(0, 102, 255, 0.4);
        }
        to {
          box-shadow: 0 0 0 8px rgba(0, 102, 255, 0);
        }
      }
    `;

    document.head.appendChild(this.styleElement);
  }
}
