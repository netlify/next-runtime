const { join } = require('path')

const { copySync } = require('fs-extra')
const slash = require('slash')

const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getI18n = require('../../helpers/getI18n')
const getNextDistDir = require('../../helpers/getNextDistDir')
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
  const nextDistDir = await getNextDistDir()
  const i18n = await getI18n()

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

      // HACK: If i18n, 404.html needs to be at the top level of the publish directory
      if (i18n.defaultLocale && route === `/${i18n.defaultLocale}/404`) {
        copySync(join(nextDistDir, 'serverless', 'pages', htmlPath), join(publishPath, '404.html'))
      }

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
