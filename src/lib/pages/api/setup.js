const { logTitle, logItem } = require('../../helpers/logger')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const pages = require('./pages')

// Create a Netlify Function for every API endpoint
const setup = (functionsPath) => {
  logTitle('💫 Setting up API endpoints as Netlify Functions in', functionsPath)

  // Create Netlify Function for every page
  pages.forEach(({ filePath }) => {
    logItem(filePath)
    setupNetlifyFunctionForPage({ filePath, functionsPath, isApiPage: true })
  })
}

module.exports = setup
