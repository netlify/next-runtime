const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const getDataRouteForRoute = require('../../helpers/getDataRouteForRoute')
const pages = require('./pages')

const redirects = []

/** getServerSideProps pages
 *
 * Page params {
 *    route -> '/ssr', '/ssr/[id]'
 *    filePath -> 'pages/ssr.js', 'pages/ssr/[id].js'
 * }
 **/

pages.forEach(({ route, filePath }) => {
  const functionName = getNetlifyFunctionName(filePath)
  const target = `/.netlify/functions/${functionName}`

  addLocaleRedirects(redirects)(route, target)

  // Add one redirect for the naked route
  // i.e. /ssr
  redirects.push({
    route,
    target,
  })

  // Add one redirect for the data route;
  // pages-manifest doesn't provide the dataRoute for us so we
  // construct it ourselves with getDataRouteForRoute
  redirects.push({
    route: getDataRouteForRoute(route),
    target,
  })
})

module.exports = redirects
