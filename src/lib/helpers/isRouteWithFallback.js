const getPrerenderManifest = require('./getPrerenderManifest')

const isRouteWithFallback = async (route) => {
  if (!route) return false

  const { dynamicRoutes } = await getPrerenderManifest()

  // Fallback "blocking" routes will have fallback: null in manifest
  return dynamicRoutes[route] && dynamicRoutes[route].fallback !== false
}

module.exports = isRouteWithFallback
