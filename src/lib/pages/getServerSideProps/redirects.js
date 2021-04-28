const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const asyncForEach = require('../../helpers/asyncForEach')
const getDataRouteForRoute = require('../../helpers/getDataRouteForRoute')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')

const getPages = require('./pages')

// getServerSideProps pages
//
// Page params {
//     route -> '/ssr', '/ssr/[id]'
//     filePath -> 'pages/ssr.js', 'pages/ssr/[id].js'
// }
//

const getRedirects = async () => {
  const redirects = []
  const pages = await getPages()

  await asyncForEach(pages, async ({ route, filePath }) => {
    const functionName = getNetlifyFunctionName(filePath)
    const target = `/.netlify/functions/${functionName}`

    await addLocaleRedirects(redirects, route, target)

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
      route: await getDataRouteForRoute(route),
      target,
    })
  })
  return redirects
}

module.exports = getRedirects
