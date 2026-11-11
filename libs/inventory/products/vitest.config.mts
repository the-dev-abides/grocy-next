import { defineConfig } from 'vitest/config';

// The unit tests of the pure rules of the Products library. The HTTP
// boundary tests of the operations live in the API app.
export default defineConfig(() => {
  return {
    cacheDir: '../../../node_modules/.vite/libs/inventory/products',
    root: import.meta.dirname,
    test: {
      coverage: {
        provider: 'v8' as const,
        reportsDirectory: './test-output/vitest/coverage',
      },
      environment: 'node',
      globals: true,
      include: ['src/**/*.spec.ts'],
      name: 'inventory-products',
      reporters: ['default'],
      watch: false,
    },
  };
});
