const getPagesManifest = require('../../helpers/getPagesManifest')
const isHtmlFile = require('../../helpers/isHtmlFile')
const isRouteInPrerenderManifest = require('../../helpers/isRouteInPrerenderManifest')

// Collect pages
const pages = []

// Get HTML and SSR pages and API endpoints from the NextJS pages manifest
const pagesManifest = getPagesManifest()

// Parse HTML pages
Object.entries(pagesManifest).forEach(([route, filePath]) => {
  // Ignore non-HTML files
  if (!isHtmlFile(filePath)) return

  // Skip page if it is actually used with getStaticProps
  if (isRouteInPrerenderManifest(route)) return

  // Add the HTML page
  pages.push({ route, filePath })
})

module.exports = pages
