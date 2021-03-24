const { join } = require('path')
const { logTitle, logItem } = require('../../helpers/logger')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

// Create a Netlify Function for every page with getStaticProps and fallback
const setup = async ({ functionsPath, publishPath }) => {
  logTitle('💫 Setting up pages with getStaticProps and fallback: true', 'as Netlify Functions in', functionsPath)

  const pages = await getPages({ publishPath })

  // Create Netlify Function for every page
  await asyncForEach(pages, async ({ route }) => {
    const relativePath = getFilePathForRoute(route, 'js')
    const filePath = join('pages', relativePath)
    logItem(filePath)
    await setupNetlifyFunctionForPage({ filePath, functionsPath, publishPath })
  })
}

module.exports = setup
