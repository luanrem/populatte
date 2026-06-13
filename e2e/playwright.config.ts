import { defineConfig } from '@playwright/test';

/**
 * Serves the repo root so tests can reach both the synthetic forms
 * (docs/test-documents/...) and the generated RAL fixtures (e2e/fixtures/generated/...).
 *
 * NOTE: uses python3 as the static server (present locally). For CI, swap to a
 * Node static server to drop the Python dependency (tracked under F1 tooling).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8899',
    headless: true,
  },
  webServer: {
    command: 'python3 -m http.server 8899',
    cwd: '..',
    url: 'http://localhost:8899/docs/test-documents/formulario-simples.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
