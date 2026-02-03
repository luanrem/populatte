/**
 * Message Sending Utilities
 *
 * Type-safe functions for sending messages between extension contexts.
 */

import type {
  PopupToBackgroundMessage,
  BackgroundToContentMessage,
} from '@/types';

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds
const isDev = import.meta.env.DEV;

/**
 * Send message from Popup to Background
 *
 * @param message - Typed message to send
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Promise resolving to response or rejecting on timeout/error
 */
export async function sendToBackground<T>(
  message: PopupToBackgroundMessage,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  if (isDev) {
    console.log('[Messaging] Popup -> Background:', message.type);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Message timeout: ${message.type} (${timeoutMs}ms)`));
    }, timeoutMs);

    browser.runtime
      .sendMessage(message)
      .then((response) => {
        clearTimeout(timeout);
        if (isDev) {
          console.log('[Messaging] Background response:', response);
        }
        resolve(response as T);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('[Messaging] Send error:', error);
        reject(error);
      });
  });
}

/**
 * Send message from Background to Content Script
 *
 * @param tabId - Tab ID to send message to
 * @param message - Typed message to send
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns Promise resolving to response or rejecting on timeout/error
 */
export async function sendToContent<T>(
  tabId: number,
  message: BackgroundToContentMessage,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  if (isDev) {
    console.log('[Messaging] Background -> Content:', message.type, 'tab:', tabId);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Message timeout: ${message.type} (${timeoutMs}ms)`));
    }, timeoutMs);

    browser.tabs
      .sendMessage(tabId, message)
      .then((response) => {
        clearTimeout(timeout);
        if (isDev) {
          console.log('[Messaging] Content response:', response);
        }
        resolve(response as T);
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('[Messaging] Send to content error:', error);
        reject(error);
      });
  });
}

/**
 * Broadcast message to all extension contexts (popup)
 *
 * Used by background to push state updates.
 * Silently ignores errors (popup may not be open).
 */
export async function broadcast(message: { type: string; payload: unknown }): Promise<void> {
  if (isDev) {
    console.log('[Messaging] Broadcast:', message.type);
  }

  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // Popup not open, ignore
  }
}
