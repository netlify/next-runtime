const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const getDataRouteForRoute = require('../../helpers/getDataRouteForRoute')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

/** getServerSideProps pages
 *
 * Page params {
 *    route -> '/ssr', '/ssr/[id]'
 *    filePath -> 'pages/ssr.js', 'pages/ssr/[id].js'
 * }
 **/

const getRedirects = async ({ publishPath }) => {
  const redirects = []
  const pages = await getPages({ publishPath })

  await asyncForEach(pages, async ({ route, filePath }) => {
    const functionName = getNetlifyFunctionName(filePath)
    const target = `/.netlify/functions/${functionName}`

    await addLocaleRedirects({ redirects, route, target, publishPath })

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
      route: await getDataRouteForRoute({ route, publishPath }),
      target,
    })
  })
  return redirects
}

module.exports = getRedirects
