import { NxAppRspackPlugin } from '@nx/rspack/app-plugin';
import type { Compiler, Configuration } from '@rspack/core';
import { join } from 'node:path';

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
          return callback();
        }
        return callback(undefined, `module ${request}`);
      },
    ];
  },
};

// The API is an ES module application. rspack bundles the source with SWC,
// which emits the decorator metadata that NestJS needs, and writes one ES
// module file.
const config: Configuration = {
  output: {
    path: join(import.meta.dirname, 'dist'),
    filename: '[name].mjs',
    chunkFilename: '[name].mjs',
    module: true,
    chunkFormat: 'module',
    library: { type: 'module' },
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new NxAppRspackPlugin({
      target: 'node',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      outputFileName: 'main.mjs',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
    keepDependenciesExternal,
  ],
};

export default config;
