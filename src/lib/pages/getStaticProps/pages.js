const asyncForEach = require('../../helpers/asyncForEach')
const getPrerenderManifest = require('../../helpers/getPrerenderManifest')
const isRouteWithFallback = require('../../helpers/isRouteWithFallback')

// Get pages using getStaticProps
const getPages = async () => {
  const { routes } = await getPrerenderManifest()

  // Collect pages
  const pages = []

  await asyncForEach(Object.entries(routes), async ([route, { dataRoute, initialRevalidateSeconds, srcRoute }]) => {
    // Ignore pages with revalidate (but no fallback), these will need to be SSRed
    const isFallbackRoute = await isRouteWithFallback(srcRoute)
    if (initialRevalidateSeconds && !isFallbackRoute) return

    pages.push({
      route,
      dataRoute,
      srcRoute,
    })
  })
  return pages
}

module.exports = getPages
