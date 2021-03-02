const getPrerenderManifest = require('./getPrerenderManifest')
const i18n = require('./getI18n')()

const { routes, dynamicRoutes } = getPrerenderManifest()
const { defaultLocale, locales } = i18n

const isRouteInManifestWithI18n = (route) => {
  let isStaticRoute = false
  Object.entries(routes).forEach(([staticRoute, { srcRoute }]) => {
    // This is because in i18n we set the nakedRoute to be the srcRoute in the manifest
    if (route === srcRoute) isStaticRoute = true
  })
  return isStaticRoute || route in dynamicRoutes
}

// Return true if the route is defined in the prerender manifest
const isRouteInPrerenderManifest = (route) => {
  if (i18n.defaultLocale) return isRouteInManifestWithI18n(route)
  return route in routes || route in dynamicRoutes
}

module.exports = isRouteInPrerenderManifest
