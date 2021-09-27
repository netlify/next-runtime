const { createIPXHandler } = require('@netlify/ipx')

// Injected at build time
// eslint-disable-next-line import/no-unresolved, node/no-missing-require
const config = require('./imageconfig.json')

exports.handler = createIPXHandler({
  domains: config.domains || [],
})
