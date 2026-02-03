import type { FillExecuteMessage, FillResultMessage, PingResponse, StepResult } from '../src/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    console.log('[Populatte] Content script loaded on:', window.location.hostname);

    // Register message listener
    browser.runtime.onMessage.addListener((message, sender) => {
      console.log('[Populatte] Content script received:', message.type);

      // Ping handler
      if (message.type === 'PING') {
        return Promise.resolve({
          success: true,
          data: { pong: true, context: 'content' },
        } as PingResponse);
      }

      // Fill execute handler (placeholder for Phase 28)
      if (message.type === 'FILL_EXECUTE') {
        const msg = message as FillExecuteMessage;
        console.log('[Populatte] Execute fill with', msg.payload.steps.length, 'steps');

        // Placeholder: Return mock success
        const results: StepResult[] = msg.payload.steps.map((step) => ({
          stepId: step.id,
          success: true,
          duration: 100,
        }));

        return Promise.resolve({
          success: true,
          data: { stepResults: results },
        });
      }

      return false;
    });
  },
});
