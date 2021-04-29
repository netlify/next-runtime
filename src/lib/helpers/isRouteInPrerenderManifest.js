const getI18n = require('./getI18n')
const getPrerenderManifest = require('./getPrerenderManifest')

// Return true if the route is defined in the prerender manifest
const isRouteInPrerenderManifest = async (route) => {
  const i18n = await getI18n()
  const { defaultLocale } = i18n
  const { routes, dynamicRoutes } = await getPrerenderManifest()

  const isRouteInManifestWithI18n = () => {
    let isStaticRoute = false
    Object.entries(routes).forEach(([staticRoute, { srcRoute }]) => {
      // This is because in i18n we set the nakedRoute to be the srcRoute in the manifest
      if (route === srcRoute) isStaticRoute = true
    })
    return isStaticRoute || route in dynamicRoutes
  }

  if (defaultLocale) return isRouteInManifestWithI18n(route)
  return route in routes || route in dynamicRoutes
}

module.exports = isRouteInPrerenderManifest
