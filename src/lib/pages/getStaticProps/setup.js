const { join } = require('path')

const slash = require('slash')

const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const isRouteWithFallback = require('../../helpers/isRouteWithFallback')
const { logTitle } = require('../../helpers/logger')

const getPages = require('./pages')

// Copy pre-rendered SSG pages
const setup = async ({ functionsPath, publishPath }) => {
  logTitle('🔥 Copying pre-rendered pages with getStaticProps and JSON data to', publishPath)
  // Keep track of the functions that have been set up, so that we do not set up
  // a function for the same file path twice
  const filePathsDone = new Set()
  const pages = await getPages()

  const jobs = []

  await Promise.all(
    pages.map(async ({ route, dataRoute, srcRoute }) => {
      // Copy pre-rendered HTML page
      const htmlPath = getFilePathForRoute(route, 'html')

      jobs.push({ type: 'static', inputPath: htmlPath, publishPath })

      // Copy page's JSON data
      const jsonPath = getFilePathForRoute(route, 'json')
      jobs.push({
        type: 'static',
        inputPath: jsonPath,
        outputPath: dataRoute,
        publishPath,
      })

      // Set up the Netlify function (this is ONLY for preview mode)
      const relativePath = getFilePathForRoute(srcRoute || route, 'js')
      const filePath = slash(join('pages', relativePath))

      // Skip if we have already set up a function for this file

      if (filePathsDone.has(filePath)) {
        return
      }
      filePathsDone.add(filePath)

      // or if the source route has a fallback (handled by getStaticPropsWithFallback)
      if (await isRouteWithFallback(srcRoute)) {
        return
      }
      jobs.push({ type: 'function', filePath, functionsPath })
    }),
  )
  return jobs
}

module.exports = setup
