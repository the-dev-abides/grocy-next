// The one lint configuration of the workspace. ADR 0016 records the
// decision: every rule is an error, no comment turns a rule off, and a rule
// changes only here, in its own commit, with a comment that says why.
//
// Each project `eslint.config.mjs` imports this file and exports it. ESLint
// 10 finds the nearest configuration file for each linted file, so every
// object here carries `basePath`, and every glob is relative to the repo
// root in every project.
import eslintReact from '@eslint-react/eslint-plugin';
import nx from '@nx/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import { importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import playwright from 'eslint-plugin-playwright';
import reactHooks from 'eslint-plugin-react-hooks';
import sonarjs from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import unicorn from 'eslint-plugin-unicorn';
import * as jsoncParser from 'jsonc-eslint-parser';
import tseslint from 'typescript-eslint';
import path from 'node:path';

const ROOT = import.meta.dirname;

// The file groups. The web rules apply to `apps/web/**`, the Playwright
// rules to `apps/web-e2e/**`, and the test rules to `*.spec.*`.
const CODE_FILES = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.mts',
  '**/*.cts',
  '**/*.js',
  '**/*.jsx',
  '**/*.mjs',
  '**/*.cjs',
];
const WEB_FILES = ['apps/web/**/*.ts', 'apps/web/**/*.tsx'];
const WEB_JSX_FILES = ['apps/web/**/*.tsx'];
const E2E_FILES = ['apps/web-e2e/**/*.ts'];
const TEST_FILES = [
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.mts',
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/*.spec.mjs',
];
const WEB_TEST_FILES = ['apps/web/**/*.spec.ts', 'apps/web/**/*.spec.tsx'];
const PROJECT_CONFIG_FILES = [
  'apps/*/eslint.config.mjs',
  'libs/*/*/eslint.config.mjs',
  'tools/*/eslint.config.mjs',
];
const LIBRARY_ENTRY_FILES = ['libs/**/src/index.ts'];

// The files that a tool loads by its default export.
const TOOL_CONFIG_FILES = [
  '**/eslint.config.mjs',
  '**/vite.config.mts',
  '**/vitest.config.mts',
  '**/rspack.config.ts',
  '**/playwright.config.mts',
];

// The files that read the process environment. Every other file gets the
// values as a parameter.
const OPTION_READER_FILES = ['**/*-options.ts'];

// The files that call axios. The Grocy client and the lookup provider talk
// to a service outside the process. Every other file goes through them.
const AXIOS_CALLER_FILES = ['**/grocy/grocy-client.ts', '**/lookup/**'];

// The Grocy API shapes and the Claude Code hook protocol. Their fields are
// snake_case.
const SNAKE_CASE_SHAPE_FILES = ['**/grocy/**', 'tools/checks/**'];

const LIBRARY_TYPES = [
  'type:feature',
  'type:ui',
  'type:data-access',
  'type:util',
];

// The rules of the specs and the ADRs, as syntax patterns. A test file gets
// the list without the three cast entries.
const RESTRICTED_SYNTAX = [
  {
    selector:
      'CallExpression[callee.object.name="z"][callee.property.name="object"]',
    message: 'Use z.strictObject. Every object schema rejects an unknown key.',
  },
  {
    selector: 'ClassDeclaration[superClass.name="BaseEntity"]',
    message:
      'Do not extend BaseEntity. ADR 0008 allows the Data Mapper pattern only.',
  },
  {
    selector:
      'CallExpression > MemberExpression > Identifier[name=/^(toHaveBeen(Nth|Last)?Called|toBeCalled)/]',
    message:
      'Do not assert a call. Assert the result at the boundary of the module.',
  },
  {
    selector: 'TSEnumDeclaration',
    message:
      'Do not declare an enum. Write a const array and a union of its members.',
  },
  {
    selector: 'TSNonNullExpression',
    message: 'Do not assert non-null. Check the value, or parse it with Zod.',
  },
  {
    selector: 'TSAsExpression:not([typeAnnotation.typeName.name="const"])',
    message: 'Do not cast with as. Check the value, or parse it with Zod.',
  },
  {
    selector: 'TSTypeAssertion',
    message:
      'Do not cast with angle brackets. Check the value, or parse it with Zod.',
  },
];
const CAST_SELECTORS = new Set([
  'TSNonNullExpression',
  'TSAsExpression:not([typeAnnotation.typeName.name="const"])',
  'TSTypeAssertion',
]);

// No test asserts a call count or a mocked internal.
const MOCK_PROPERTIES = [
  {
    object: 'vi',
    property: 'mock',
    message: 'Do not mock. Test at the boundary of the module.',
  },
  {
    object: 'vi',
    property: 'spyOn',
    message: 'Do not spy. Test at the boundary of the module.',
  },
  {
    object: 'vi',
    property: 'fn',
    message: 'Do not mock. Test at the boundary of the module.',
  },
];
// The files that read the options are the only readers of the environment.
const ENVIRONMENT_PROPERTY = {
  object: 'process',
  property: 'env',
  message:
    'Read the environment in a *-options.ts file. Every other file gets the values as a parameter.',
};

// Every rule of a plugin preset, at the error level.
function asErrors(rules) {
  return Object.fromEntries(
    Object.entries(rules).map(([name, level]) => {
      if (level === 'off' || (Array.isArray(level) && level[0] === 'off')) {
        return [name, level];
      }
      if (Array.isArray(level)) {
        return [name, ['error', ...level.slice(1)]];
      }
      return [name, 'error'];
    }),
  );
}

// Every object of this array gets the repo root as its base path.
function atRoot(configs) {
  return configs.map((config) => ({ ...config, basePath: ROOT }));
}

// The naming rule. camelCase for variables and functions, PascalCase for
// types and classes, UPPER_CASE for module constants, no `I` prefix on an
// interface, no leading underscore. `propertyFormats` is the list of formats
// of an object property. An object literal key can also be UPPER_CASE,
// because an environment variable name is UPPER_CASE.
function namingConvention(propertyFormats) {
  return [
    'error',
    {
      selector: 'default',
      format: ['camelCase'],
      leadingUnderscore: 'forbid',
      trailingUnderscore: 'forbid',
    },
    { selector: 'import', format: ['camelCase', 'PascalCase'] },
    {
      selector: 'variable',
      modifiers: ['const', 'global'],
      format: ['camelCase', 'UPPER_CASE'],
    },
    { selector: 'function', format: ['camelCase', 'PascalCase'] },
    { selector: 'typeLike', format: ['PascalCase'] },
    {
      selector: 'interface',
      format: ['PascalCase'],
      custom: { regex: '^I[A-Z]', match: false },
    },
    {
      selector: 'typeProperty',
      format: propertyFormats,
    },
    {
      selector: 'objectLiteralProperty',
      format: [...propertyFormats, 'UPPER_CASE'],
    },
    {
      // A key that needs quotes is an external name, such as a header.
      selector: ['objectLiteralProperty', 'typeProperty'],
      modifiers: ['requiresQuotes'],
      format: null,
    },
  ];
}

const config = [
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/test-output',
      '**/vitest.config.*.timestamp*',
      '**/vite.config.*.timestamp*',
      '.nx',
    ],
  },

  // The base set: typescript-eslint strict and stylistic, with the types.
  ...[
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ].map((preset) => ({ ...preset, files: CODE_FILES })),
  {
    files: CODE_FILES,
    languageOptions: {
      parserOptions: {
        projectService: {
          // The configuration files of the tools are in no tsconfig.
          allowDefaultProject: [
            'eslint.config.mjs',
            'vitest.config.mts',
            'apps/*/eslint.config.mjs',
            'libs/*/*/eslint.config.mjs',
            'tools/*/eslint.config.mjs',
          ],
        },
        tsconfigRootDir: ROOT,
      },
    },
    linterOptions: {
      // No comment turns a rule off. ESLint reports the comment instead.
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
    plugins: {
      '@nx': nx,
      'import-x': importX,
      perfectionist,
      sonarjs,
      unicorn,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: [
            'tsconfig.json',
            'apps/*/tsconfig.json',
            'libs/*/*/tsconfig.json',
            'tools/*/tsconfig.json',
          ],
        }),
      ],
    },
    rules: {
      ...asErrors(unicorn.configs.all.rules),
      ...asErrors(sonarjs.configs.recommended.rules),

      // The module boundaries. A domain imports only itself and
      // `scope:shared`. A domain adds its own line here. An app imports its
      // own scope, `scope:shared`, and the domains that it composes. The two
      // apps never import each other. The web app cannot import the server
      // frameworks, and the server side cannot import React.
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:inventory',
              onlyDependOnLibsWithTags: ['scope:inventory', 'scope:shared'],
              bannedExternalImports: ['react'],
            },
            {
              sourceTag: 'scope:api',
              onlyDependOnLibsWithTags: [
                'scope:api',
                'scope:shared',
                'scope:inventory',
              ],
              bannedExternalImports: ['react'],
            },
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
              bannedExternalImports: ['@nestjs/*', 'typeorm', 'axios'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: LIBRARY_TYPES,
            },
            {
              sourceTag: 'type:e2e',
              onlyDependOnLibsWithTags: LIBRARY_TYPES,
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: LIBRARY_TYPES,
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
          ],
        },
      ],

      // The imports: no cycle, no duplicate, and one extension rule. The
      // server side and the tools run on Node with `nodenext`, so a relative
      // import names its `.ts` extension. The web app has its own rule below.
      'import-x/no-cycle': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/extensions': ['error', 'ignorePackages'],
      // A default export is banned. The tool configuration files below are
      // the exception, because the tools load them by their default export.
      'import-x/no-default-export': 'error',

      // The order of imports, object keys, and union members is fixed, so an
      // agent has no choice to make.
      'perfectionist/sort-imports': ['error', { type: 'natural' }],
      'perfectionist/sort-named-imports': ['error', { type: 'natural' }],
      'perfectionist/sort-named-exports': ['error', { type: 'natural' }],
      'perfectionist/sort-objects': ['error', { type: 'natural' }],
      'perfectionist/sort-union-types': ['error', { type: 'natural' }],

      // ADR 0014 makes `null` the value of an unset field.
      'unicorn/no-null': 'off',
      // `props` is the React name. `e2e` is the NX name. unicorn 79 renamed
      // `prevent-abbreviations` to `name-replacements`.
      'unicorn/name-replacements': [
        'error',
        { allowList: { e2e: true, props: true } },
      ],
      // `className` is the React name of the HTML `class` attribute.
      'unicorn/no-keyword-prefix': ['error', { disallowedPrefixes: ['new'] }],

      // The rules of the specs and the ADRs.
      'no-restricted-syntax': ['error', ...RESTRICTED_SYNTAX],
      'no-restricted-properties': [
        'error',
        ...MOCK_PROPERTIES,
        ENVIRONMENT_PROPERTY,
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'Call the Grocy client or the lookup provider. Only they import axios.',
            },
          ],
        },
      ],
      'no-console': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-check': false,
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      // A NestJS module or a migration is a class with a decorator and no
      // member. The framework reads the decorator.
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],

      // The size limits.
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines': ['error', 300],
      'max-lines-per-function': ['error', 60],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['error', 4],

      // The names.
      '@typescript-eslint/naming-convention': namingConvention(['camelCase']),
    },
  },

  // The web app: React through eslint-react and the React Compiler hooks
  // rules, the a11y rules, and the Tailwind class checker.
  {
    ...eslintReact.configs['strict-type-checked'],
    files: WEB_FILES,
    rules: asErrors(eslintReact.configs['strict-type-checked'].rules),
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: WEB_FILES,
    rules: asErrors(reactHooks.configs.flat.recommended.rules),
  },
  {
    ...jsxA11y.flatConfigs.strict,
    files: WEB_JSX_FILES,
    rules: asErrors(jsxA11y.flatConfigs.strict.rules),
  },
  {
    files: WEB_FILES,
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': {
        entryPoint: path.join(ROOT, 'apps/web/src/styles.css'),
      },
    },
    rules: {
      ...betterTailwindcss.configs['recommended-error'].rules,
      // The web app builds with the bundler resolution, and the shadcn/ui
      // generator writes its imports with no extension.
      'import-x/extensions': [
        'error',
        'never',
        { ignorePackages: true, pattern: { css: 'always', json: 'always' } },
      ],
    },
  },

  // The tests. Playwright runs the end-to-end tests, so the Vitest rules
  // skip them. A test file gets the recommended Vitest set, not every rule:
  // a test reads better with hooks, with no assertion count, and with the
  // global `describe` and `it`. The mock and call-count bans above stay.
  {
    files: TEST_FILES,
    ignores: E2E_FILES,
    plugins: { vitest },
    settings: { vitest: { typecheck: true } },
    rules: {
      ...asErrors(vitest.configs.recommended.rules),
      // A test nests `describe`, `it`, and one callback of the code under
      // test.
      'max-nested-callbacks': ['error', 5],
      'max-lines': ['error', 600],
      'max-lines-per-function': 'off',
      // A test reads a JSON response and a matcher result as `any`, and
      // casts a value to the shape that it asserts.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      'no-restricted-syntax': [
        'error',
        ...RESTRICTED_SYNTAX.filter(
          ({ selector }) => !CAST_SELECTORS.has(selector),
        ),
      ],
      // A test sets its own environment and names a fake address and a
      // fake secret. The mock ban stays.
      'no-restricted-properties': ['error', ...MOCK_PROPERTIES],
      'sonarjs/no-clear-text-protocols': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-hardcoded-secrets': 'off',
      // The order of imports and keys, the wrap of a comment, and the
      // length of a name do not matter in a test.
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-named-imports': 'off',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-union-types': 'off',
      'unicorn/name-replacements': 'off',
      'unicorn/no-manually-wrapped-comments': 'off',
    },
  },
  {
    files: WEB_TEST_FILES,
    ...testingLibrary.configs['flat/react'],
    rules: asErrors(testingLibrary.configs['flat/react'].rules),
  },
  {
    files: E2E_FILES,
    ...playwright.configs['flat/recommended'],
    rules: asErrors(playwright.configs['flat/recommended'].rules),
  },

  // The exceptions that a file path grants.
  {
    // A project configuration is one re-export of the root configuration,
    // and the entry file of a library is the list of its exports.
    files: [...PROJECT_CONFIG_FILES, ...LIBRARY_ENTRY_FILES],
    rules: { 'unicorn/no-barrel-files': 'off' },
  },
  {
    files: TOOL_CONFIG_FILES,
    rules: { 'import-x/no-default-export': 'off' },
  },
  {
    files: OPTION_READER_FILES,
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: AXIOS_CALLER_FILES,
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: SNAKE_CASE_SHAPE_FILES,
    rules: {
      '@typescript-eslint/naming-convention': namingConvention([
        'camelCase',
        'snake_case',
      ]),
    },
  },

  // Each library `package.json` lists what it imports. An app lists its
  // run-time packages too, such as a database driver, so the rule skips it.
  {
    files: ['libs/**/package.json'],
    languageOptions: { parser: jsoncParser },
    plugins: { '@nx': nx },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.mjs',
            '{projectRoot}/vite.config.mts',
            '{projectRoot}/vitest.config.mts',
            '{projectRoot}/rspack.config.ts',
            '{projectRoot}/playwright.config.mts',
          ],
        },
      ],
    },
  },

  // Prettier formats. The formatting rules of the presets are off.
  prettier,
];

export default atRoot(config);
