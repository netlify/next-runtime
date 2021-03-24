const getPrerenderManifest = require('../../helpers/getPrerenderManifest')

// Get pages using getStaticProps
const getPages = async ({ publishPath }) => {
  const { dynamicRoutes } = await getPrerenderManifest({ publishPath })

  // Collect pages
  const pages = []

  Object.entries(dynamicRoutes).forEach(([route, { dataRoute, fallback }]) => {
    // Skip pages without fallback
    if (fallback === false) return

    // Add the page
    pages.push({
      route,
      dataRoute,
    })
  })

  return pages
}

module.exports = getPages
