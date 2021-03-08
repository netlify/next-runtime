const getPrerenderManifest = require('../../helpers/getPrerenderManifest')

// Get pages using getStaticProps
const getPages = async () => {
  const { routes } = await getPrerenderManifest()

  // Collect pages
  const pages = []

  Object.entries(routes).forEach(([route, { dataRoute, initialRevalidateSeconds, srcRoute }]) => {
    // Ignore pages with revalidate, these will need to be SSRed
    if (initialRevalidateSeconds) return

    pages.push({
      route,
      dataRoute,
      srcRoute,
    })
  })
  return pages
}

module.exports = getPages
