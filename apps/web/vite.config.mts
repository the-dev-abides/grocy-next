/// <reference types='vitest' />
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

// The API listens on port 3000 on the host. The dev server forwards every
// request under `/api` to it, so the web app and the API share one origin
// in development.
const API_URL = 'http://localhost:3000';

export default defineConfig(() => {
  return {
    build: {
      emptyOutDir: true,
      outDir: './dist',
      reportCompressedSize: true,
    },
    cacheDir: '../../node_modules/.vite/apps/web',
    plugins: [react(), tailwindcss(), nxReadySignal()],
    preview: {
      host: 'localhost',
      port: 4300,
    },
    resolve: {
      // The `@/` alias points at `src`. shadcn/ui writes its components with it.
      alias: {
        '@': path.join(import.meta.dirname, 'src'),
      },
    },
    root: import.meta.dirname,
    server: {
      host: 'localhost',
      port: 4200,
      proxy: {
        '/api': API_URL,
      },
    },
    test: {
      coverage: {
        provider: 'v8' as const,
        reportsDirectory: './test-output/vitest/coverage',
      },
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.spec.{ts,tsx}'],
      name: 'web',
      reporters: ['default'],
      watch: false,
    },
  };
});
