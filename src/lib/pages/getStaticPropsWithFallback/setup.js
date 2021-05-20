const { join } = require('path')

const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const { logTitle } = require('../../helpers/logger')

const getPages = require('./pages')

// Create a Netlify Function for every page with getStaticProps and fallback
const setup = async (functionsPath) => {
  logTitle('💫 Setting up pages with getStaticProps and fallback: true', 'as Netlify Functions in', functionsPath)

  const pages = await getPages()

  // Create Netlify Function for every page
  return pages.map(({ route }) => {
    const relativePath = getFilePathForRoute(route, 'js')
    const filePath = join('pages', relativePath)
    return { type: 'function', filePath, functionsPath, isISR: true }
  })
}

module.exports = setup
