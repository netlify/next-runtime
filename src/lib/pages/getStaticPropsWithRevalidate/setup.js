const { join } = require('path')

const slash = require('slash')

const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const { logTitle } = require('../../helpers/logger')

const getPages = require('./pages')

// Create a Netlify Function for every page with getStaticProps and revalidate
const setup = async (functionsPath) => {
  logTitle(
    '💫 Setting up pages with getStaticProps and revalidation interval',
    'as Netlify Functions in',
    functionsPath,
  )

  // Keep track of the functions that have been set up, so that we do not set up
  // a function for the same file path twice
  const filePathsDone = new Set()

  const pages = await getPages()

  // Create Netlify Function for every page

  const jobs = []

  pages.forEach(({ route, srcRoute }) => {
    const relativePath = getFilePathForRoute(srcRoute || route, 'js')
    const filePath = slash(join('pages', relativePath))
    if (filePathsDone.has(filePath)) {
      return
    }
    filePathsDone.add(filePath)
    jobs.push({ type: 'function', filePath, functionsPath })
  })
  return jobs
}

module.exports = setup
