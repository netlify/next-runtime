const { join } = require('path')

const slash = require('slash')

const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const { logTitle } = require('../../helpers/logger')

const getPages = require('./pages')

// Create a Netlify Function for every page with getStaticProps and fallback
const setup = async (functionsPath) => {
  logTitle('💫 Setting up pages with getStaticProps and fallback: true', 'as Netlify Functions in', functionsPath)

  const pages = await getPages()

  // Create Netlify Function for every page
  return pages.reduce((jobs, { route }) => {
    const relativePath = getFilePathForRoute(route, 'js')
    const filePath = slash(join('pages', relativePath))
    // Need two different functions - one ODB for normal pages, one standard for preview mode
    return [
      ...jobs,
      { type: 'function', filePath, functionsPath, isODB: true },
      { type: 'function', filePath, functionsPath, forFallbackPreviewMode: true },
    ]
  }, [])
}

module.exports = setup
