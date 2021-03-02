const getPagesManifest = require('../../helpers/getPagesManifest')
const isHtmlFile = require('../../helpers/isHtmlFile')
const isFrameworkRoute = require('../../helpers/isFrameworkRoute')
const isApiRoute = require('../../helpers/isApiRoute')
const isRouteInPrerenderManifest = require('../../helpers/isRouteInPrerenderManifest')
const isRouteWithDataRoute = require('../../helpers/isRouteWithDataRoute')

// Collect pages
const pages = []

// Get HTML and SSR pages and API endpoints from the NextJS pages manifest
const pagesManifest = getPagesManifest()

// Parse pages
Object.entries(pagesManifest).forEach(([route, filePath]) => {
  // Ignore HTML files
  if (isHtmlFile(filePath)) return

  // Skip framework pages, such as _app and _error
  if (isFrameworkRoute(route)) return

  // Skip API endpoints
  if (isApiRoute(route)) return

  // Skip page if it is actually used with getStaticProps
  if (isRouteInPrerenderManifest(route)) return

  // Skip page if it has no data route (because then it is a page with
  // getInitialProps)
  if (!isRouteWithDataRoute(route)) return

  // Add page
  pages.push({ route, filePath })
})

module.exports = pages
