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
  use: {
    baseURL: webServerAddress,
    // Playwright records a trace when it retries a failed test.
    trace: 'on-first-retry',
  },
  // The tests run against the web dev server. Playwright reuses a server
  // that already runs.
  webServer: {
    command: 'pnpm exec nx run web:dev',
    cwd: workspaceRoot,
    reuseExistingServer: true,
    url: webServerAddress,
  },
});
