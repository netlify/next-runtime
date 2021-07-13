const { join } = require('path')

const slash = require('slash')

const addDefaultLocaleRedirect = require('../../helpers/addDefaultLocaleRedirect')
const asyncForEach = require('../../helpers/asyncForEach')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')

const getPages = require('./pages')

// getStaticProps with revalidate pages
//
// Page params: {
//     route -> '/getStaticProps', '/getStaticProps/3'
//     dataRoute -> '/_next/data/{BUILD_ID}/getStaticProps.json', '_next/data/{BUILD_ID}/getStaticProps/3.json'
//     srcRoute -> null, /getStaticProps/[id]
// }
//
// Page params in i18n {
//     route -> '/getStaticProps', '/en/getStaticProps/3'
//     dataRoute -> '/_next/data/{BUILD_ID}/getStaticProps.json', '_next/data/{BUILD_ID}/en/getStaticProps/3.json'
//     srcRoute -> null, /getStaticProps/[id]
// }
//

const getRedirects = async () => {
  const redirects = []
  const pages = await getPages()

  await asyncForEach(pages, async ({ route, srcRoute, dataRoute }) => {
    const relativePath = getFilePathForRoute(srcRoute || route, 'js')
    const filePath = slash(join('pages', relativePath))
    const functionName = getNetlifyFunctionName(filePath)
    const target = `/.netlify/functions/${functionName}`

    // Add one redirect for the page
    redirects.push({
      route,
      target,
    })

    // Add one redirect for the data route
    redirects.push({
      route: dataRoute,
      target,
    })

    await addDefaultLocaleRedirect(redirects, route, target)
  })

  return redirects
}

module.exports = getRedirects
