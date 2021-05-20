const { logTitle } = require('../../helpers/logger')

const getPages = require('./pages')

// Create a Netlify Function for every page with getServerSideProps
const setup = async (functionsPath) => {
  logTitle('💫 Setting up pages with getServerSideProps as Netlify Functions in', functionsPath)

  const pages = await getPages()

  // Create Netlify Function for every page
  return pages.map(({ filePath }) => ({ type: 'function', filePath, functionsPath }))
}

module.exports = setup
