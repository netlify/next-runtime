const getPagesManifest = require('../../helpers/getPagesManifest')
const isApiRoute = require('../../helpers/isApiRoute')

const getPages = async () => {
  // Get HTML and SSR pages and API endpoints from the NextJS pages manifest
  const pagesManifest = await getPagesManifest()

  // Collect pages
  const pages = []

  // Parse pages
  Object.entries(pagesManifest).forEach(([route, filePath]) => {
    // Skip non-API endpoints
    if (!isApiRoute(route)) return

    // Add page
    pages.push({ route, filePath })
  })
  return pages
}

module.exports = getPages
