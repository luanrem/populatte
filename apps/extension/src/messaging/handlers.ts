/**
 * Message Handler Registry
 *
 * Pattern for registering typed message handlers in background service worker.
 */

import type {
  ExtensionMessage,
  PopupToBackgroundMessage,
  ContentToBackgroundMessage,
} from '@/types';
import type { Response, VoidResponse } from '@/types';

const isDev = import.meta.env.DEV;

/**
 * Message handler function type
 */
export type MessageHandler<M extends ExtensionMessage, R> = (
  message: M,
  sender: browser.Runtime.MessageSender
) => Promise<R>;

/**
 * Handler registry type
 */
export type HandlerRegistry = {
  [K in ExtensionMessage['type']]?: MessageHandler<
    Extract<ExtensionMessage, { type: K }>,
    unknown
  >;
};

/**
 * Create a message handler that routes messages to registered handlers
 *
 * @param handlers - Object mapping message types to handler functions
 * @returns Listener function for browser.runtime.onMessage
 */
export function createMessageRouter(handlers: HandlerRegistry) {
  return (
    message: ExtensionMessage,
    sender: browser.Runtime.MessageSender
  ): Promise<unknown> | false => {
    const handler = handlers[message.type];

    if (!handler) {
      if (isDev) {
        console.warn('[Handler] No handler for message:', message.type);
      }
      return false;
    }

    if (isDev) {
      console.log('[Handler] Handling:', message.type);
    }

    // Execute handler and return promise
    return (handler as MessageHandler<typeof message, unknown>)(message, sender)
      .catch((error) => {
        console.error('[Handler] Error in', message.type, ':', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as Response<never>;
      });
  };
}

/**
 * Helper to create a success response
 */
export function success<T>(data: T): Response<T> {
  return { success: true, data };
}

/**
 * Helper to create a void success response
 */
export function ok(): VoidResponse {
  return { success: true };
}

/**
 * Helper to create an error response
 */
export function error(message: string): Response<never> {
  return { success: false, error: message };
}
