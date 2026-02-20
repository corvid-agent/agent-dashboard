import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4002',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npx serve -l 4002 -s .',
    url: 'http://localhost:4002',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
