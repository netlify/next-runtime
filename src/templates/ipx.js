const { createIPXHandler } = require('@netlify/ipx')

// Injected at build time
// eslint-disable-next-line import/no-unresolved, node/no-missing-require
const { basePath, domains } = require('./imageconfig.json')

exports.handler = createIPXHandler({
  basePath,
  domains,
})
