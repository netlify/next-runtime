const isRouteWithFallback = require('../../helpers/isRouteWithFallback')
const getPrerenderManifest = require('../../helpers/getPrerenderManifest')
const asyncForEach = require('../../helpers/asyncForEach')

// Get pages using getStaticProps
const getPages = async () => {
  const { routes } = await getPrerenderManifest()

  // Collect pages
  const pages = []

  await asyncForEach(Object.entries(routes), async ([route, { dataRoute, srcRoute, initialRevalidateSeconds }]) => {
    // Skip pages without revalidate, these are handled by getStaticProps/pages
    if (!initialRevalidateSeconds) return

    // Skip pages with fallback, these are handled by
    // getStaticPropsWithFallback/pages
    if (await isRouteWithFallback(srcRoute)) return

    // Add the page
    pages.push({
      route,
      srcRoute,
      dataRoute,
    })
  })
  return pages
}

module.exports = getPages
