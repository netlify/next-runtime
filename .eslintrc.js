const { overrides } = require('@netlify/eslint-config-node')

module.exports = {
  extends: '@netlify/eslint-config-node',
  rules: {
    complexity: 0,
    'fp/no-let': 0,
    'fp/no-loops': 0,
    'fp/no-mutation': 0,
    'fp/no-mutating-methods': 0,
    'id-length': 0,
    'max-statements': 0,
    'no-await-in-loop': 0,
    'node/exports-style': 0,
    'node/global-require': 0,
    'node/no-unpublished-require': 0,
    'node/prefer-global/process': 0,
    'no-magic-numbers': 0,
    'no-promise-executor-return': 0,
    'no-prototype-builtins': 0,
    'no-shadow': 0,
    'no-unused-vars': 0,
    'prefer-regex-literals': 0,
    'promise/prefer-await-to-callbacks': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-array-push-push': 0,
  },
  overrides: [...overrides],
}
