const { join } = require('path')

const slash = require('slash')

const addDefaultLocaleRedirect = require('../../helpers/addDefaultLocaleRedirect')
const asyncForEach = require('../../helpers/asyncForEach')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const getPreviewModeFunctionName = require('../../helpers/getPreviewModeFunctionName')
const isRouteWithFallback = require('../../helpers/isRouteWithFallback')

const getPages = require('./pages')

// getStaticProps pages
//
// Page params {
//     route -> '/getStaticProps', '/getStaticProps/3'
//     dataRoute -> '/_next/data/{BUILD_ID}/getStaticProps.json', '_next/data/{BUILD_ID}/getStaticProps/3.json'
//     srcRoute -> null, /getStaticProps/[id]
// }
//
// Page params with i18n {
//     route -> '/getStaticProps', '/en/getStaticProps/3'
//     dataRoute -> '/_next/data/{BUILD_ID}/getStaticProps.json', '_next/data/{BUILD_ID}/en/getStaticProps/3.json'
//     srcRoute -> null, /getStaticProps/[id]
// }
//
//

// Pages with getStaticProps (without fallback or revalidation) only need
// redirects for i18n and handling preview mode
const getRedirects = async () => {
  const redirects = []
  const pages = await getPages()

  await asyncForEach(pages, async ({ route, dataRoute, srcRoute }) => {
    const relativePath = getFilePathForRoute(srcRoute || route, 'js')
    const filePath = slash(join('pages', relativePath))
    const functionName = getNetlifyFunctionName(filePath)
    const isODB = await isRouteWithFallback(srcRoute)

    // Preview mode conditions
    const conditions = ['Cookie=__prerender_bypass,__next_preview_data']
    // ODB pages' preview mode needs a special flagged standard function because
    // their default function (an ODB) is not functional for preview mode
    const target = `/.netlify/functions/${functionName}`
    const previewModeTarget = isODB ? `/.netlify/functions/${getPreviewModeFunctionName(functionName)}` : target
    const previewModeRedirect = { conditions, force: true, target: previewModeTarget }

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
    await addDefaultLocaleRedirect(redirects, route, target, { conditions, force: true })
    await addDefaultLocaleRedirect(redirects, route)
  })

  return redirects
}

module.exports = getRedirects
