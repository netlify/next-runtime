const { overrides } = require('@netlify/eslint-config-node')

module.exports = {
  extends: '@netlify/eslint-config-node',
  rules: {
    'max-depth': 0,
    complexity: 0,
    'fp/no-let': 0,
    'fp/no-loops': 0,
    'fp/no-mutation': 0,
    'fp/no-mutating-methods': 0,
    'id-length': 0,
    'max-statements': 0,
    'no-await-in-loop': 0,
    'n/exports-style': 0,
    'n/global-require': 0,
    'n/prefer-global/process': 0,
    // Allow a single word inline so that it can do language tags for syntax highlighting
    // ['error', { ignorePattern: /^ (\w+) $/ }],
    'no-inline-comments': 0,
    'no-magic-numbers': 0,
    'no-param-reassign': 0,
    'no-promise-executor-return': 0,
    'no-prototype-builtins': 0,
    'no-unused-vars': 0,
    'prefer-regex-literals': 0,
    'promise/prefer-await-to-callbacks': 0,
    'unicorn/consistent-function-scoping': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-array-push-push': 0,
    'unicorn/numeric-separators-style': 0,
  },
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    jest: true,
  },
  overrides: [
    ...overrides,
    {
      files: ['**/*.ts'],
      rules: {
        // This is disabled because TypeScript transpiles some features currently
        // unsupported by Node 12, i.e. optional chaining
        // TODO: re-enable after dropping support for Node 12
        'n/no-unsupported-features/es-syntax': 'off',
      },
    },
    {
      files: ['cypress/**/*.spec.ts'],
      rules: {
        'max-nested-callbacks': 0,
        'promise/prefer-await-to-then': 0,
        'promise/always-return': 0,
        'promise/catch-or-return': 0,
      },
    },
  ],
}
