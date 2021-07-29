const { yellowBright } = require('chalk')

const asyncForEach = require('../../helpers/asyncForEach')
const getPrerenderManifest = require('../../helpers/getPrerenderManifest')
const isRouteWithFallback = require('../../helpers/isRouteWithFallback')

// Get pages using getStaticProps
const getPages = async () => {
  const { routes } = await getPrerenderManifest()

  // Collect pages
  const pages = []

  let usesRevalidateAtLeastOnce = false

  await asyncForEach(Object.entries(routes), async ([route, { dataRoute, srcRoute, initialRevalidateSeconds }]) => {
    // Skip pages without revalidate, these are handled by getStaticProps/pages
    if (!initialRevalidateSeconds) return

    usesRevalidateAtLeastOnce = true

    // Skip pages with fallback, these are handled by
    // getStaticPropsWithFallback/pages
    if (await isRouteWithFallback(srcRoute)) return

    // Add the page
    pages.push({
      route,
      srcRoute,
      dataRoute,
    })
  })

  if (usesRevalidateAtLeastOnce) {
    console.log(
      yellowBright(
        `Warning: It looks like you're using the 'revalidate' flag in one of your Next.js pages.  Please read our docs about ISR on Netlify: https://ntl.fyi/next-isr-info`,
      ),
    )
  }

  return pages
}

module.exports = getPages
