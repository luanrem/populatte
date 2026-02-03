/**
 * Messaging Module
 *
 * Provides type-safe message passing between extension contexts.
 *
 * Usage in Popup:
 *   import { sendToBackground } from '@/messaging';
 *   const response = await sendToBackground<AuthResponse>({ type: 'GET_AUTH' });
 *
 * Usage in Background:
 *   import { createMessageRouter, success, error } from '@/messaging';
 *   const router = createMessageRouter({
 *     'GET_AUTH': async () => success({ ... }),
 *     'AUTH_LOGIN': async (msg) => { ... },
 *   });
 *   browser.runtime.onMessage.addListener(router);
 */

export { sendToBackground, sendToContent, broadcast } from './send';
export { createMessageRouter, success, ok, error } from './handlers';
export type { MessageHandler, HandlerRegistry } from './handlers';
