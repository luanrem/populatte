export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    console.log('[Populatte] Content script loaded on:', window.location.hostname);
  },
});
