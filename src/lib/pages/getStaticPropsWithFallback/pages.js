const getPrerenderManifest = require('../../helpers/getPrerenderManifest')

// Get pages using getStaticProps
const getPages = async () => {
  const { dynamicRoutes } = await getPrerenderManifest()

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
