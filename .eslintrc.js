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
    'max-lines': 0,
    'no-console': 2,
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
        '@typescript-eslint/no-extra-semi': 'off',
        'n/no-missing-import': 'off',
        // https://github.com/typescript-eslint/typescript-eslint/issues/2483
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',
        'import/max-dependencies': 'off',
      },
    },
    {
      files: ['cypress/**/*.cy.ts'],
      rules: {
        'max-nested-callbacks': 0,
        'promise/prefer-await-to-then': 0,
        'promise/always-return': 0,
        'promise/catch-or-return': 0,
      },
    },
    {
      files: ['test/**', 'packages/**/test/**'],
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      rules: {
        // Disable global rules
        'max-nested-callbacks': 'off',
        '@typescript-eslint/no-empty-function': 0,
        'max-lines-per-function': 0,
        'unicorn/no-empty-file': 0,
        'prefer-destructuring': 0,
        '@typescript-eslint/no-unused-vars': 0,
        'unicorn/no-await-expression-member': 0,
        'import/no-anonymous-default-export': 0,
        'no-shadow': 0,
        '@typescript-eslint/no-shadow': 0,
        '@typescript-eslint/no-var-requires': 0,
        'require-await': 0,
        'n/no-sync': 0,
        'promise/prefer-await-to-then': 0,
        'no-async-promise-executor': 0,
        'import/no-dynamic-require': 0,
        // esling-plugin-jest specific rules
        'jest/consistent-test-it': ['error', { fn: 'it', withinDescribe: 'it' }],
        'jest/no-disabled-tests': 0,
        'jest/no-conditional-expect': 0,
        'jest/no-standalone-expect': [2, { additionalTestBlockFunctions: ['beforeAll'] }],
      },
    },
  ],
}
