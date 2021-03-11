const { join } = require('path')
const { logTitle, logItem } = require('../../helpers/logger')
const asyncForEach = require('../../helpers/asyncForEach')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const isRouteWithFallback = require('../../helpers/isRouteWithFallback')
const setupStaticFileForPage = require('../../helpers/setupStaticFileForPage')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const getPages = require('./pages')

// Copy pre-rendered SSG pages
const setup = async ({ functionsPath, publishPath }) => {
  logTitle('🔥 Copying pre-rendered pages with getStaticProps and JSON data to', publishPath)

  // Keep track of the functions that have been set up, so that we do not set up
  // a function for the same file path twice
  const filePathsDone = []

  const pages = await getPages()

  await asyncForEach(pages, async ({ route, dataRoute, srcRoute }) => {
    logItem(route)

    // Copy pre-rendered HTML page
    const htmlPath = getFilePathForRoute(route, 'html')
    await setupStaticFileForPage({ inputPath: htmlPath, publishPath })

    // Copy page's JSON data
    const jsonPath = getFilePathForRoute(route, 'json')
    await setupStaticFileForPage({
      inputPath: jsonPath,
      outputPath: dataRoute,
      publishPath,
    })

    // Set up the Netlify function (this is ONLY for preview mode)
    const relativePath = getFilePathForRoute(srcRoute || route, 'js')
    const filePath = join('pages', relativePath)

    // Skip if we have already set up a function for this file
    // or if the source route has a fallback (handled by getStaticPropsWithFallback)
    if (filePathsDone.includes(filePath) || (await isRouteWithFallback(srcRoute))) return

    logItem(filePath)
    await setupNetlifyFunctionForPage({ filePath, functionsPath })
    filePathsDone.push(filePath)
  })
}

module.exports = setup
