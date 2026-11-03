import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    // eslint-plugin-react 7.37.5 declares ESLint 9 as its peer. Its React
    // version detection calls a function that ESLint 10 removed. A fixed
    // version skips the detection. Remove this block when the plugin
    // supports ESLint 10.
    settings: { react: { version: '19' } },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
];
