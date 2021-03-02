const { join } = require('path')
const { logTitle, logItem } = require('../../helpers/logger')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const setupNetlifyFunctionForPage = require('../../helpers/setupNetlifyFunctionForPage')
const pages = require('./pages')

// Create a Netlify Function for every page with getStaticProps and fallback
const setup = (functionsPath) => {
  logTitle('💫 Setting up pages with getStaticProps and fallback: true', 'as Netlify Functions in', functionsPath)

  // Create Netlify Function for every page
  pages.forEach(({ route }) => {
    const relativePath = getFilePathForRoute(route, 'js')
    const filePath = join('pages', relativePath)
    logItem(filePath)
    setupNetlifyFunctionForPage({ filePath, functionsPath })
  })
}

module.exports = setup
