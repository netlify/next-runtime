const asyncForEach = require('../../helpers/asyncForEach')
const getPagesManifest = require('../../helpers/getPagesManifest')
const isHtmlFile = require('../../helpers/isHtmlFile')
const isRouteInPrerenderManifest = require('../../helpers/isRouteInPrerenderManifest')

// Collect pages
const getPages = async () => {
  const pages = []

  // Get HTML and SSR pages and API endpoints from the NextJS pages manifest
  const pagesManifest = await getPagesManifest()

  // Parse HTML pages
  await asyncForEach(Object.entries(pagesManifest), async ([route, filePath]) => {
    // Ignore non-HTML files
    if (!isHtmlFile(filePath)) return

    // Skip page if it is actually used with getStaticProps
    if (await isRouteInPrerenderManifest(route)) return

    // Add the HTML page
    pages.push({ route, filePath })
  })
  return pages
}

module.exports = getPages
