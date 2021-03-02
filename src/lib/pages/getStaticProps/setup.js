const { join } = require('path')
const { logTitle, logItem } = require('../../helpers/logger')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getDataRouteForRoute = require('../../helpers/getDataRouteForRoute')
const i18n = require('../../helpers/getI18n')()
const isRouteWithFallback = require('../../helpers/isRouteWithFallback')
const setupStaticFileForPage = require('../../helpers/setupStaticFileForPage')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const pages = require('./pages')

// Copy pre-rendered SSG pages
const setup = ({ functionsPath, publishPath }) => {
  logTitle('🔥 Copying pre-rendered pages with getStaticProps and JSON data to', publishPath)

  // Keep track of the functions that have been set up, so that we do not set up
  // a function for the same file path twice
  const filePathsDone = []

  pages.forEach(({ route, dataRoute, srcRoute }) => {
    logItem(route)

    // Copy pre-rendered HTML page
    const htmlPath = getFilePathForRoute(route, 'html')
    setupStaticFileForPage({ inputPath: htmlPath, publishPath })

    // Copy page's JSON data
    const jsonPath = getFilePathForRoute(route, 'json')
    setupStaticFileForPage({
      inputPath: jsonPath,
      outputPath: dataRoute,
      publishPath,
    })

    // Set up the Netlify function (this is ONLY for preview mode)
    const relativePath = getFilePathForRoute(srcRoute || route, 'js')
    const filePath = join('pages', relativePath)

    // Skip if we have already set up a function for this file
    // or if the source route has a fallback (handled by getStaticPropsWithFallback)
    if (filePathsDone.includes(filePath) || isRouteWithFallback(srcRoute)) return

    logItem(filePath)
    setupNetlifyFunctionForPage({ filePath, functionsPath })
    filePathsDone.push(filePath)
  })
}

module.exports = setup
