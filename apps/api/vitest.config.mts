import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

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
      // variables hold placeholder values. No test calls Grocy.
      env: {
        DB_FILE: ':memory:',
        GROCY_API_KEY: 'placeholder',
        GROCY_URL: 'https://grocy.invalid',
      },
      environment: 'node',
      globals: true,
      include: ['src/**/*.spec.ts'],
      name: 'api',
      reporters: ['default'],
      watch: false,
    },
  };
});
