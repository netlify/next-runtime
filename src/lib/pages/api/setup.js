const { logTitle } = require('../../helpers/logger')

const getPages = require('./pages')

// Create a Netlify Function for every API endpoint
const setup = async (functionsPath) => {
  logTitle('💫 Setting up API endpoints as Netlify Functions in', functionsPath)

  const pages = await getPages()

  // Create Netlify Function job for every page
  return pages.map(({ filePath }) => ({ type: 'function', filePath, functionsPath, isApiPage: true }))
}

module.exports = setup
