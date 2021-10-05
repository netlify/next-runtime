const { overrides } = require('@netlify/eslint-config-node/react_config')

module.exports = {
  extends: '@netlify/eslint-config-node/react_config',
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
    'node/exports-style': 0,
    'node/global-require': 0,
    'node/prefer-global/process': 0,
    'no-magic-numbers': 0,
    'no-param-reassign': 0,
    'no-promise-executor-return': 0,
    'no-prototype-builtins': 0,
    'no-shadow': 0,
    'no-unused-vars': 0,
    'prefer-regex-literals': 0,
    'promise/prefer-await-to-callbacks': 0,
    'require-await': 0,
    'unicorn/consistent-function-scoping': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-array-push-push': 0,
  },
  parserOptions: {
    sourceType: "module"
  },
  env: {
    jest: true,
  },
  overrides: [...overrides],
}
