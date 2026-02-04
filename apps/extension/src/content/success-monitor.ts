/**
 * Success Monitor
 *
 * Monitors for success conditions after form fill:
 * - url_change: Page navigates to a different URL
 * - text_appears: Specific text appears in the DOM
 * - element_disappears: A specific element is removed from DOM
 *
 * Per CONTEXT.md: MVP supports both COPILOTO (manual) AND auto-detect modes
 */

export type SuccessTriggerType = 'url_change' | 'text_appears' | 'element_disappears';

export interface SuccessConfig {
  selector?: string; // CSS selector for text_appears or element_disappears
  pattern?: string; // URL pattern for url_change, text pattern for text_appears
}

export interface MonitorOptions {
  trigger: SuccessTriggerType;
  config: SuccessConfig;
  timeoutMs?: number; // Default 30000ms (30 seconds)
}

type MonitorCallback = (success: boolean, reason: string) => void;

export class SuccessMonitor {
  private trigger: SuccessTriggerType;
  private config: SuccessConfig;
  private timeoutMs: number;
  private callback: MonitorCallback | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private observer: MutationObserver | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;
  private initialUrl: string;
  private stopped = false;

  public constructor(options: MonitorOptions) {
    this.trigger = options.trigger;
    this.config = options.config;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.initialUrl = window.location.href;
  }

  public start(callback: MonitorCallback): void {
    this.callback = callback;
    this.stopped = false;

    // Start timeout
    this.timeoutId = setTimeout(() => {
      this.stop();
      callback(false, `Timeout after ${this.timeoutMs}ms waiting for success`);
    }, this.timeoutMs);

    // Start appropriate monitor based on trigger type
    switch (this.trigger) {
      case 'url_change':
        this.startUrlMonitor();
        break;
      case 'text_appears':
        this.startTextMonitor();
        break;
      case 'element_disappears':
        this.startElementMonitor();
        break;
    }
  }

  public stop(): void {
    this.stopped = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private onSuccess(reason: string): void {
    if (this.stopped) return;
    this.stop();
    this.callback?.(true, reason);
  }

  // URL Change Monitor
  private startUrlMonitor(): void {
    const checkUrl = (): void => {
      if (this.stopped) return;
      const currentUrl = window.location.href;
      if (currentUrl !== this.initialUrl) {
        // If pattern specified, check if new URL matches
        if (this.config.pattern) {
          if (currentUrl.includes(this.config.pattern)) {
            this.onSuccess(`URL changed to match pattern: ${this.config.pattern}`);
          }
          // URL changed but doesn't match pattern - keep watching
        } else {
          // No pattern - any URL change is success
          this.onSuccess(`URL changed from ${this.initialUrl} to ${currentUrl}`);
        }
      }
    };

    // Poll every 100ms (navigation events are unreliable in content scripts)
    this.pollId = setInterval(() => {
      if (this.stopped) {
        if (this.pollId) {
          clearInterval(this.pollId);
          this.pollId = null;
        }
        return;
      }
      checkUrl();
    }, 100);
  }

  // Text Appears Monitor
  private startTextMonitor(): void {
    const pattern = this.config.pattern ?? this.config.selector;
    if (!pattern) {
      this.callback?.(false, 'No text pattern specified for text_appears trigger');
      return;
    }

    const checkText = (): void => {
      if (this.stopped) return;
      // Check if text appears anywhere in the document
      if (document.body.textContent?.includes(pattern)) {
        this.onSuccess(`Text appeared: "${pattern}"`);
      }
    };

    // Check immediately
    checkText();

    // Watch for DOM changes
    this.observer = new MutationObserver(() => checkText());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // Element Disappears Monitor
  private startElementMonitor(): void {
    const selector = this.config.selector;
    if (!selector) {
      this.callback?.(false, 'No selector specified for element_disappears trigger');
      return;
    }

    // Check if element exists initially
    const element = document.querySelector(selector);
    if (!element) {
      // Element already doesn't exist - immediate success
      this.onSuccess(`Element not found: ${selector}`);
      return;
    }

    // Watch for removal
    this.observer = new MutationObserver(() => {
      if (this.stopped) return;
      if (!document.querySelector(selector)) {
        this.onSuccess(`Element disappeared: ${selector}`);
      }
    });

    // Watch parent for child removals
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

// Module-level instance for singleton pattern
let activeMonitor: SuccessMonitor | null = null;

export function startSuccessMonitor(
  options: MonitorOptions,
  callback: MonitorCallback
): void {
  // Stop any existing monitor
  stopSuccessMonitor();

  activeMonitor = new SuccessMonitor(options);
  activeMonitor.start(callback);
}

export function stopSuccessMonitor(): void {
  if (activeMonitor) {
    activeMonitor.stop();
    activeMonitor = null;
  }
}
