const { join } = require('path')
const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const pages = require('./pages')

const redirects = []

pages.forEach(({ route, dataRoute }) => {
  const relativePath = getFilePathForRoute(route, 'js')
  const filePath = join('pages', relativePath)
  const functionName = getNetlifyFunctionName(filePath)
  const target = `/.netlify/functions/${functionName}`

  addLocaleRedirects(redirects)(route, target)

  // Add one redirect for the page
  redirects.push({
    route,
    target,
  })

  // Add one redirect for the data route
  redirects.push({
    route: dataRoute,
    target,
  })
})

module.exports = redirects
