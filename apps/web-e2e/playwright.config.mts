import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// The four processes of the end-to-end test environment, as ADR 0015
// decided. Each listens on a port of its own. The ports are the development
// ports plus 10000, so a test never touches the API on port 3000 or the web
// dev server on port 4200. The Imposter mocks start from the default
// Imposter port plus 10000.
const GROCY_MOCK_URL = 'http://localhost:18080';
const OPEN_FACTS_MOCK_URL = 'http://localhost:18081';
const API_URL = 'http://localhost:13000';
const WEB_URL = 'http://localhost:14200';

// The mock folders, relative to the workspace root. The Imposter CLI is on
// the PATH. The development documentation names it.
const MOCKS = 'tools/mocks';
const IMPOSTER_FLAGS = '--auto-restart=false --log-level info';

// The API build runs before the API starts. The build of the web app and
// the API takes longer than the Playwright default of one minute.
const START_TIMEOUT_MS = 180_000;

// The API writes its SQLite file into a new temporary folder on every run.
const databaseFolder = mkdtempSync(path.join(tmpdir(), 'grocy-next-e2e-'));

function portOf(url: string): string {
  const { port } = new URL(url);
  return port;
}

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
    baseURL: WEB_URL,
    // Playwright records a trace when it retries a failed test.
    trace: 'on-first-retry',
  },
  // Playwright starts the four processes and stops them after the run. It
  // never reuses a process that already runs. A port in use fails the run.
  webServer: [
    {
      command: `node ${MOCKS}/src/complete-grocy-spec.mjs && imposter up ${MOCKS}/grocy --port ${portOf(GROCY_MOCK_URL)} ${IMPOSTER_FLAGS}`,
      cwd: workspaceRoot,
      reuseExistingServer: false,
      url: `${GROCY_MOCK_URL}/system/status`,
    },
    {
      command: `imposter up ${MOCKS}/open-food-facts --port ${portOf(OPEN_FACTS_MOCK_URL)} ${IMPOSTER_FLAGS}`,
      cwd: workspaceRoot,
      reuseExistingServer: false,
      url: `${OPEN_FACTS_MOCK_URL}/system/status`,
    },
    {
      command: 'pnpm exec nx run api:build && node apps/api/dist/main.mjs',
      cwd: workspaceRoot,
      env: {
        DB_ENGINE: 'sqlite',
        DB_FILE: path.join(databaseFolder, 'grocy-next.db'),
        GROCY_API_KEY: 'e2e',
        GROCY_URL: GROCY_MOCK_URL,
        OPEN_FACTS_URL: OPEN_FACTS_MOCK_URL,
        PORT: portOf(API_URL),
      },
      reuseExistingServer: false,
      timeout: START_TIMEOUT_MS,
      url: `${API_URL}/api/v2/health/ready`,
    },
    {
      // The web dev server forwards `/api` to the API of this run. Vite
      // starts directly, not through the NX `web:dev` target, because NX
      // starts a continuous task in a process of its own that outlives the
      // stop signal of Playwright.
      command: `pnpm exec vite --port ${portOf(WEB_URL)} --strictPort`,
      cwd: path.join(workspaceRoot, 'apps', 'web'),
      env: { API_URL },
      reuseExistingServer: false,
      url: WEB_URL,
    },
  ],
});
