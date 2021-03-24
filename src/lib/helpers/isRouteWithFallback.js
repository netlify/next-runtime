const getPrerenderManifest = require('./getPrerenderManifest')

const isRouteWithFallback = async ({ route, publishPath }) => {
  const { dynamicRoutes } = await getPrerenderManifest({ publishPath })

  // Fallback "blocking" routes will have fallback: null in manifest
  return dynamicRoutes[route] && dynamicRoutes[route].fallback !== false
}

module.exports = isRouteWithFallback
