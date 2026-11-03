import { getReadyUrl, workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

// The web dev server listens on port 4200. `getReadyUrl` moves the address
// to the port that the serve task reported.
const webServerAddress = getReadyUrl('http://localhost:4200');

// This file is `.mts`, so Node loads it as an ES module. Playwright finds
// `playwright.config.mts` by its extension list.
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    baseURL: webServerAddress,
    // Playwright records a trace when it retries a failed test.
    trace: 'on-first-retry',
  },
  // The tests run against the web dev server. A server that already runs
  // is reused.
  webServer: {
    command: 'pnpm exec nx run web:dev',
    url: webServerAddress,
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
