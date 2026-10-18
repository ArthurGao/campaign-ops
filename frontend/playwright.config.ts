import { defineConfig } from '@playwright/test';

/** Browser smoke for the standalone (mock-mode) frontend: key demo flows through the real UI. */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5402',
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite --port 5402 --strictPort',
    url: 'http://localhost:5402',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { VITE_API_MODE: 'mock' },
  },
});
