const { overrides } = require('@netlify/eslint-config-node')

module.exports = {
  extends: '@netlify/eslint-config-node',
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'arrow-body-style': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-underscore-dangle': 'off',
    'no-magic-numbers': 'off',
    'n/prefer-global/process': 'off',
    'unicorn/numeric-separators-style': 'off',
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'import/no-namespace': 'off',
    'import/extensions': 'off',
    'max-depth': 'off',
    'func-style': 'off',
    'class-methods-use-this': 'off',
    'promise/prefer-await-to-then': 'off',
    'promise/prefer-await-to-callbacks': 'off',
    'promise/catch-or-return': 'off',
    'promise/always-return': 'off',
    'max-nested-callbacks': 'off',
    'no-inline-comments': 'off',
    'line-comment-position': 'off',
    'max-lines': 'off',
  },
  overrides: [
    ...overrides,
    {
      files: ['src/run/handlers/**'],
      rules: {
        'max-statements': ['error', 30],
        'import/no-anonymous-default-export': 'off',
      },
    },
    {
      files: ['src/**/*.test.*'],
      rules: {
        'max-statements': 'off',
        'max-lines-per-function': 'off',
      },
    },
    {
      files: ['src/build/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'path',
                importNames: ['resolve'],
                message:
                  'Please use `PluginContext.resolve` instead to comply with our monorepo support',
              },
              {
                name: 'node:path',
                importNames: ['resolve'],
                message:
                  'Please use `PluginContext.resolve` instead to comply with our monorepo support',
              },
            ],
          },
        ],
      },
    },
  ],
}
