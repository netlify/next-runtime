const { overrides } = require('@netlify/eslint-config-node')

module.exports = {
  extends: '@netlify/eslint-config-node',
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'no-param-reassign': ['error', { props: false }],
    'no-underscore-dangle': 'off',
    'n/no-sync': 'off',
    'n/prefer-global/process': 'off',
    'no-magic-numbers': 'off',
    'unicorn/numeric-separators-style': 'off',
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'import/no-namespace': 'off',
    'import/extensions': 'off',
  },
  overrides: [
    ...overrides,
    {
      files: ['src/templates/**'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        'unicorn/no-abusive-eslint-disable': 'off',
        'eslint-comments/no-unlimited-disable': 'off',
        'import/no-unresolved': 'off',
        'import/no-unassigned-import': 'off',
        'import/no-anonymous-default-export': 'off',
        'n/no-missing-require': 'off',
        'n/no-missing-import': 'off',
      },
    },
  ],
}
