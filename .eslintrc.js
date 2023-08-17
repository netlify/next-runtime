module.exports = {
  extends: '@netlify/eslint-config-node',
  rules: {
    'no-param-reassign': ['error', { props: false }],
    'no-underscore-dangle': 0,
    'n/no-sync': 0,
    'n/prefer-global/process': 0,
    'no-magic-numbers': 0,
    'unicorn/numeric-separators-style': 0,
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'import/no-namespace': 0,
  },
}
