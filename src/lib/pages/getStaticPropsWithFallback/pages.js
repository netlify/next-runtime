const getPrerenderManifest = require('../../helpers/getPrerenderManifest')

// Collect pages
const pages = []

// Get pages using getStaticProps
const { dynamicRoutes } = getPrerenderManifest()

// Parse pages
Object.entries(dynamicRoutes).forEach(([route, { dataRoute, fallback }]) => {
  // Skip pages without fallback
  if (fallback === false) return

  // Add the page
  pages.push({
    route,
    dataRoute,
  })
})

module.exports = pages
