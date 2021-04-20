const { join } = require('path')
const { readJSONSync } = require('fs-extra')
const getNextConfig = require('../../../helpers/getNextConfig')
const getNextDistDir = require('./getNextDistDir')
const getDataRouteForRoute = require('./getDataRouteForRoute')
const asyncForEach = require('./asyncForEach')

const transformManifestForI18n = async (manifest) => {
  const { routes } = manifest
  const newRoutes = {}
  await asyncForEach(Object.entries(routes), async ([route, { dataRoute, srcRoute, ...params }]) => {
    const isDynamicRoute = !!srcRoute
    if (isDynamicRoute) {
      newRoutes[route] = routes[route]
    } else {
      const locale = route.split('/')[1]
      const routeWithoutLocale = `/${route.split('/').slice(2, route.split('/').length).join('/')}`
      newRoutes[route] = {
        dataRoute: await getDataRouteForRoute(routeWithoutLocale, locale),
        srcRoute: routeWithoutLocale,
        ...params,
      }
    }
  })

  return { ...manifest, routes: newRoutes }
}

const getPrerenderManifest = async () => {
  const nextConfig = await getNextConfig()
  const nextDistDir = await getNextDistDir()
  const manifest = readJSONSync(join(nextDistDir, 'prerender-manifest.json'))
  if (nextConfig.i18n) return await transformManifestForI18n(manifest)
  return manifest
}

module.exports = getPrerenderManifest
