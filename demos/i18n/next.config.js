const withTM = require('@vercel/examples-ui/transpile')()

module.exports = withTM({
  eslint: {
    dirs: [], // Only run ESLint on the 'pages' and 'utils' directories during production builds (next build)
  },
})
