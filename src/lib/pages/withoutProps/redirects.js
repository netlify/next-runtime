const addDefaultLocaleRedirect = require('../../helpers/addDefaultLocaleRedirect')
const isDynamicRoute = require('../../helpers/isDynamicRoute')
const pages = require('./pages')

let redirects = []

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

pages.forEach(({ route, filePath }) => {
  const target = filePath.replace(/pages/, '')

  addDefaultLocaleRedirect(redirects)(route, target)

  // Only create normal redirects for pages with dynamic routing
  if (!isDynamicRoute(route)) return

  redirects.push({
    route,
    target: filePath.replace(/pages/, ''),
  })
})

module.exports = redirects
