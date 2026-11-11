import type { Compiler, Configuration } from '@rspack/core';

import { NxAppRspackPlugin } from '@nx/rspack/app-plugin';
import path from 'node:path';

// Every bare import stays out of the bundle and loads from `node_modules` at
// run time, as an ES module import. Workspace libraries are bundled. The NX
// plugin builds its own externals list from the root `node_modules` folder,
// which does not hold the dependencies of this app under pnpm. This plugin
// runs after the NX plugin and replaces that list.
const keepDependenciesExternal = {
  apply(compiler: Compiler) {
    compiler.options.externals = [
      ({ request }, callback) => {
        const isBundled =
          !request ||
          request.startsWith('.') ||
          request.startsWith('/') ||
          request.startsWith('@grocy-next/');
        if (isBundled) {
          callback();
          return;
        }
        callback(undefined, `module ${request}`);
      },
    ];
  },
};

// The API is an ES module app. rspack bundles the source with SWC,
// which emits the decorator metadata that NestJS needs, and writes one ES
// module file.
const config: Configuration = {
  output: {
    chunkFilename: '[name].mjs',
    chunkFormat: 'module',
    filename: '[name].mjs',
    library: { type: 'module' },
    module: true,
    path: path.join(import.meta.dirname, 'dist'),
  },
  plugins: [
    new NxAppRspackPlugin({
      generatePackageJson: true,
      main: './src/main.ts',
      optimization: false,
      outputFileName: 'main.mjs',
      outputHashing: 'none',
      target: 'node',
      tsConfig: './tsconfig.app.json',
    }),
    keepDependenciesExternal,
  ],
};

export default config;
