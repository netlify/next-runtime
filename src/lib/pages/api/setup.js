const { logTitle, logItem } = require('../../helpers/logger')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

// Create a Netlify Function for every API endpoint
const setup = async ({ functionsPath, publishPath }) => {
  logTitle('💫 Setting up API endpoints as Netlify Functions in', functionsPath)

  const pages = await getPages({ publishPath })

  // Create Netlify Function for every page
  await asyncForEach(pages, async ({ filePath }) => {
    logItem(filePath)
    await setupNetlifyFunctionForPage({ filePath, functionsPath, isApiPage: true, publishPath })
  })
}

module.exports = setup
