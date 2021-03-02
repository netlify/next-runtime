const { logTitle, logItem } = require('../../helpers/logger')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const pages = require('./pages')

// Create a Netlify Function for every page with getInitialProps
const setup = (functionsPath) => {
  logTitle('💫 Setting up pages with getInitialProps as Netlify Functions in', functionsPath)

  // Create Netlify Function for every page
  pages.forEach(({ filePath }) => {
    logItem(filePath)
    setupNetlifyFunctionForPage({ filePath, functionsPath })
  })
}

module.exports = setup
