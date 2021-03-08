const { join } = require('path')
const addDefaultLocaleRedirect = require('../../helpers/addDefaultLocaleRedirect')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

/** getStaticProps pages
 *
 * Page params {
 *    route -> '/getStaticProps', '/getStaticProps/3'
 *    dataRoute -> '/_next/data/{BUILD_ID}/getStaticProps.json', '_next/data/{BUILD_ID}/getStaticProps/3.json'
 *    srcRoute -> null, /getStaticProps/[id]
 * }
 *
 * Page params with i18n {
 *    route -> '/getStaticProps', '/en/getStaticProps/3'
 *    dataRoute -> '/_next/data/{BUILD_ID}/getStaticProps.json', '_next/data/{BUILD_ID}/en/getStaticProps/3.json'
 *    srcRoute -> null, /getStaticProps/[id]
 * }
 *
 **/

// Pages with getStaticProps (without fallback or revalidation) only need
// redirects for i18n and handling preview mode
const getRedirects = async () => {
  const redirects = []
  const pages = await getPages()

  await asyncForEach(pages, async ({ route, dataRoute, srcRoute }) => {
    const relativePath = getFilePathForRoute(srcRoute || route, 'js')
    const filePath = join('pages', relativePath)
    const functionName = getNetlifyFunctionName(filePath)

    // Preview mode conditions
    const conditions = ['Cookie=__prerender_bypass,__next_preview_data']
    const target = `/.netlify/functions/${functionName}`
    const previewModeRedirect = { conditions, force: true, target }

    // Add a preview mode redirect for the standard route
    redirects.push({
      route,
      ...previewModeRedirect,
    })

    // Add a preview mode redirect for the data route, same conditions
    redirects.push({
      route: dataRoute,
      ...previewModeRedirect,
    })

    // Preview mode default locale redirect must precede normal default locale redirect
    await addDefaultLocaleRedirect(redirects, route, target, previewModeRedirect)
    await addDefaultLocaleRedirect(redirects, route)
  })

  return redirects
}

module.exports = getRedirects
