const asyncForEach = require('../../helpers/asyncForEach')
const getPagesManifest = require('../../helpers/getPagesManifest')
const isApiRoute = require('../../helpers/isApiRoute')
const isFrameworkRoute = require('../../helpers/isFrameworkRoute')
const isHtmlFile = require('../../helpers/isHtmlFile')
const isRouteInPrerenderManifest = require('../../helpers/isRouteInPrerenderManifest')
const isRouteWithDataRoute = require('../../helpers/isRouteWithDataRoute')

const getPages = async () => {
  // Collect pages
  const pages = []

  // Get HTML and SSR pages and API endpoints from the NextJS pages manifest
  const pagesManifest = await getPagesManifest()

  // Parse pages
  await asyncForEach(Object.entries(pagesManifest), async ([route, filePath]) => {
    // Ignore HTML files
    if (isHtmlFile(filePath)) return

    // Skip framework pages, such as _app and _error
    if (isFrameworkRoute(route)) return

    // Skip API endpoints
    if (isApiRoute(route)) return

    // Skip page if it is actually used with getStaticProps
    const isInPrerenderManifest = await isRouteInPrerenderManifest(route)
    if (isInPrerenderManifest) return

    // Skip page if it has no data route (because then it is a page with
    // getInitialProps)
    const hasDataRoute = await isRouteWithDataRoute(route)
    if (!hasDataRoute) return

    // Add page
    pages.push({ route, filePath })
  })

  return pages
}

module.exports = getPages
