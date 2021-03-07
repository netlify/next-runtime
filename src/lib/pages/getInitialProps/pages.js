const getPagesManifest = require('../../helpers/getPagesManifest')
const isHtmlFile = require('../../helpers/isHtmlFile')
const isFrameworkRoute = require('../../helpers/isFrameworkRoute')
const isApiRoute = require('../../helpers/isApiRoute')
const isRouteInPrerenderManifest = require('../../helpers/isRouteInPrerenderManifest')
const isRouteWithDataRoute = require('../../helpers/isRouteWithDataRoute')
const asyncForEach = require('../../helpers/asyncForEach')

const getPages = async () => {
  // Get HTML and SSR pages and API endpoints from the NextJS pages manifest
  const pagesManifest = await getPagesManifest()

  // Collect pages
  const pages = []

  // Parse pages
  await asyncForEach(Object.entries(pagesManifest), async ([route, filePath]) => {
    // Ignore HTML files
    if (isHtmlFile(filePath)) return

    // Skip framework pages, such as _app and _error
    if (isFrameworkRoute(route)) return

    // Skip API endpoints
    if (isApiRoute(route)) return

    // Skip page if it is actually used with getStaticProps
    if (await isRouteInPrerenderManifest(route)) return

    // Skip page if it has a data route (because then it is a page with
    // getServerSideProps)
    if (await isRouteWithDataRoute(route)) return

    // Add page
    pages.push({ route, filePath })
  })
  return pages
}

module.exports = getPages
