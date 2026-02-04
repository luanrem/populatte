import type { FillExecuteMessage, PingResponse } from '../src/types';

import { executeSteps } from '../src/content';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    console.log('[Populatte] Content script loaded on:', window.location.hostname);

    // Register message listener
    browser.runtime.onMessage.addListener((message, _sender) => {
      console.log('[Populatte] Content script received:', message.type);

      // Ping handler
      if (message.type === 'PING') {
        return Promise.resolve({
          success: true,
          data: { pong: true, context: 'content' },
        } as PingResponse);
      }

      // Fill execute handler
      if (message.type === 'FILL_EXECUTE') {
        const msg = message as FillExecuteMessage;
        console.log('[Populatte] Execute fill with', msg.payload.steps.length, 'steps');

        // Execute steps using the step executor
        return (async () => {
          try {
            const result = await executeSteps(msg.payload.steps, msg.payload.rowData);

            return {
              success: result.success,
              data: { stepResults: result.stepResults },
            };
          } catch (err) {
            console.error('[Populatte] Fill execution error:', err);
            return {
              success: false,
              error: err instanceof Error ? err.message : 'Fill execution failed',
            };
          }
        })();
      }

      return false;
    });
  },
});
