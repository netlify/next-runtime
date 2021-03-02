const getPrerenderManifest = require('./getPrerenderManifest')

const { dynamicRoutes } = getPrerenderManifest()

const isRouteWithFallback = (route) => {
  // Fallback "blocking" routes will have fallback: null in manifest
  return dynamicRoutes[route] && dynamicRoutes[route].fallback !== false
}

module.exports = isRouteWithFallback
