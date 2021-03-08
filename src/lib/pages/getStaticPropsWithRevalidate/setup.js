const { join } = require('path')
const { logTitle, logItem } = require('../../helpers/logger')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

// Create a Netlify Function for every page with getStaticProps and revalidate
const setup = async (functionsPath) => {
  logTitle(
    '💫 Setting up pages with getStaticProps and revalidation interval',
    'as Netlify Functions in',
    functionsPath,
  )

  // Keep track of the functions that have been set up, so that we do not set up
  // a function for the same file path twice
  const filePathsDone = []

  const pages = await getPages()

  // Create Netlify Function for every page
  await asyncForEach(pages, async ({ route, srcRoute }) => {
    const relativePath = getFilePathForRoute(srcRoute || route, 'js')
    const filePath = join('pages', relativePath)

    // Skip if we have already set up a function for this file
    if (filePathsDone.includes(filePath)) return

    // Set up the function
    logItem(filePath)
    await setupNetlifyFunctionForPage({ filePath, functionsPath })
    filePathsDone.push(filePath)
  })
}

module.exports = setup
