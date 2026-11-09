/// <reference types='vitest' />
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { join } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

// The API listens on port 3000 on the host. The dev server forwards every
// request under `/api` to it, so the web app and the API share one origin
// in development.
const API_URL = 'http://localhost:3000';

export default defineConfig(({ mode }) => {
  // PROTOTYPE. Throwaway. The purchase scan screen prototype reads Grocy
  // through the dev server, under `/grocy`, with the key from the workspace
  // `.env`. `PROTO_PHONE=1` opens the dev server to the LAN over HTTPS with
  // a self-signed certificate, so that a phone can use the camera.
  // `PROTO_PHONE=http` opens it to the LAN with no HTTPS, for a phone with
  // the Chrome flag that treats the origin as secure.
  const env = loadEnv(mode, join(import.meta.dirname, '../..'), '');
  const phone = env.PROTO_PHONE === '1' || env.PROTO_PHONE === 'http';
  const https = env.PROTO_PHONE === '1';
  const grocyProxy = env.GROCY_URL
    ? {
        '/grocy': {
          target: env.GROCY_URL,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/grocy/, ''),
          headers: { 'GROCY-API-KEY': env.GROCY_API_KEY ?? '' },
        },
      }
    : {};

  return {
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    server: {
      port: 4200,
      host: phone ? true : 'localhost',
      proxy: {
        '/api': API_URL,
        ...grocyProxy,
      },
    },
    preview: {
      port: 4300,
      host: 'localhost',
    },
    plugins: [react(), tailwindcss(), nxReadySignal(), ...(https ? [basicSsl()] : [])],
    resolve: {
      // The `@/` alias points at `src`. shadcn/ui writes its components with it.
      alias: {
        '@': join(import.meta.dirname, 'src'),
      },
    },
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    test: {
      name: 'web',
      watch: false,
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.spec.{ts,tsx}'],
      reporters: ['default'],
      coverage: {
        reportsDirectory: './test-output/vitest/coverage',
        provider: 'v8' as const,
      },
    },
  };
});
