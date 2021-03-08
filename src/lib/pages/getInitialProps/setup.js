const { logTitle, logItem } = require('../../helpers/logger')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

// Create a Netlify Function for every page with getInitialProps
const setup = async (functionsPath) => {
  logTitle('💫 Setting up pages with getInitialProps as Netlify Functions in', functionsPath)

  const pages = await getPages()

  // Create Netlify Function for every page
  await asyncForEach(pages, async ({ filePath }) => {
    logItem(filePath)
    await setupNetlifyFunctionForPage({ filePath, functionsPath })
  })
}

module.exports = setup
