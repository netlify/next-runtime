const addDefaultLocaleRedirect = require('../../helpers/addDefaultLocaleRedirect')
const isDynamicRoute = require('../../helpers/isDynamicRoute')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

/** withoutProps pages
 *
 * Page params {
 *    route -> '/about', '/initial/[id]'
 *    filePath -> 'pages/about.html', 'pages/initial[id].html'
 * }
 *
 * Page params in i18n {
 *    route -> '/en/about', '/fr/initial/[id]'
 *    filePath -> 'pages/en/about.html', 'pages/fr/initial[id].html'
 * }
 **/

const getRedirects = async () => {
  const redirects = []
  const pages = await getPages()

  await asyncForEach(pages, async ({ route, filePath }) => {
    const target = filePath.replace(/pages/, '')

    await addDefaultLocaleRedirect(redirects, route, target)

    // Only create normal redirects for pages with dynamic routing
    if (!isDynamicRoute(route)) return

    redirects.push({
      route,
      target: filePath.replace(/pages/, ''),
    })
  })
  return redirects
}

module.exports = getRedirects
