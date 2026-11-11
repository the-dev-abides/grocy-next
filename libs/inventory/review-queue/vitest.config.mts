import { defineConfig } from 'vitest/config';

// The unit tests of the pure rules of the review queue. The HTTP boundary
// tests of the operations live in the API app.
export default defineConfig(() => {
  return {
    cacheDir: '../../../node_modules/.vite/libs/inventory/review-queue',
    root: import.meta.dirname,
    test: {
      coverage: {
        provider: 'v8' as const,
        reportsDirectory: './test-output/vitest/coverage',
      },
      environment: 'node',
      globals: true,
      include: ['src/**/*.spec.ts'],
      name: 'inventory-review-queue',
      reporters: ['default'],
      watch: false,
    },
  };
});
