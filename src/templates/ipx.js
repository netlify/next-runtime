const { createIPXHandler } = require('@netlify/ipx')

// Injected at build time
// eslint-disable-next-line import/no-unresolved, node/no-missing-require
const { basePath, domains } = require('./imageconfig.json')

const ipxHandler = createIPXHandler({
  basePath,
  domains,
})

// This is until we update @netlify/ipx to use rawUrl
exports.handler = (event, ...rest) => {
  const [_host, rawPath] = event.rawUrl.split(basePath)
  event.path = `${basePath}${rawPath}`
  console.log({ basePath, rawPath, event })
  return ipxHandler(event, ...rest)
}
