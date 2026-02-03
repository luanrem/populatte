export default defineBackground(() => {
  console.log('[Populatte] Service worker initialized');

  // Log when extension is installed or updated
  browser.runtime.onInstalled.addListener((details) => {
    console.log('[Populatte] Extension installed/updated:', details.reason);
  });
});
