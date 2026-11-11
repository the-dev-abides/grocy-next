import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

import { GROCY_MOCK_URL, OPEN_FACTS_MOCK_URL } from './vitest.global-setup.mts';

export default defineConfig(() => {
  return {
    cacheDir: '../../node_modules/.vite/apps/api',
    plugins: [
      // SWC emits the decorator metadata that NestJS reads. esbuild does not.
      swc.vite({
        jsc: {
          parser: { decorators: true, syntax: 'typescript' },
          target: 'es2022',
          transform: { decoratorMetadata: true, legacyDecorator: true },
        },
        module: { type: 'es6' },
      }),
    ],
    root: import.meta.dirname,
    test: {
      coverage: {
        provider: 'v8' as const,
        reportsDirectory: './test-output/vitest/coverage',
      },
      // The tests run on SQLite in memory and write no file. The Grocy
      // variables and the Open Facts variable point at the two Imposter
      // mocks that the global setup starts.
      env: {
        DB_FILE: ':memory:',
        GROCY_API_KEY: 'test',
        GROCY_URL: GROCY_MOCK_URL,
        OPEN_FACTS_URL: OPEN_FACTS_MOCK_URL,
      },
      environment: 'node',
      globals: true,
      globalSetup: './vitest.global-setup.mts',
      include: ['src/**/*.spec.ts'],
      name: 'api',
      reporters: ['default'],
      watch: false,
    },
  };
});
